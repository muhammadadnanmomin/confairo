-- ============================================================
-- Confairo — Phase 2B: Secure Conference Publishing
-- Prevents direct browser-client updates to is_published=true
-- on the conferences table.
--
-- SECURITY MODEL:
--   Publishing (is_published: false → true) MUST go through
--   the server-side API route /api/organizer/publish, which
--   calls requireVerifiedOrganizer() and uses the service-role
--   client for the actual update.
--
--   This trigger blocks the transition is_published=true
--   when the current role is NOT postgres/service_role.
--   Normal conference editing (title, dates, etc.) is unaffected.
--   Unpublishing (true → false) is allowed for any authorized user.
--   Existing published conferences are NOT affected.
--
-- Depends on: conferences table (pre-existing)
-- ============================================================

-- -----------------------------------------------------------
-- 1. Column-protection trigger for is_published
--    Blocks: is_published = false → true  from browser roles
--    Allows: is_published = true → false  (unpublish) from any role
--    Allows: all transitions from postgres / service_role
--    Allows: all other column updates regardless of role
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_conference_publish()
RETURNS TRIGGER AS $$
BEGIN
  -- Only guard the transition from unpublished to published
  -- (is_published: false/NULL → true)
  IF (OLD.is_published IS NOT TRUE) AND (NEW.is_published IS TRUE) THEN

    -- Allow service-role / postgres to perform the publish
    IF current_setting('role', true) = 'postgres'
       OR current_setting('role', true) = 'service_role'
       OR session_user = 'postgres' THEN
      RETURN NEW;
    END IF;

    -- Block browser roles from directly publishing
    RAISE EXCEPTION 'Conference publishing must go through the server API'
      USING HINT = 'Use POST /api/organizer/publish instead of direct update';

  END IF;

  -- All other updates (including unpublish) pass through
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_conference_publish
  BEFORE UPDATE ON conferences
  FOR EACH ROW
  EXECUTE FUNCTION protect_conference_publish();
