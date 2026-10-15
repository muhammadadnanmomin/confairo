/**
 * Confairo — Organization Management API Integration Tests
 *
 * Tests:
 *  1. Unauthenticated GET / PATCH → 401
 *  2. Invalid token → 401
 *  3. Validation errors:
 *     - Name < 2 characters → 400
 *     - Name > 100 characters → 400
 *     - Invalid website URL → 400
 *     - Invalid LinkedIn URL → 400
 *     - Description > 1000 characters → 400
 *  4. Unauthorized cross-org update attempt → 403
 *  5. Staff member update attempt → 403
 *  6. Field whitelisting:
 *     - Injected plan_type, conference_slots, payment_id, created_by are ignored
 *  7. Authorized Owner update:
 *     - Updates name, country, description, website, linkedin_url, logo_url → 200
 *     - Persistence verified in DB
 *  8. Slug handling:
 *     - Existing slug preserved on name edit
 *     - Null slug auto-generated and populated
 */

import { NextRequest } from "next/server";
import { GET, PATCH } from "@/app/api/organizer/organization/route";
import { GET as slugCheckGET } from "@/app/api/organizer/organization/slug-check/route";
import { createClient } from "@supabase/supabase-js";

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
  console.log("=== Confairo Organization API Integration Tests ===\n");
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

  // 1. Unauthenticated GET -> 401
  const reqUnauthGet = new NextRequest("http://localhost:3000/api/organizer/organization", {
    method: "GET",
  });
  const resUnauthGet = await GET(reqUnauthGet);
  assert(resUnauthGet.status === 401, "Unauthenticated GET returns 401");

  // 2. Unauthenticated PATCH -> 401
  const reqUnauthPatch = new NextRequest("http://localhost:3000/api/organizer/organization", {
    method: "PATCH",
    body: JSON.stringify({ name: "Hacked Org" }),
  });
  const resUnauthPatch = await PATCH(reqUnauthPatch);
  assert(resUnauthPatch.status === 401, "Unauthenticated PATCH returns 401");

  // 3. Invalid token -> 401
  const reqInvalidToken = new NextRequest("http://localhost:3000/api/organizer/organization", {
    method: "GET",
    headers: { Authorization: "Bearer bad-token-999" },
  });
  const resInvalidToken = await GET(reqInvalidToken);
  assert(resInvalidToken.status === 401, "Invalid Bearer token returns 401");

  // Generate a valid session token for test user
  const linkRes = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: TEST_EMAIL,
  });

  const otp = linkRes.data?.properties?.email_otp;
  if (!otp) {
    console.error("Failed to generate OTP for test user");
    process.exit(1);
  }

  const { data: sessionData, error: sessionError } = await supabaseAnon.auth.verifyOtp({
    email: TEST_EMAIL,
    token: otp,
    type: "magiclink",
  });

  if (sessionError || !sessionData.session || !sessionData.user) {
    console.error("Failed to obtain session for test user:", sessionError);
    process.exit(1);
  }

  const token = sessionData.session.access_token;
  const userId = sessionData.user.id;
  const authHeaders = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Setup test organizations
  // Org 1: Owned by userId with an existing slug
  const { data: testOrg1 } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: "Test Institute of Technology",
      slug: `test-iit-${Date.now()}`,
      country: "India",
      plan_type: "free",
      conference_slots: 1,
      created_by: userId,
    })
    .select()
    .single();

  if (!testOrg1) {
    console.error("Failed to create testOrg1");
    process.exit(1);
  }

  // Add owner membership for Org 1
  await supabaseAdmin.from("organization_members").insert({
    organization_id: testOrg1.id,
    user_id: userId,
    role: "owner",
  });

  // Org 2: Foreign org where userId is NOT a member
  const { data: foreignOrg, error: foreignOrgErr } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: "Foreign University",
      slug: `foreign-univ-${Date.now()}`,
      country: "United States",
      plan_type: "pro",
      conference_slots: 5,
      created_by: userId,
    })
    .select()
    .single();

  if (foreignOrgErr) {
    console.warn("Notice: foreignOrg creation error:", foreignOrgErr.message);
  }

  // Org 3: Auto-created organization with NULL slug
  const { data: nullSlugOrg } = await supabaseAdmin
    .from("organizations")
    .insert({
      name: "Auto Created Organization",
      slug: null,
      country: null,
      plan_type: "free",
      conference_slots: 1,
      created_by: userId,
    })
    .select()
    .single();

  // Add owner membership for Org 3
  if (nullSlugOrg) {
    await supabaseAdmin.from("organization_members").insert({
      organization_id: nullSlugOrg.id,
      user_id: userId,
      role: "owner",
    });
  }

  try {
    // 4. Validation Tests: Name < 2 chars
    const resShortName = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ organizationId: testOrg1.id, name: "A" }),
      })
    );
    assert(resShortName.status === 400, "Name < 2 characters returns 400");

    // 5. Validation Tests: Name > 100 chars
    const longName = "X".repeat(101);
    const resLongName = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ organizationId: testOrg1.id, name: longName }),
      })
    );
    assert(resLongName.status === 400, "Name > 100 characters returns 400");

    // 6. Validation Tests: Invalid Website URL
    const resBadUrl = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ organizationId: testOrg1.id, website: "not-a-valid-url" }),
      })
    );
    assert(resBadUrl.status === 400, "Invalid website URL returns 400");

    // 7. Validation Tests: Invalid LinkedIn URL
    const resBadLinkedin = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ organizationId: testOrg1.id, linkedin_url: "javascript:alert(1)" }),
      })
    );
    assert(resBadLinkedin.status === 400, "Invalid LinkedIn URL returns 400");

    // 8. Validation Tests: Description > 1000 chars
    const longDesc = "A".repeat(1001);
    const resLongDesc = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ organizationId: testOrg1.id, description: longDesc }),
      })
    );
    assert(resLongDesc.status === 400, "Description > 1000 characters returns 400");

    // 9. Unauthorized Cross-Org Modification Attempt -> 403
    if (foreignOrg) {
      const resForeign = await PATCH(
        new NextRequest("http://localhost:3000/api/organizer/organization", {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({
            organizationId: foreignOrg.id,
            name: "Hacked Foreign University",
          }),
        })
      );
      assert(resForeign.status === 403, "Cross-organization update attempt returns 403");

      // Verify foreign org was NOT modified
      const { data: checkForeign } = await supabaseAdmin
        .from("organizations")
        .select("name")
        .eq("id", foreignOrg.id)
        .single();
      assert(
        checkForeign?.name === "Foreign University",
        "Foreign organization remains completely unmodified"
      );
    }

    // 10. Staff Member Update Attempt -> 403
    // Downgrade membership on testOrg1 temporarily to 'staff'
    await supabaseAdmin
      .from("organization_members")
      .update({ role: "staff" })
      .eq("organization_id", testOrg1.id)
      .eq("user_id", userId);

    const resStaff = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          name: "Staff Trying To Rename",
        }),
      })
    );
    assert(resStaff.status === 403, "Staff member update attempt returns 403");
    const staffData = await resStaff.json();
    assert(
      staffData.error === "Only organization owners can modify organization details",
      "Returns explicit owner error message"
    );

    // Restore owner role
    await supabaseAdmin
      .from("organization_members")
      .update({ role: "owner" })
      .eq("organization_id", testOrg1.id)
      .eq("user_id", userId);

    // 11. Field Whitelisting & Attack Vector Test:
    // Attempt to inject plan_type: "institutional", conference_slots: 999, payment_id: "fake"
    const dummyOwnerId = "00000000-0000-0000-0000-000000000001";
    const resTamper = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          name: "Renamed Institute",
          plan_type: "institutional",
          conference_slots: 999,
          payment_id: "fake_payment_xyz",
          created_by: dummyOwnerId,
        }),
      })
    );
    assert(resTamper.status === 200, "Valid update with injected fields returns 200");

    const { data: checkTamper } = await supabaseAdmin
      .from("organizations")
      .select("name, plan_type, conference_slots, payment_id, created_by")
      .eq("id", testOrg1.id)
      .single();

    assert(checkTamper?.name === "Renamed Institute", "Whitelisted field 'name' updated");
    assert(checkTamper?.plan_type === "free", "Protected field 'plan_type' untouched");
    assert(checkTamper?.conference_slots === 1, "Protected field 'conference_slots' untouched");
    assert(checkTamper?.payment_id === null, "Protected field 'payment_id' untouched");
    assert(checkTamper?.created_by === userId, "Protected field 'created_by' untouched");

    // 12. Slug Preservation on Name Edit
    const originalSlug = testOrg1.slug;
    const resSlugPreserve = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          name: "Completely New Name That Would Change Slug",
        }),
      })
    );
    assert(resSlugPreserve.status === 200, "Name update returns 200");
    const { data: checkSlug } = await supabaseAdmin
      .from("organizations")
      .select("slug")
      .eq("id", testOrg1.id)
      .single();
    assert(checkSlug?.slug === originalSlug, "Existing slug is preserved to protect permalinks");

    // 13. Auto-Slug Generation for Organizations with NULL Slug
    if (nullSlugOrg) {
      const resNullSlug = await PATCH(
        new NextRequest("http://localhost:3000/api/organizer/organization", {
          method: "PATCH",
          headers: authHeaders,
          body: JSON.stringify({
            organizationId: nullSlugOrg.id,
            name: "Newly Configured University",
            country: "India",
            description: "A premier university profile.",
          }),
        })
      );
      assert(resNullSlug.status === 200, "Update on null-slug org returns 200");
      const { data: checkNullSlug } = await supabaseAdmin
        .from("organizations")
        .select("slug, country, description")
        .eq("id", nullSlugOrg.id)
        .single();
      assert(
        checkNullSlug?.slug?.startsWith("newly-configured-university"),
        "Null slug is automatically populated with valid slug"
      );
      assert(checkNullSlug?.country === "India", "Country updated");
      assert(checkNullSlug?.description === "A premier university profile.", "Description updated");
    }

    // 14. GET endpoint tests
    const resGet = await GET(
      new NextRequest(
        `http://localhost:3000/api/organizer/organization?organizationId=${testOrg1.id}`,
        {
          method: "GET",
          headers: authHeaders,
        }
      )
    );
    assert(resGet.status === 200, "GET /api/organizer/organization returns 200");
    const getData = await resGet.json();
    assert(getData.organization.id === testOrg1.id, "GET returns correct organization");
    assert(getData.role === "owner", "GET returns member role as owner");
    assert(getData.isOwner === true, "GET returns isOwner = true");

    // 15. Slug Availability Check API tests
    const resCheckValid = await slugCheckGET(
      new NextRequest(`http://localhost:3000/api/organizer/organization/slug-check?slug=new-unique-slug-${Date.now()}`)
    );
    const dataCheckValid = await resCheckValid.json();
    assert(dataCheckValid.available === true, "Slug check: unique slug is available");

    const resCheckShort = await slugCheckGET(
      new NextRequest("http://localhost:3000/api/organizer/organization/slug-check?slug=ab")
    );
    const dataCheckShort = await resCheckShort.json();
    assert(dataCheckShort.available === false, "Slug check: slug < 3 chars rejected");

    const resCheckReserved = await slugCheckGET(
      new NextRequest("http://localhost:3000/api/organizer/organization/slug-check?slug=login")
    );
    const dataCheckReserved = await resCheckReserved.json();
    assert(dataCheckReserved.available === false, "Slug check: reserved slug 'login' rejected");

    const resCheckDuplicate = await slugCheckGET(
      new NextRequest(`http://localhost:3000/api/organizer/organization/slug-check?slug=${foreignOrg.slug}`)
    );
    const dataCheckDuplicate = await resCheckDuplicate.json();
    assert(dataCheckDuplicate.available === false, "Slug check: duplicate foreign slug rejected");

    // 16. Slug Edit via PATCH
    // A) Invalid format (invalid characters)
    const resSlugBadFormat = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          slug: "bad slug with spaces!!",
        }),
      })
    );
    assert(resSlugBadFormat.status === 400, "PATCH with invalid slug characters returns 400");

    // B) Reserved slug
    const resSlugReserved = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          slug: "admin",
        }),
      })
    );
    assert(resSlugReserved.status === 400, "PATCH with reserved slug returns 400");

    // C) Duplicate slug
    const resSlugDuplicate = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          slug: foreignOrg.slug,
        }),
      })
    );
    assert(resSlugDuplicate.status === 409, "PATCH with duplicate slug returns 409");

    // D) Successful unique slug update
    const newUniqueSlug = `cambridge-iqc-${Date.now()}`;
    const resSlugSuccess = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          slug: newUniqueSlug,
        }),
      })
    );
    assert(resSlugSuccess.status === 200, "PATCH with valid unique slug returns 200");
    const { data: checkSlugUpdate } = await supabaseAdmin
      .from("organizations")
      .select("slug")
      .eq("id", testOrg1.id)
      .single();
    assert(checkSlugUpdate?.slug === newUniqueSlug, "Organization slug updated successfully");

    // 17. Logo URL Update and Removal via PATCH
    const testLogoUrl = `https://example.com/logo-${Date.now()}.png`;
    const resLogoUpdate = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          logo_url: testLogoUrl,
        }),
      })
    );
    assert(resLogoUpdate.status === 200, "PATCH with valid logo_url returns 200");
    const { data: checkLogoUpdate } = await supabaseAdmin
      .from("organizations")
      .select("logo_url")
      .eq("id", testOrg1.id)
      .single();
    assert(checkLogoUpdate?.logo_url === testLogoUrl, "Organization logo_url updated in database");

    // Removal of logo (setting logo_url to null)
    const resLogoRemove = await PATCH(
      new NextRequest("http://localhost:3000/api/organizer/organization", {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({
          organizationId: testOrg1.id,
          logo_url: null,
        }),
      })
    );
    assert(resLogoRemove.status === 200, "PATCH with logo_url: null returns 200");
    const { data: checkLogoRemove } = await supabaseAdmin
      .from("organizations")
      .select("logo_url")
      .eq("id", testOrg1.id)
      .single();
    assert(checkLogoRemove?.logo_url === null, "Organization logo_url cleared to null");
  } finally {
    // Cleanup test records
    await supabaseAdmin
      .from("organization_members")
      .delete()
      .in("organization_id", [testOrg1.id, foreignOrg?.id, nullSlugOrg?.id].filter(Boolean));

    await supabaseAdmin
      .from("organizations")
      .delete()
      .in("id", [testOrg1.id, foreignOrg?.id, nullSlugOrg?.id].filter(Boolean));

    console.log("\n--- Test cleanup completed ---");
  }

  console.log(`\n=== Results: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
