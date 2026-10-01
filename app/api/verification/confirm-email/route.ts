/**
 * Confairo — Phase 2C: Confirm Institutional Email Verification
 *
 * POST /api/verification/confirm-email
 *
 * Called by the verification page when a user clicks the email link.
 * Delegates all token validation to the existing PostgreSQL function
 * confirm_email_verification(p_raw_token) which handles:
 *   - SHA-256 hashing
 *   - pending status matching
 *   - expiration checking
 *   - row locking (FOR UPDATE)
 *   - verified transition
 *   - single-use token invalidation
 *   - replay prevention
 *
 * Security:
 *   - Does NOT require an authenticated session (the email link token
 *     is the bearer credential; users may open the link in a browser
 *     without an active Confairo session)
 *   - Raw token is accepted in the request body, passed to the RPC,
 *     and never logged or stored
 *   - Minimal error information returned to prevent token probing
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  /* ---- 1. Parse body ---- */
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const rawToken = body.token;
  if (!rawToken || typeof rawToken !== "string" || rawToken.length === 0) {
    return NextResponse.json(
      { success: false, message: "Verification link is invalid." },
      { status: 400 }
    );
  }

  /* ---- 2. Invoke the existing SECURITY DEFINER RPC ---- */
  // confirm_email_verification(p_raw_token TEXT) → BOOLEAN
  // Runs as postgres (SECURITY DEFINER), restricted from anon/authenticated.
  // Only callable via service-role client.
  const { data: confirmed, error: rpcError } = await supabaseAdmin.rpc(
    "confirm_email_verification",
    { p_raw_token: rawToken }
  );

  if (rpcError) {
    console.error("[Verification Confirm] RPC error:", rpcError.message);
    return NextResponse.json(
      {
        success: false,
        message: "Unable to process verification. Please try again later.",
      },
      { status: 500 }
    );
  }

  /* ---- 3. Return result ---- */
  if (confirmed === true) {
    return NextResponse.json({
      success: true,
      message: "Institutional email verified successfully.",
    });
  }

  // FALSE: token invalid, expired, already used, or no matching record.
  // Do not reveal which specific reason to prevent probing.
  return NextResponse.json(
    {
      success: false,
      message:
        "This verification link is invalid, has expired, or has already been used.",
    },
    { status: 400 }
  );
}
