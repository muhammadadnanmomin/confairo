/**
 * Confairo — Phase 2A: Verification Check Service
 *
 * Server-side utility for determining whether a user has a
 * currently valid organizer verification.
 *
 * Recognizes:
 *   - institutional_email + verified
 *   - manual_affiliation + verified
 *
 * Also checks expiration (expires_at) if set.
 *
 * MUST be called server-side only (uses service-role client).
 */

import { supabaseAdmin } from "@/lib/supabase/admin";

/* =========================
   Return type
========================= */
export interface VerificationResult {
  isVerified: boolean;
  verificationType:
    | "institutional_email"
    | "manual_affiliation"
    | null;
  institutionName: string | null;
  expiresAt: string | null;
}

/* =========================
   NOT VERIFIED constant
========================= */
const NOT_VERIFIED: VerificationResult = {
  isVerified: false,
  verificationType: null,
  institutionName: null,
  expiresAt: null,
};

/* =========================
   Main check function
========================= */

/**
 * Check whether the given user has a valid, non-expired
 * organizer verification.
 *
 * Uses the service-role client to bypass RLS — this function
 * MUST only be called from server-side code (API routes,
 * server actions, server components).
 *
 * @param userId - The user's UUID (from auth or profiles)
 * @returns VerificationResult
 */
export async function checkVerification(
  userId: string
): Promise<VerificationResult> {
  if (!userId) {
    return NOT_VERIFIED;
  }

  // Query for the most recently verified record that is
  // either institutional_email or manual_affiliation.
  // We fetch both types and pick the first valid one.
  const { data, error } = await supabaseAdmin
    .from("user_verifications")
    .select(
      "verification_type, institution_name, affiliation_org, expires_at, verified_at"
    )
    .eq("user_id", userId)
    .eq("status", "verified")
    .in("verification_type", [
      "institutional_email",
      "manual_affiliation",
    ])
    .order("verified_at", { ascending: false });

  // SECURITY: Database errors must NOT be silently treated as
  // "not verified". A database outage or service failure is
  // fundamentally different from "user has no verification".
  // Callers (server actions, API routes) should catch this and
  // return an appropriate 500-level error to the client.
  if (error) {
    throw new Error(
      `Verification check failed: ${error.message}`
    );
  }

  // No verification records — genuinely not verified
  if (!data || data.length === 0) {
    return NOT_VERIFIED;
  }

  const now = new Date();

  // Find the first non-expired verification
  for (const record of data) {
    // If expires_at is set and in the past, skip
    if (record.expires_at) {
      const expiryDate = new Date(record.expires_at);
      if (expiryDate <= now) {
        continue;
      }
    }

    // Valid verification found
    const verificationType = record.verification_type as
      | "institutional_email"
      | "manual_affiliation";

    // Institution name comes from different fields depending on type
    const institutionName =
      verificationType === "institutional_email"
        ? record.institution_name
        : record.affiliation_org;

    return {
      isVerified: true,
      verificationType,
      institutionName: institutionName ?? null,
      expiresAt: record.expires_at ?? null,
    };
  }

  // All verifications are expired
  return NOT_VERIFIED;
}

/* =========================
   Convenience: require verified organizer
========================= */

/**
 * Server-side guard that throws if the user is not a verified
 * organizer. Intended for use in API routes and server actions
 * that gate conference publishing.
 *
 * @param userId - The user's UUID
 * @returns VerificationResult (only if verified)
 * @throws Error if not verified
 */
export async function requireVerifiedOrganizer(
  userId: string
): Promise<VerificationResult> {
  const result = await checkVerification(userId);

  if (!result.isVerified) {
    throw new Error(
      "Organizer verification required. Please verify your institutional affiliation before publishing."
    );
  }

  return result;
}
