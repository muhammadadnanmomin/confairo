-- ================================================================
-- Confairo — Organization Slug History & Redirects
-- Preserves old public organization profile URLs when slug changes.
-- ================================================================

CREATE TABLE IF NOT EXISTS organization_slug_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_slug_history_slug ON organization_slug_history(slug);
CREATE INDEX IF NOT EXISTS idx_organization_slug_history_org_id ON organization_slug_history(organization_id);

-- Enable Row Level Security
ALTER TABLE organization_slug_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access so redirects can be resolved
CREATE POLICY "Public read organization_slug_history"
    ON organization_slug_history FOR SELECT
    USING (true);

COMMENT ON TABLE organization_slug_history IS
    'Historical slugs previously used by organizations, used to safely redirect old public URLs to the new active slug.';
