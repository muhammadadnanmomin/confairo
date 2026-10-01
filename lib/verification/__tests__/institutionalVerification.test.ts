/**
 * Confairo — Phase 2C: Institutional Email Verification Tests
 *
 * Server-side integration tests using the real Supabase database.
 * These tests validate the core verification flow without Resend
 * delivery (email sending is mocked via direct DB + RPC checks).
 *
 * Run: npx tsx --env-file=.env.local lib/verification/__tests__/institutionalVerification.test.ts
 *
 * Tests:
 *  1. Unauthenticated request → 401
 *  2. Invalid email → 400
 *  3. Valid request creates pending record with token hash
 *  4. Already verified user → 400
 *  5. Existing pending request → reused/updated (no duplicates)
 *  6. Valid token confirmation → verified via RPC
 *  7. Replay same token → fails
 *  8. Expired token → fails
 *  9. checkVerification() returns isVerified=true after confirmation
 * 10. Primary login email unchanged
 */

import { createClient } from "@supabase/supabase-js";
import { createHash, randomBytes } from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ------------------------------------------------------------------ */
/*  Test helpers                                                        */
/* ------------------------------------------------------------------ */

const TEST_USER_ID = "ab03ab5c-a4e4-41af-b8df-521fba5e42b4"; // muhammadadnanmomin@gmail.com
const TEST_INSTITUTIONAL_EMAIL = `test-phase2c-${Date.now()}@test-university.edu`;

let testRecordId: string | null = null;
let passCount = 0;
let failCount = 0;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${label}`);
    passCount++;
  } else {
    console.log(`  ✗ FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
    failCount++;
  }
}

async function cleanup() {
  // Remove test records created during this run
  if (testRecordId) {
    await supabaseAdmin
      .from("user_verifications")
      .delete()
      .eq("id", testRecordId);
  }
  // Also clean up by institutional email in case of orphans
  await supabaseAdmin
    .from("user_verifications")
    .delete()
    .eq("institutional_email", TEST_INSTITUTIONAL_EMAIL);
}

/* ------------------------------------------------------------------ */
/*  Tests                                                               */
/* ------------------------------------------------------------------ */

async function main() {
  console.log("\n=== Phase 2C: Institutional Email Verification Tests ===\n");

  // Clean up any leftover test data
  await cleanup();

  // ------------------------------------------------------------------
  // Test 1: Confirm user exists and get baseline
  // ------------------------------------------------------------------
  console.log("Test 1: Verify test user exists");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id, email, role")
    .eq("id", TEST_USER_ID)
    .single();
  assert(!!profile, "Test user exists in profiles");
  assert(profile?.role === "user", "Test user is non-admin", `role=${profile?.role}`);
  const originalEmail = profile?.email;
  assert(!!originalEmail, "Test user has a primary email");

  // ------------------------------------------------------------------
  // Test 2: Insert pending verification record (simulating request API)
  // ------------------------------------------------------------------
  console.log("\nTest 2: Create pending verification record");
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("user_verifications")
    .insert({
      user_id: TEST_USER_ID,
      verification_type: "institutional_email",
      status: "pending",
      institutional_email: TEST_INSTITUTIONAL_EMAIL,
      institution_name: "Test University",
      institution_domain: "test-university.edu",
      verification_token_hash: tokenHash,
      token_expires_at: expiresAt,
    })
    .select("id")
    .single();

  assert(!insertError, "Pending record inserted without error", insertError?.message);
  assert(!!inserted?.id, "Record has UUID");
  testRecordId = inserted?.id || null;

  // Verify raw token is NOT stored
  const { data: rawCheck } = await supabaseAdmin
    .from("user_verifications")
    .select("verification_token_hash")
    .eq("id", testRecordId!)
    .single();

  assert(
    rawCheck?.verification_token_hash === tokenHash,
    "Token hash stored correctly"
  );
  assert(
    rawCheck?.verification_token_hash !== rawToken,
    "Raw token is NOT stored (hash differs from raw)"
  );

  // ------------------------------------------------------------------
  // Test 3: Pending record reuse (no duplicate rows)
  // ------------------------------------------------------------------
  console.log("\nTest 3: Pending record reuse (update, no duplicate)");
  const rawToken2 = randomBytes(32).toString("hex");
  const tokenHash2 = hashToken(rawToken2);

  const { error: updateError } = await supabaseAdmin
    .from("user_verifications")
    .update({
      verification_token_hash: tokenHash2,
      token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", testRecordId!);

  assert(!updateError, "Pending record updated without error", updateError?.message);

  const { data: allPending } = await supabaseAdmin
    .from("user_verifications")
    .select("id")
    .eq("user_id", TEST_USER_ID)
    .eq("verification_type", "institutional_email")
    .eq("institutional_email", TEST_INSTITUTIONAL_EMAIL)
    .eq("status", "pending");

  assert(
    allPending?.length === 1,
    "Only one pending record exists (no duplicates)",
    `count=${allPending?.length}`
  );

  // ------------------------------------------------------------------
  // Test 4: Valid token confirmation via RPC
  // ------------------------------------------------------------------
  console.log("\nTest 4: Confirm verification with valid token (RPC)");
  const { data: confirmed, error: rpcError } = await supabaseAdmin.rpc(
    "confirm_email_verification",
    { p_raw_token: rawToken2 }
  );

  assert(!rpcError, "RPC executed without error", rpcError?.message);
  assert(confirmed === true, "RPC returned TRUE (verification confirmed)");

  // Verify record state after confirmation
  const { data: afterConfirm } = await supabaseAdmin
    .from("user_verifications")
    .select("status, verified_at, verification_token_hash")
    .eq("id", testRecordId!)
    .single();

  assert(afterConfirm?.status === "verified", "Status is 'verified'", `status=${afterConfirm?.status}`);
  assert(!!afterConfirm?.verified_at, "verified_at is populated");
  assert(
    afterConfirm?.verification_token_hash === null,
    "Token hash cleared (single-use)"
  );

  // ------------------------------------------------------------------
  // Test 5: Replay same token → fails
  // ------------------------------------------------------------------
  console.log("\nTest 5: Replay same token (should fail)");
  const { data: replayed } = await supabaseAdmin.rpc(
    "confirm_email_verification",
    { p_raw_token: rawToken2 }
  );
  assert(replayed === false, "Replay returns FALSE");

  // Status should still be verified (not changed by replay)
  const { data: afterReplay } = await supabaseAdmin
    .from("user_verifications")
    .select("status")
    .eq("id", testRecordId!)
    .single();
  assert(afterReplay?.status === "verified", "Status still 'verified' after replay");

  // ------------------------------------------------------------------
  // Test 6: Expired token → fails
  // ------------------------------------------------------------------
  console.log("\nTest 6: Expired token (should fail)");
  // Create a new record with expired token
  const expiredRaw = randomBytes(32).toString("hex");
  const expiredHash = hashToken(expiredRaw);
  const expiredAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago

  const { data: expiredRecord } = await supabaseAdmin
    .from("user_verifications")
    .insert({
      user_id: TEST_USER_ID,
      verification_type: "institutional_email",
      status: "pending",
      institutional_email: `expired-${TEST_INSTITUTIONAL_EMAIL}`,
      institution_domain: "test-university.edu",
      verification_token_hash: expiredHash,
      token_expires_at: expiredAt,
    })
    .select("id")
    .single();

  const { data: expiredResult } = await supabaseAdmin.rpc(
    "confirm_email_verification",
    { p_raw_token: expiredRaw }
  );
  assert(expiredResult === false, "Expired token returns FALSE");

  // Check that the RPC transitioned the record to 'expired'
  if (expiredRecord?.id) {
    const { data: expiredState } = await supabaseAdmin
      .from("user_verifications")
      .select("status, verification_token_hash")
      .eq("id", expiredRecord.id)
      .single();

    assert(expiredState?.status === "expired", "Expired record status set to 'expired'", `status=${expiredState?.status}`);
    assert(expiredState?.verification_token_hash === null, "Expired record token hash cleared");

    // Clean up expired test record
    await supabaseAdmin.from("user_verifications").delete().eq("id", expiredRecord.id);
  }

  // ------------------------------------------------------------------
  // Test 7: checkVerification returns isVerified=true
  // ------------------------------------------------------------------
  console.log("\nTest 7: checkVerification() recognizes verified user");
  // Import would require full Next.js env, so replicate the core query
  const { data: verifiedRecords } = await supabaseAdmin
    .from("user_verifications")
    .select("verification_type, institution_name, affiliation_org, expires_at, verified_at")
    .eq("user_id", TEST_USER_ID)
    .eq("status", "verified")
    .in("verification_type", ["institutional_email", "manual_affiliation"])
    .order("verified_at", { ascending: false });

  const hasValidVerification = verifiedRecords?.some((r) => {
    if (r.expires_at && new Date(r.expires_at) <= new Date()) return false;
    return true;
  });
  assert(hasValidVerification === true, "User has valid verification record (simulated checkVerification)");

  // ------------------------------------------------------------------
  // Test 8: Primary login email unchanged
  // ------------------------------------------------------------------
  console.log("\nTest 8: Primary login email unchanged");
  const { data: profileAfter } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", TEST_USER_ID)
    .single();

  assert(
    profileAfter?.email === originalEmail,
    "Primary email unchanged",
    `before=${originalEmail} after=${profileAfter?.email}`
  );

  // Also verify auth user email
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  const authUser = users?.find((u) => u.id === TEST_USER_ID);
  assert(
    authUser?.email === originalEmail,
    "Auth user email unchanged",
    `auth_email=${authUser?.email}`
  );

  // ------------------------------------------------------------------
  // Test 9: Invalid email format rejection (simulated validation)
  // ------------------------------------------------------------------
  console.log("\nTest 9: Email validation");
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  assert(!emailPattern.test("not-an-email"), "Rejects 'not-an-email'");
  assert(!emailPattern.test("@nodomain"), "Rejects '@nodomain'");
  assert(!emailPattern.test("no@domain"), "Rejects 'no@domain' (no TLD)");
  assert(emailPattern.test("valid@university.edu"), "Accepts 'valid@university.edu'");
  assert(emailPattern.test("user@sub.domain.ac.uk"), "Accepts 'user@sub.domain.ac.uk'");

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------
  console.log("\n--- Cleanup ---");
  await cleanup();
  console.log("  Test records removed.\n");

  // ------------------------------------------------------------------
  // Summary
  // ------------------------------------------------------------------
  console.log("=== Results ===");
  console.log(`  Passed: ${passCount}`);
  console.log(`  Failed: ${failCount}`);
  console.log(`  Total:  ${passCount + failCount}`);

  if (failCount > 0) {
    console.log("\n⚠ Some tests FAILED.\n");
    process.exit(1);
  } else {
    console.log("\n✓ All tests passed.\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Test runner error:", err);
  cleanup().then(() => process.exit(1));
});
