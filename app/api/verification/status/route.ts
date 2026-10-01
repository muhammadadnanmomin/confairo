/**
 * Confairo — Phase 3A: Verification Status API
 *
 * GET /api/verification/status
 *
 * Authenticated endpoint that returns the current user's verification status
 * and pending request state for UI consumption.
 *
 * Security:
 *   - Only authenticated users can access (Bearer token or cookie session)
 *   - User ID is derived SOLELY from the authenticated session
 *   - Uses checkVerification(userId) as the authoritative verification check
 *   - NEVER returns raw verification tokens, token hashes, review notes,
 *     internal reviewer IDs, or database secrets
 *   - Database errors return HTTP 500 (never silently treated as unverified)
 *   - Browser roles (anon/authenticated) never query user_verifications directly
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { checkVerification } from "@/lib/verification/checkVerification";

/* ------------------------------------------------------------------ */
/*  Authentication helper                                              */
/* ------------------------------------------------------------------ */

async function authenticateUser(req: NextRequest) {
  // 1. Check Bearer token (matches existing publish / request-email routes)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "").trim();
    if (token) {
      const {
        data: { user },
        error,
      } = await supabaseAdmin.auth.getUser(token);
      if (!error && user) {
        return user;
      }
    }
  }

  // 2. Cookie session fallback
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (!error && user) {
      return user;
    }
  } catch {
    // Ignore cookie resolution failures
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  GET /api/verification/status                                       */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  /* ---- 1. Authenticate user ---- */
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  /* ---- 2. Authoritative verification check ---- */
  let verification;
  try {
    verification = await checkVerification(user.id);
  } catch (err: unknown) {
    console.error("[Verification Status] Error calling checkVerification:", err);
    return NextResponse.json(
      { error: "Unable to check verification status. Please try again later." },
      { status: 500 }
    );
  }

  /* ---- 3. If verified, return safe verified status ---- */
  if (verification.isVerified) {
    let institutionalEmail: string | null = null;

    if (verification.verificationType === "institutional_email") {
      const { data: verifiedRecords, error: verifiedError } = await supabaseAdmin
        .from("user_verifications")
        .select("institutional_email")
        .eq("user_id", user.id)
        .eq("verification_type", "institutional_email")
        .eq("status", "verified")
        .order("verified_at", { ascending: false })
        .limit(1);

      if (verifiedError) {
        console.error(
          "[Verification Status] Error fetching verified email details:",
          verifiedError.message
        );
        return NextResponse.json(
          { error: "Unable to check verification status. Please try again later." },
          { status: 500 }
        );
      }

      if (verifiedRecords && verifiedRecords.length > 0) {
        institutionalEmail = verifiedRecords[0].institutional_email ?? null;
      }
    }

    return NextResponse.json({
      isVerified: true,
      verificationType: verification.verificationType,
      institutionName: verification.institutionName,
      institutionalEmail,
      hasPendingRequest: false,
      pendingEmail: null,
      expiresAt: verification.expiresAt,
    });
  }

  /* ---- 4. If not verified, check for active pending request ---- */
  const { data: pendingRecords, error: pendingError } = await supabaseAdmin
    .from("user_verifications")
    .select("institutional_email, token_expires_at")
    .eq("user_id", user.id)
    .eq("verification_type", "institutional_email")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1);

  if (pendingError) {
    console.error(
      "[Verification Status] Error checking pending verification:",
      pendingError.message
    );
    return NextResponse.json(
      { error: "Unable to check verification status. Please try again later." },
      { status: 500 }
    );
  }

  let hasPendingRequest = false;
  let pendingEmail: string | null = null;

  if (pendingRecords && pendingRecords.length > 0) {
    const record = pendingRecords[0];
    const isExpired =
      record.token_expires_at &&
      new Date(record.token_expires_at) <= new Date();

    if (!isExpired) {
      hasPendingRequest = true;
      pendingEmail = record.institutional_email ?? null;
    }
  }

  return NextResponse.json({
    isVerified: false,
    verificationType: null,
    institutionName: null,
    institutionalEmail: null,
    hasPendingRequest,
    pendingEmail,
    expiresAt: null,
  });
}
