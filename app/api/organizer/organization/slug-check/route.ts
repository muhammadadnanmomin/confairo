import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, supabaseServer as supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSlug = searchParams.get("slug");
    const organizationId = searchParams.get("organizationId");

    if (!rawSlug) {
      return NextResponse.json({ available: false, reason: "Slug is required" }, { status: 400 });
    }

    const slug = rawSlug.trim().toLowerCase();

    // 1. Length validation (3 - 50 chars)
    if (slug.length < 3) {
      return NextResponse.json(
        { available: false, reason: "Slug must be at least 3 characters long" },
        { status: 200 }
      );
    }
    if (slug.length > 50) {
      return NextResponse.json(
        { available: false, reason: "Slug must be 50 characters or less" },
        { status: 200 }
      );
    }

    // 2. Format validation
    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        {
          available: false,
          reason: "Slug can only contain lowercase letters, numbers, and hyphens without leading or trailing hyphens",
        },
        { status: 200 }
      );
    }

    // 3. Reserved slugs
    if (RESERVED_SLUGS.has(slug)) {
      return NextResponse.json(
        { available: false, reason: "This slug is reserved for system routes" },
        { status: 200 }
      );
    }

    // 4. Check active organizations table
    let query = supabaseAdmin.from("organizations").select("id").eq("slug", slug);
    if (organizationId) {
      query = query.neq("id", organizationId);
    }
    const { data: existingOrg, error: orgError } = await query.maybeSingle();

    if (orgError) {
      console.error("Error checking slug availability in organizations:", orgError);
      return NextResponse.json({ error: "Failed to check availability" }, { status: 500 });
    }

    if (existingOrg) {
      return NextResponse.json(
        { available: false, reason: "This URL slug is already taken by another organization" },
        { status: 200 }
      );
    }

    // 5. Check historical slugs table (if exists)
    try {
      let historyQuery = supabaseAdmin.from("organization_slug_history").select("organization_id").eq("slug", slug);
      if (organizationId) {
        historyQuery = historyQuery.neq("organization_id", organizationId);
      }
      const { data: existingHistory } = await historyQuery.maybeSingle();
      if (existingHistory) {
        return NextResponse.json(
          { available: false, reason: "This URL slug was previously used by another organization" },
          { status: 200 }
        );
      }
    } catch {
      // organization_slug_history table might not exist yet; safe to ignore
    }

    return NextResponse.json({ available: true, slug }, { status: 200 });
  } catch (err: unknown) {
    console.error("GET slug-check error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
