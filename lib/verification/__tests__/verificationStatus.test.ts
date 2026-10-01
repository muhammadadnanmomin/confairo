/**
 * Confairo — Phase 3A: Verification Status API Integration Tests
 *
 * Tests:
 *  1. Unauthenticated request → 401
 *  2. Invalid Bearer token → 401
 *  3. Authenticated unverified user → 200, isVerified: false, hasPendingRequest: false
 *  4. No sensitive fields leaked in payload
 *  5. User with active pending request → 200, isVerified: false, hasPendingRequest: true, pendingEmail populated
 *  6. User with verified request → 200, isVerified: true, safe fields populated
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/verification/status/route";
import { createClient } from "@supabase/supabase-js";

const TEST_USER_ID = "ab03ab5c-a4e4-41af-b8df-521fba5e42b4";
const TEST_EMAIL = "muhammadadnanmomin@gmail.com";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function runTests() {
  console.log("=== Phase 3A: Verification Status API Tests ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.log(`  ✗ FAIL: ${desc}${detail ? ` (${detail})` : ""}`);
      failed++;
    }
  }

  // Test 1: Unauthenticated request -> 401
  const req1 = new NextRequest("http://localhost:3000/api/verification/status", {
    method: "GET",
  });
  const res1 = await GET(req1);
  assert(res1.status === 401, "Unauthenticated request returns 401");
  const data1 = await res1.json();
  assert(data1.error === "Authentication required", "Returns authentication error message");

  // Test 2: Invalid bearer token -> 401
  const req2 = new NextRequest("http://localhost:3000/api/verification/status", {
    method: "GET",
    headers: { Authorization: "Bearer invalid-token-12345" },
  });
  const res2 = await GET(req2);
  assert(res2.status === 401, "Invalid Bearer token returns 401");

  // Generate a valid session token for TEST_USER_ID
  const linkRes = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
  });

  const otp = linkRes.data?.properties?.email_otp;
  if (!otp) {
    console.error("Failed to generate OTP for test user");
    return;
  }

  const { data: sessionData, error: sessionError } = await supabaseAnon.auth.verifyOtp({
    email: TEST_EMAIL,
    token: otp,
    type: "magiclink",
  });

  if (sessionError || !sessionData.session) {
    console.error("Failed to obtain session for test user:", sessionError);
    return;
  }

  const token = sessionData.session.access_token;

  // Clean any pre-existing verification records for this test user
  await supabaseAdmin
    .from("user_verifications")
    .delete()
    .eq("user_id", TEST_USER_ID);

  try {
    // Test 3: Authenticated unverified user with no pending requests
    const req3 = new NextRequest("http://localhost:3000/api/verification/status", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    const res3 = await GET(req3);
    assert(res3.status === 200, "Authenticated unverified request returns 200");
    const data3 = await res3.json();
    assert(data3.isVerified === false, "isVerified is false");
    assert(data3.hasPendingRequest === false, "hasPendingRequest is false");
    assert(data3.pendingEmail === null, "pendingEmail is null");
    assert(data3.verificationType === null, "verificationType is null");
    assert(data3.institutionName === null, "institutionName is null");
    assert(data3.expiresAt === null, "expiresAt is null");

    // Security check: ensure no sensitive keys exist in response
    const forbiddenKeys = [
      "verification_token_hash",
      "token",
      "raw_token",
      "reviewed_by",
      "review_notes",
    ];
    const keysPresent = forbiddenKeys.filter((k) => k in data3);
    assert(keysPresent.length === 0, "No sensitive fields in response payload");

    // Test 4: User with an active pending request
    const pendingEmail = `pending-${Date.now()}@test-univ.edu`;
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data: pendingInsert, error: insertError } = await supabaseAdmin
      .from("user_verifications")
      .insert({
        user_id: TEST_USER_ID,
        verification_type: "institutional_email",
        status: "pending",
        institutional_email: pendingEmail,
        institution_name: "Test University",
        institution_domain: "test-univ.edu",
        verification_token_hash: "dummyhash123",
        token_expires_at: tokenExpiresAt,
      })
      .select()
      .single();

    assert(!insertError, "Pending record inserted successfully");

    const res4 = await GET(req3);
    assert(res4.status === 200, "Request with pending record returns 200");
    const data4 = await res4.json();
    assert(data4.isVerified === false, "isVerified remains false while pending");
    assert(data4.hasPendingRequest === true, "hasPendingRequest is true");
    assert(data4.pendingEmail === pendingEmail, "pendingEmail matches submitted email");

    // Test 5: Verified user
    if (pendingInsert?.id) {
      await supabaseAdmin
        .from("user_verifications")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          verification_token_hash: null,
          token_expires_at: null,
        })
        .eq("id", pendingInsert.id);
    }

    const res5 = await GET(req3);
    assert(res5.status === 200, "Request with verified record returns 200");
    const data5 = await res5.json();
    assert(data5.isVerified === true, "isVerified is true");
    assert(
      data5.verificationType === "institutional_email",
      "verificationType is institutional_email"
    );
    assert(data5.institutionName === "Test University", "institutionName is returned");
    assert(data5.institutionalEmail === pendingEmail, "institutionalEmail is returned");
    assert(data5.hasPendingRequest === false, "hasPendingRequest is false when verified");
    assert(data5.pendingEmail === null, "pendingEmail is null when verified");
  } finally {
    // Cleanup test records
    await supabaseAdmin
      .from("user_verifications")
      .delete()
      .eq("user_id", TEST_USER_ID);
    console.log("\n--- Cleanup complete ---");
  }

  console.log(`\n=== Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
