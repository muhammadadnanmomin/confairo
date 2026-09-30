-- ============================================================
-- Confairo — Phase 2A: User Verifications
-- Trust & Verification foundation table.
--
-- SECURITY DECISION — Token Storage:
--   We store verification_token_hash (SHA-256 of the raw token)
--   instead of the raw token. The raw token is generated in
--   application code, sent to the user via email link, and
--   NEVER persisted in the database. Only the hash is stored,
--   so a database leak does not expose valid confirmation URLs.
--   Token confirmation happens server-side by hashing the
--   candidate token and comparing against the stored hash.
--
-- SECURITY DECISION — Access Model:
--   This table is accessed ONLY through server-side code using
--   the service-role client (supabaseAdmin), which bypasses RLS.
--   No browser-role (anon/authenticated) has direct table access.
--   All RLS policies are restrictive — no USING(true) policies.
--   The confirm_email_verification() function is restricted to
--   the database owner (postgres) role only.
--
-- Depends on: profiles(id), pgcrypto extension
-- ============================================================

-- -----------------------------------------------------------
-- 0. Enable pgcrypto (idempotent — provides digest())
-- -----------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------
-- 1. user_verifications table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_verifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  user_id                 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  verification_type       TEXT NOT NULL
                          CHECK (verification_type IN (
                            'institutional_email',
                            'manual_affiliation'
                          )),

  -- Status lifecycle: pending → verified | rejected | expired
  status                  TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN (
                            'pending',
                            'verified',
                            'rejected',
                            'expired'
                          )),

  -- Institutional email fields (for institutional_email type)
  institutional_email     TEXT,
  institution_name        TEXT,
  institution_domain      TEXT,

  -- Manual affiliation fields (for manual_affiliation type)
  affiliation_title       TEXT,
  affiliation_org         TEXT,
  affiliation_evidence    TEXT,         -- URL or description of evidence

  -- Token — stored as SHA-256 hash, never raw
  verification_token_hash TEXT,
  token_expires_at        TIMESTAMPTZ,

  -- Admin review
  reviewed_by             UUID REFERENCES profiles(id),
  reviewed_at             TIMESTAMPTZ,
  review_notes            TEXT,

  -- Verification lifecycle
  verified_at             TIMESTAMPTZ,
  expires_at              TIMESTAMPTZ,  -- when the verification itself expires

  -- Timestamps
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------

-- Fast lookup by user (most common query path)
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id
  ON user_verifications(user_id);

-- Fast token confirmation lookup (server-side only)
CREATE INDEX IF NOT EXISTS idx_user_verifications_token_hash
  ON user_verifications(verification_token_hash)
  WHERE verification_token_hash IS NOT NULL;

-- Active verification lookup: user + type + status
CREATE INDEX IF NOT EXISTS idx_user_verifications_active
  ON user_verifications(user_id, verification_type, status)
  WHERE status = 'verified';

-- -----------------------------------------------------------
-- 3. Auto-update updated_at trigger
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION update_user_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_verifications_updated_at
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_user_verifications_updated_at();

-- -----------------------------------------------------------
-- 3b. Column-protection trigger for user updates
--     Prevents modification of security-critical fields.
--     Service-role bypasses RLS but NOT triggers, so this
--     trigger only blocks when the session role is NOT the
--     table owner (postgres). Service-role calls via
--     supabaseAdmin go through the postgres role and are
--     unaffected.
--
--     Protected fields:
--       status, verification_token_hash, token_expires_at,
--       verified_at, reviewed_by, reviewed_at, review_notes
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_verification_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service-role / postgres (table owner) to modify anything
  IF current_setting('role', true) = 'postgres'
     OR current_setting('role', true) = 'service_role'
     OR session_user = 'postgres' THEN
    RETURN NEW;
  END IF;

  -- For all other roles: enforce immutability of protected fields
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Cannot modify status directly';
  END IF;

  IF NEW.verification_token_hash IS DISTINCT FROM OLD.verification_token_hash THEN
    RAISE EXCEPTION 'Cannot modify verification_token_hash';
  END IF;

  IF NEW.token_expires_at IS DISTINCT FROM OLD.token_expires_at THEN
    RAISE EXCEPTION 'Cannot modify token_expires_at';
  END IF;

  IF NEW.verified_at IS DISTINCT FROM OLD.verified_at THEN
    RAISE EXCEPTION 'Cannot modify verified_at';
  END IF;

  IF NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by THEN
    RAISE EXCEPTION 'Cannot modify reviewed_by';
  END IF;

  IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at THEN
    RAISE EXCEPTION 'Cannot modify reviewed_at';
  END IF;

  IF NEW.review_notes IS DISTINCT FROM OLD.review_notes THEN
    RAISE EXCEPTION 'Cannot modify review_notes';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_verification_fields
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW
  EXECUTE FUNCTION protect_verification_fields();

-- -----------------------------------------------------------
-- 4. Row Level Security
--
-- ACCESS MODEL:
--   All application access to this table goes through the
--   service-role client (supabaseAdmin), which bypasses RLS.
--   Browser roles (anon, authenticated) have NO direct access.
--
--   RLS is enabled with NO permissive policies for browser
--   roles. This means anon/authenticated get zero rows on
--   SELECT and are denied on INSERT/UPDATE/DELETE.
--
--   Admin review and user queries are performed via server
--   actions using the service-role client.
-- -----------------------------------------------------------
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

-- No policies for anon or authenticated.
-- Service role bypasses RLS automatically.
-- This is the most restrictive configuration: RLS is ON,
-- but no policies grant access to browser-facing roles.

-- -----------------------------------------------------------
-- 5. Server-side token confirmation function
--    Called by the application server (service role) when a
--    user clicks the verification email link.
--
--    Accepts the raw token, hashes it, looks up the matching
--    pending record, validates expiration, and marks it verified.
--    Returns TRUE on success, FALSE on failure.
--    Token is single-use: hash is cleared after confirmation.
--
--    SECURITY HARDENING:
--    - SECURITY DEFINER: runs as function owner (postgres)
--    - SET search_path = public: prevents schema injection
--    - Execution revoked from PUBLIC, anon, authenticated
--    - Only service-role / postgres can call this function
--    - Row locked with FOR UPDATE to prevent concurrent replay
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION confirm_email_verification(p_raw_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_record_id UUID;
  v_token_expires_at TIMESTAMPTZ;
BEGIN
  -- Reject empty/null tokens immediately
  IF p_raw_token IS NULL OR length(p_raw_token) = 0 THEN
    RETURN FALSE;
  END IF;

  -- Hash the candidate token
  -- encode(digest(...)) produces the same hex string the app stored
  SELECT id, token_expires_at
    INTO v_record_id, v_token_expires_at
    FROM user_verifications
   WHERE verification_token_hash = encode(digest(p_raw_token, 'sha256'), 'hex')
     AND status = 'pending'
     AND verification_type = 'institutional_email'
     FOR UPDATE;  -- lock row to prevent concurrent confirmation

  -- No matching pending record
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Token expired
  IF v_token_expires_at IS NOT NULL AND v_token_expires_at < now() THEN
    -- Mark as expired and clear the token hash
    UPDATE user_verifications
       SET status = 'expired',
           verification_token_hash = NULL
     WHERE id = v_record_id;
    RETURN FALSE;
  END IF;

  -- Success: mark verified, clear token hash (single-use)
  UPDATE user_verifications
     SET status = 'verified',
         verified_at = now(),
         verification_token_hash = NULL
   WHERE id = v_record_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;

-- -----------------------------------------------------------
-- 6. Privilege restrictions
--    Revoke execution of confirm_email_verification from all
--    browser-accessible roles. Only postgres / service_role
--    (which owns the function via SECURITY DEFINER) can call it.
--
--    In Supabase:
--      - "anon" = unauthenticated browser requests
--      - "authenticated" = logged-in browser requests
--      - "service_role" = server-side service-role key
--      - "postgres" = database superuser / function owner
-- -----------------------------------------------------------
REVOKE EXECUTE ON FUNCTION confirm_email_verification(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION confirm_email_verification(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION confirm_email_verification(TEXT) FROM authenticated;
