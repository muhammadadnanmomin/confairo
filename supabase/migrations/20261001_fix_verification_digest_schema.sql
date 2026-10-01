-- ============================================================
-- Confairo — Fix: Schema-qualify pgcrypto digest() call
--
-- In Supabase, pgcrypto is installed in the `extensions` schema.
-- The confirm_email_verification() function uses SET search_path
-- = public (a security hardening measure), which means unqualified
-- digest() cannot resolve to extensions.digest().
--
-- This migration replaces the function with the identical logic,
-- changing only:
--   digest(p_raw_token, 'sha256')
-- to:
--   extensions.digest(p_raw_token, 'sha256')
--
-- All security properties are preserved exactly:
--   - SECURITY DEFINER
--   - SET search_path = public
--   - FOR UPDATE row lock
--   - REVOKE from PUBLIC, anon, authenticated
--
-- Depends on: 20260930_user_verifications.sql
-- ============================================================

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
  -- encode(extensions.digest(...)) produces the same hex string the app stored
  SELECT id, token_expires_at
    INTO v_record_id, v_token_expires_at
    FROM user_verifications
   WHERE verification_token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
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

-- Re-assert privilege restrictions (CREATE OR REPLACE preserves
-- ownership but REVOKE is idempotent and ensures correctness)
REVOKE EXECUTE ON FUNCTION confirm_email_verification(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION confirm_email_verification(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION confirm_email_verification(TEXT) FROM authenticated;
