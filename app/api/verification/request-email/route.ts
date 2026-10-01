/**
 * Confairo — Phase 2C: Request Institutional Email Verification
 *
 * POST /api/verification/request-email
 *
 * Authenticated organizer submits their institutional email.
 * Server generates a secure token, stores the SHA-256 hash,
 * and sends a verification email via existing Resend helper.
 *
 * Security:
 *   - Authentication required (Bearer token → supabaseAdmin.auth.getUser)
 *   - User ID derived from session, never from client body
 *   - Raw token never stored, never logged
 *   - Verification URL never logged
 *   - Existing user_verifications table reused (Phase 2A)
 *   - If email delivery fails, pending record is cleaned up
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";
import { sendEmail } from "@/lib/email/send";
import { institutionalVerificationEmail } from "@/lib/email/templates";

/* ------------------------------------------------------------------ */
/*  Service-role client (same pattern as publish route)                 */
/* ------------------------------------------------------------------ */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const TOKEN_EXPIRY_HOURS = 24;
const MAX_INSTITUTION_NAME_LENGTH = 200;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

async function authenticateUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);
  return user;
}

/**
 * Basic email syntax check. Does NOT validate deliverability.
 * Rejects obviously malformed addresses.
 */
function isValidEmail(email: string): boolean {
  // RFC 5322 simplified: local@domain with at least one dot in domain
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email) && email.length <= 320;
}

/**
 * Extract domain from email address.
 */
function extractDomain(email: string): string {
  return email.split("@")[1].toLowerCase();
}

/**
 * SHA-256 hash of raw token, returned as lowercase hex string.
 * Must match the hashing used by confirm_email_verification():
 *   encode(digest(p_raw_token, 'sha256'), 'hex')
 */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                        */
/* ------------------------------------------------------------------ */
export async function POST(req: NextRequest) {
  /* ---- 1. Authenticate ---- */
  const user = await authenticateUser(req);
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  /* ---- 2. Parse and validate body ---- */
  let body: { institutionalEmail?: string; institutionName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const rawEmail = body.institutionalEmail;
  if (!rawEmail || typeof rawEmail !== "string") {
    return NextResponse.json(
      { error: "institutionalEmail is required" },
      { status: 400 }
    );
  }

  const institutionalEmail = rawEmail.trim().toLowerCase();
  if (!isValidEmail(institutionalEmail)) {
    return NextResponse.json(
      { error: "Invalid email address format" },
      { status: 400 }
    );
  }

  const institutionName =
    typeof body.institutionName === "string"
      ? body.institutionName.trim().slice(0, MAX_INSTITUTION_NAME_LENGTH) || null
      : null;

  const institutionDomain = extractDomain(institutionalEmail);

  /* ---- 3. Check for existing active verification ---- */
  const { data: existingVerified, error: verifiedCheckError } =
    await supabaseAdmin
      .from("user_verifications")
      .select("id, institutional_email, expires_at")
      .eq("user_id", user.id)
      .eq("verification_type", "institutional_email")
      .eq("status", "verified")
      .order("verified_at", { ascending: false })
      .limit(1);

  if (verifiedCheckError) {
    console.error("[Verification Request] DB error checking verified status:", verifiedCheckError.message);
    return NextResponse.json(
      { error: "Unable to process verification request. Please try again later." },
      { status: 500 }
    );
  }

  // Check if any returned verification is still valid (not expired)
  if (existingVerified && existingVerified.length > 0) {
    const record = existingVerified[0];
    const isExpired =
      record.expires_at && new Date(record.expires_at) <= new Date();

    if (!isExpired) {
      return NextResponse.json(
        {
          success: false,
          message: "Your institutional email is already verified.",
        },
        { status: 400 }
      );
    }
  }

  /* ---- 4. Cross-user conflict check ---- */
  // Prevent verifying an institutional email that is already actively
  // verified by a different user. This is a server-side check;
  // a partial unique index can harden this later.
  const { data: conflictRecords, error: conflictError } = await supabaseAdmin
    .from("user_verifications")
    .select("id, user_id, expires_at")
    .eq("institutional_email", institutionalEmail)
    .eq("verification_type", "institutional_email")
    .eq("status", "verified")
    .neq("user_id", user.id)
    .limit(1);

  if (conflictError) {
    console.error("[Verification Request] DB error checking cross-user conflict:", conflictError.message);
    return NextResponse.json(
      { error: "Unable to process verification request. Please try again later." },
      { status: 500 }
    );
  }

  if (conflictRecords && conflictRecords.length > 0) {
    const conflict = conflictRecords[0];
    const isExpired =
      conflict.expires_at && new Date(conflict.expires_at) <= new Date();

    if (!isExpired) {
      return NextResponse.json(
        {
          success: false,
          message:
            "This institutional email is already verified by another account.",
        },
        { status: 409 }
      );
    }
  }

  /* ---- 5. Generate token ---- */
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const tokenExpiresAt = new Date(
    Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000
  ).toISOString();

  /* ---- 6. Upsert pending verification record ---- */
  // Check if an existing pending record exists for this user+type
  const { data: existingPending, error: pendingCheckError } =
    await supabaseAdmin
      .from("user_verifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("verification_type", "institutional_email")
      .eq("status", "pending")
      .limit(1);

  if (pendingCheckError) {
    console.error("[Verification Request] DB error checking pending:", pendingCheckError.message);
    return NextResponse.json(
      { error: "Unable to process verification request. Please try again later." },
      { status: 500 }
    );
  }

  let recordId: string;

  if (existingPending && existingPending.length > 0) {
    // Update existing pending record with new token and details
    const { error: updateError } = await supabaseAdmin
      .from("user_verifications")
      .update({
        institutional_email: institutionalEmail,
        institution_name: institutionName,
        institution_domain: institutionDomain,
        verification_token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
      })
      .eq("id", existingPending[0].id);

    if (updateError) {
      console.error("[Verification Request] DB error updating pending record:", updateError.message);
      return NextResponse.json(
        { error: "Unable to process verification request. Please try again later." },
        { status: 500 }
      );
    }
    recordId = existingPending[0].id;
  } else {
    // Insert new pending record
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("user_verifications")
      .insert({
        user_id: user.id,
        verification_type: "institutional_email",
        status: "pending",
        institutional_email: institutionalEmail,
        institution_name: institutionName,
        institution_domain: institutionDomain,
        verification_token_hash: tokenHash,
        token_expires_at: tokenExpiresAt,
      })
      .select("id")
      .single();

    if (insertError || !inserted) {
      console.error("[Verification Request] DB error inserting record:", insertError?.message);
      return NextResponse.json(
        { error: "Unable to process verification request. Please try again later." },
        { status: 500 }
      );
    }
    recordId = inserted.id;
  }

  /* ---- 7. Build verification link ---- */
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : "https://confairo.com");

  const verificationLink = `${appUrl}/verify/institutional-email?token=${rawToken}`;

  /* ---- 8. Send verification email ---- */
  const emailHtml = institutionalVerificationEmail(
    institutionalEmail,
    institutionName,
    verificationLink,
    TOKEN_EXPIRY_HOURS
  );

  try {
    await sendEmail(
      institutionalEmail,
      "Verify your institutional email — Confairo",
      emailHtml
    );
  } catch (emailError) {
    // Email delivery failed — clean up the pending record so the user
    // is not left with an unreceivable pending verification.
    console.error("[Verification Request] Email delivery failed");

    try {
      if (existingPending && existingPending.length > 0) {
        // Revert: clear the token hash so the stale pending record
        // cannot be accidentally confirmed. Keep the row so the user
        // can retry without orphan accumulation.
        await supabaseAdmin
          .from("user_verifications")
          .update({
            verification_token_hash: null,
            token_expires_at: null,
          })
          .eq("id", recordId);
      } else {
        // Delete the newly created pending record entirely
        await supabaseAdmin
          .from("user_verifications")
          .delete()
          .eq("id", recordId);
      }
    } catch (cleanupError) {
      console.error("[Verification Request] Cleanup after email failure also failed");
    }

    return NextResponse.json(
      {
        error:
          "Unable to send verification email. Please check the email address and try again.",
      },
      { status: 500 }
    );
  }

  /* ---- 9. Success ---- */
  // Note: rawToken is NOT included in the response and goes out of scope here.
  return NextResponse.json({
    success: true,
    message:
      "Verification email sent. Please check your institutional inbox.",
    expiresAt: tokenExpiresAt,
  });
}
