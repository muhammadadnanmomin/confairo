import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// Service role client for secure server-side mutations after auth verification
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ------------------------------------------------------------------ */
/*  Validation & Slug Helpers                                          */
/* ------------------------------------------------------------------ */

function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const RESERVED_SLUGS = new Set([
  "login",
  "signup",
  "dashboard",
  "admin",
  "api",
  "org",
  "conferences",
  "blog",
  "settings",
  "new",
  "edit",
  "status",
  "terms",
  "privacy",
  "verify",
  "about",
  "contact",
  "faq",
  "user-guide",
  "reviewer",
  "participant",
  "organizer",
  "help",
]);

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function getStoragePathFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/organization-logos\/(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Authentication Helper                                              */
/* ------------------------------------------------------------------ */

async function getAuthenticatedUser(req: NextRequest) {
  // 1. Check Bearer token (API / test calls)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token) {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) return user;
    }
  }

  // 2. Check Cookie session (browser calls)
  try {
    const supabaseCookie = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabaseCookie.auth.getUser();
    if (!error && user) return user;
  } catch {
    // Cookie store may not be available outside SSR context
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Authorization & Organization Resolution Helper                     */
/* ------------------------------------------------------------------ */

interface AuthOrgResult {
  organization: any;
  role: "owner" | "admin" | "staff";
  isPlatformAdmin: boolean;
}

async function resolveOrganizationAndRole(
  userId: string,
  targetOrgId?: string | null
): Promise<{ result?: AuthOrgResult; errorStatus?: number; errorMessage?: string }> {
  // Check if platform admin
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const isPlatformAdmin = profile?.role === "admin";

  // If a specific organization ID was requested
  if (targetOrgId) {
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", targetOrgId)
      .maybeSingle();

    if (orgError || !org) {
      return { errorStatus: 404, errorMessage: "Organization not found" };
    }

    // Check user membership for that exact org
    const { data: member } = await supabaseAdmin
      .from("organization_members")
      .select("role")
      .eq("organization_id", targetOrgId)
      .eq("user_id", userId)
      .maybeSingle();

    if (member) {
      return {
        result: {
          organization: org,
          role: member.role as "owner" | "admin" | "staff",
          isPlatformAdmin,
        },
      };
    }

    // Platform admin bypass if not a direct member
    if (isPlatformAdmin) {
      return {
        result: {
          organization: org,
          role: "owner", // treat platform admin as owner
          isPlatformAdmin: true,
        },
      };
    }

    return {
      errorStatus: 403,
      errorMessage: "You do not have permission to access this organization",
    };
  }

  // No specific ID supplied: find the user's primary organization membership
  const { data: member } = await supabaseAdmin
    .from("organization_members")
    .select("role, organization_id, organizations(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (member?.organizations) {
    return {
      result: {
        organization: member.organizations,
        role: member.role as "owner" | "admin" | "staff",
        isPlatformAdmin,
      },
    };
  }

  // Fallback for platform admin without membership
  if (isPlatformAdmin) {
    const { data: firstOrg } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstOrg) {
      return {
        result: {
          organization: firstOrg,
          role: "owner",
          isPlatformAdmin: true,
        },
      };
    }
  }

  return { errorStatus: 404, errorMessage: "No organization found for this user" };
}

/* ------------------------------------------------------------------ */
/*  GET /api/organizer/organization                                    */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetOrgId = searchParams.get("organizationId");

    const { result, errorStatus, errorMessage } =
      await resolveOrganizationAndRole(user.id, targetOrgId);

    if (errorStatus || !result) {
      return NextResponse.json(
        { error: errorMessage || "Forbidden" },
        { status: errorStatus || 403 }
      );
    }

    return NextResponse.json({
      organization: result.organization,
      role: result.role,
      isOwner: result.role === "owner" || result.isPlatformAdmin,
    });
  } catch (err: unknown) {
    console.error("GET organization error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/* ------------------------------------------------------------------ */
/*  PATCH /api/organizer/organization                                   */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON payload" },
        { status: 400 }
      );
    }

    const targetOrgId = body.organizationId || body.id;

    const { result, errorStatus, errorMessage } =
      await resolveOrganizationAndRole(user.id, targetOrgId);

    if (errorStatus || !result) {
      return NextResponse.json(
        { error: errorMessage || "Forbidden" },
        { status: errorStatus || 403 }
      );
    }

    // STRICT OWNER CHECK: Only organization owners (or verified platform admins) can edit
    if (result.role !== "owner" && !result.isPlatformAdmin) {
      return NextResponse.json(
        { error: "Only organization owners can modify organization details" },
        { status: 403 }
      );
    }

    const orgId = result.organization.id;

    /* ── 1. Validation & Input Sanitization ── */
    const updatePayload: Record<string, any> = {};

    // Name (Required, 2–100 characters)
    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return NextResponse.json(
          { error: "Organization name must be a string" },
          { status: 400 }
        );
      }
      const trimmedName = body.name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return NextResponse.json(
          { error: "Organization name must be between 2 and 100 characters" },
          { status: 400 }
        );
      }
      updatePayload.name = trimmedName;
    }

    // Description (Optional, max 1000 characters)
    if (body.description !== undefined) {
      if (body.description === null || body.description === "") {
        updatePayload.description = null;
      } else if (typeof body.description === "string") {
        const trimmedDesc = body.description.trim();
        if (trimmedDesc.length > 1000) {
          return NextResponse.json(
            { error: "Description must not exceed 1000 characters" },
            { status: 400 }
          );
        }
        updatePayload.description = trimmedDesc || null;
      } else {
        return NextResponse.json(
          { error: "Invalid description format" },
          { status: 400 }
        );
      }
    }

    // Country (Optional string)
    if (body.country !== undefined) {
      if (body.country === null || body.country === "") {
        updatePayload.country = null;
      } else if (typeof body.country === "string") {
        const trimmedCountry = body.country.trim();
        updatePayload.country = trimmedCountry || null;
      } else {
        return NextResponse.json(
          { error: "Invalid country format" },
          { status: 400 }
        );
      }
    }

    // Website (Optional, valid HTTP/HTTPS URL)
    if (body.website !== undefined) {
      if (body.website === null || body.website === "") {
        updatePayload.website = null;
      } else if (typeof body.website === "string") {
        const trimmedWebsite = body.website.trim();
        if (trimmedWebsite && !isValidUrl(trimmedWebsite)) {
          return NextResponse.json(
            { error: "Invalid website URL format" },
            { status: 400 }
          );
        }
        updatePayload.website = trimmedWebsite || null;
      } else {
        return NextResponse.json(
          { error: "Invalid website format" },
          { status: 400 }
        );
      }
    }

    // LinkedIn URL (Optional, valid HTTP/HTTPS URL)
    if (body.linkedin_url !== undefined) {
      if (body.linkedin_url === null || body.linkedin_url === "") {
        updatePayload.linkedin_url = null;
      } else if (typeof body.linkedin_url === "string") {
        const trimmedLinkedin = body.linkedin_url.trim();
        if (trimmedLinkedin && !isValidUrl(trimmedLinkedin)) {
          return NextResponse.json(
            { error: "Invalid LinkedIn URL format" },
            { status: 400 }
          );
        }
        updatePayload.linkedin_url = trimmedLinkedin || null;
      } else {
        return NextResponse.json(
          { error: "Invalid LinkedIn URL format" },
          { status: 400 }
        );
      }
    }

    // Logo URL (Optional, string or null)
    if (body.logo_url !== undefined) {
      if (body.logo_url === null || body.logo_url === "") {
        updatePayload.logo_url = null;
      } else if (typeof body.logo_url === "string") {
        const trimmedLogo = body.logo_url.trim();
        if (trimmedLogo && !isValidUrl(trimmedLogo)) {
          return NextResponse.json(
            { error: "Invalid logo URL format" },
            { status: 400 }
          );
        }
        updatePayload.logo_url = trimmedLogo || null;
      }
    }

    // Slug (Optional, 3–50 chars, lowercase letters, numbers, hyphens)
    let newSlugRequested: string | null = null;
    if (body.slug !== undefined) {
      if (typeof body.slug !== "string") {
        return NextResponse.json(
          { error: "Slug must be a string" },
          { status: 400 }
        );
      }
      const rawSlug = body.slug.trim().toLowerCase();
      const normalizedSlug = rawSlug
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (normalizedSlug.length < 3 || normalizedSlug.length > 50) {
        return NextResponse.json(
          { error: "Public profile URL slug must be between 3 and 50 characters" },
          { status: 400 }
        );
      }

      if (!SLUG_REGEX.test(normalizedSlug)) {
        return NextResponse.json(
          { error: "Slug can only contain lowercase letters, numbers, and hyphens without leading or trailing hyphens" },
          { status: 400 }
        );
      }

      if (RESERVED_SLUGS.has(normalizedSlug)) {
        return NextResponse.json(
          { error: `The URL slug "${normalizedSlug}" is reserved for system routes` },
          { status: 400 }
        );
      }

      if (normalizedSlug !== result.organization.slug) {
        newSlugRequested = normalizedSlug;

        // Check if taken in organizations
        const { data: existingOrg } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("slug", normalizedSlug)
          .neq("id", orgId)
          .maybeSingle();

        if (existingOrg) {
          return NextResponse.json(
            { error: "This URL slug is already taken. Please choose another." },
            { status: 409 }
          );
        }

        // Check if taken in historical slugs
        try {
          const { data: existingHistory } = await supabaseAdmin
            .from("organization_slug_history")
            .select("organization_id")
            .eq("slug", normalizedSlug)
            .neq("organization_id", orgId)
            .maybeSingle();

          if (existingHistory) {
            return NextResponse.json(
              { error: "This URL slug was previously used by another organization. Please choose another." },
              { status: 409 }
            );
          }
        } catch {
          // historical table might not exist yet
        }

        updatePayload.slug = normalizedSlug;
      }
    }

    /* ── 2. Slug Auto-Generation Fallback ── */
    // If the organization currently has NO slug and none was provided, auto-generate one
    if (!result.organization.slug && !updatePayload.slug) {
      const nameForSlug = updatePayload.name || result.organization.name || "org";
      const baseSlug = generateSlug(nameForSlug) || "org";
      let slugCandidate = baseSlug;
      let counter = 1;

      while (true) {
        const { data: existing } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("slug", slugCandidate)
          .neq("id", orgId)
          .maybeSingle();

        if (!existing) break;
        counter++;
        slugCandidate = `${baseSlug}-${counter}`;
      }

      updatePayload.slug = slugCandidate;
    }

    /* ── 3. Clean up superseded or removed logo file ── */
    if (updatePayload.logo_url !== undefined && result.organization.logo_url) {
      const oldPath = getStoragePathFromUrl(result.organization.logo_url);
      const newPath = getStoragePathFromUrl(updatePayload.logo_url);
      if (oldPath && oldPath !== newPath && oldPath.startsWith(`${orgId}/`)) {
        try {
          await supabaseAdmin.storage.from("organization-logos").remove([oldPath]);
        } catch (storageErr) {
          console.warn("Failed to delete superseded logo from storage:", storageErr);
        }
      }
    }

    /* ── 4. Check for Empty Update ── */
    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { organization: result.organization, message: "No changes to update" },
        { status: 200 }
      );
    }

    /* ── 5. Execute Update (Strictly Whitelisted) ── */
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from("organizations")
      .update(updatePayload)
      .eq("id", orgId)
      .select()
      .single();

    if (updateError || !updatedOrg) {
      console.error("DB update error on organization:", updateError);
      return NextResponse.json(
        { error: "Failed to update organization" },
        { status: 500 }
      );
    }

    /* ── 6. Record Historical Slug if changed ── */
    if (newSlugRequested && result.organization.slug && result.organization.slug !== newSlugRequested) {
      try {
        await supabaseAdmin.from("organization_slug_history").upsert(
          {
            organization_id: orgId,
            slug: result.organization.slug,
          },
          { onConflict: "slug" }
        );
      } catch (historyErr) {
        console.warn("Could not record historical slug in organization_slug_history:", historyErr);
      }
    }

    return NextResponse.json({
      organization: updatedOrg,
      message: "Organization updated successfully",
    });
  } catch (err: unknown) {
    console.error("PATCH organization error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
