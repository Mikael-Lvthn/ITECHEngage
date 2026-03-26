CREATE TABLE recruitment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recruitment_org ON recruitment_requests(organization_id);
CREATE INDEX idx_recruitment_active ON recruitment_requests(is_active);

ALTER TABLE recruitment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active recruitment requests"
  ON recruitment_requests FOR SELECT
  USING (is_active = true);

CREATE POLICY "Officers can manage recruitment requests"
  ON recruitment_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = recruitment_requests.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'officer'
        AND memberships.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage all recruitment requests"
  ON recruitment_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
