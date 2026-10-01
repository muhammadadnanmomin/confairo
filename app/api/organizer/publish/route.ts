import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  requireVerifiedOrganizer,
} from "@/lib/verification/checkVerification";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function authenticateUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  return user;
}

async function getConference(conferenceId: string) {
  const { data } = await supabaseAdmin
    .from("conferences")
    .select("id, organizer_id, is_published, title")
    .eq("id", conferenceId)
    .single();
  return data;
}

async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

/* ------------------------------------------------------------------ */
/*  POST /api/organizer/publish                                        */
/*                                                                      */
/*  Body: { conferenceId: string, publish: boolean }                    */
/*                                                                      */
/*  PUBLISH (publish=true):                                             */
/*    - User must be authenticated                                      */
/*    - User must be conferences.organizer_id (owner)                   */
/*    - Owner must have valid organizer verification                    */
/*    - Sets is_published = true via service-role client                */
/*                                                                      */
/*  UNPUBLISH (publish=false):                                          */
/*    - User must be authenticated                                      */
/*    - User must be conferences.organizer_id (owner) OR admin          */
/*    - No verification required                                        */
/*    - Sets is_published = false via service-role client                */
/*                                                                      */
/*  ADMIN PUBLISH (publish=true, user is admin):                        */
/*    - Admin can publish any conference without verification            */
/*    - Preserves existing admin capability                              */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  /* ---- 1. Parse body ---- */
  let body: { conferenceId?: string; publish?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { conferenceId, publish } = body;

  if (!conferenceId || typeof publish !== "boolean") {
    return NextResponse.json(
      { error: "conferenceId (string) and publish (boolean) are required" },
      { status: 400 }
    );
  }

  /* ---- 2. Authenticate ---- */
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  /* ---- 3. Load conference ---- */
  const conf = await getConference(conferenceId);
  if (!conf) {
    return NextResponse.json(
      { error: "Conference not found" },
      { status: 404 }
    );
  }

  /* ---- 4. Authorization ---- */
  const userIsOwner = conf.organizer_id === user.id;
  const userIsAdmin = await isAdmin(user.id);

  // Must be owner or admin
  if (!userIsOwner && !userIsAdmin) {
    return NextResponse.json(
      { error: "Only the conference owner can change publication status" },
      { status: 403 }
    );
  }

  /* ---- 5. Verification check (PUBLISH only, non-admin only) ---- */
  if (publish && !userIsAdmin) {
    try {
      await requireVerifiedOrganizer(user.id);
    } catch (err: unknown) {
      // Verification check failed — distinguish between
      // "not verified" and "database error"
      const message =
        err instanceof Error ? err.message : "Verification check failed";

      // If it's a database/service error, return 500
      if (message.startsWith("Verification check failed:")) {
        return NextResponse.json(
          { error: "Unable to verify organizer status. Please try again later." },
          { status: 500 }
        );
      }

      // Not verified
      return NextResponse.json(
        {
          error: "Organizer verification required",
          detail:
            "You must verify your institutional affiliation before publishing a conference.",
        },
        { status: 403 }
      );
    }
  }

  /* ---- 6. Already in desired state — no-op success ---- */
  if (conf.is_published === publish) {
    return NextResponse.json({
      success: true,
      conferenceId: conf.id,
      isPublished: conf.is_published,
      message: publish
        ? "Conference is already published"
        : "Conference is already unpublished",
    });
  }

  /* ---- 7. Update via service-role ---- */
  const { error: updateError } = await supabaseAdmin
    .from("conferences")
    .update({ is_published: publish })
    .eq("id", conferenceId);

  if (updateError) {
    console.error("Publish update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update conference publication status" },
      { status: 500 }
    );
  }

  /* ---- 8. Success ---- */
  return NextResponse.json({
    success: true,
    conferenceId: conf.id,
    isPublished: publish,
    message: publish
      ? "Conference published successfully"
      : "Conference unpublished successfully",
  });
}
