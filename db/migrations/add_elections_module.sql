CREATE TABLE IF NOT EXISTS organization_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    hierarchy_level INTEGER NOT NULL DEFAULT 1,
    can_manage_roles BOOLEAN NOT NULL DEFAULT false,
    assigned_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(organization_id, title)
);

CREATE INDEX IF NOT EXISTS idx_org_roles_org ON organization_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_roles_user ON organization_roles(assigned_user_id);

ALTER TABLE organization_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view organization roles"
    ON organization_roles FOR SELECT
    USING (true);

CREATE POLICY "Admins can manage all organization roles"
    ON organization_roles FOR ALL
    USING (public.get_my_role() = 'admin');

CREATE POLICY "Role managers can manage org roles"
    ON organization_roles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM organization_roles AS or2
            WHERE or2.organization_id = organization_roles.organization_id
              AND or2.assigned_user_id = auth.uid()
              AND or2.can_manage_roles = true
        )
    );

ALTER TABLE elections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE elections ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS organization_role_id UUID REFERENCES organization_roles(id) ON DELETE CASCADE;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS platform TEXT;

DROP INDEX IF EXISTS candidates_election_id_user_id_key;
ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_election_id_user_id_key;
ALTER TABLE candidates ADD CONSTRAINT candidates_election_role_user_unique UNIQUE(election_id, organization_role_id, user_id);

ALTER TABLE votes ADD COLUMN IF NOT EXISTS organization_role_id UUID REFERENCES organization_roles(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS votes_election_id_membership_id_key;
ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_election_id_membership_id_key;
ALTER TABLE votes ADD CONSTRAINT votes_election_role_membership_unique UNIQUE(election_id, organization_role_id, membership_id);

DROP POLICY IF EXISTS "Members can view active elections" ON elections;
DROP POLICY IF EXISTS "Admins can manage elections" ON elections;

CREATE POLICY "Members can view elections"
    ON elections FOR SELECT
    USING (public.is_org_member(organization_id));

CREATE POLICY "Officers can view all org elections"
    ON elections FOR SELECT
    USING (public.is_org_officer(organization_id));

CREATE POLICY "Admins can manage elections"
    ON elections FOR ALL
    USING (public.get_my_role() = 'admin');

CREATE POLICY "Role managers can create elections"
    ON elections FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM organization_roles
            WHERE organization_roles.organization_id = elections.organization_id
              AND organization_roles.assigned_user_id = auth.uid()
              AND organization_roles.can_manage_roles = true
        )
    );

CREATE POLICY "Role managers can update elections"
    ON elections FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM organization_roles
            WHERE organization_roles.organization_id = elections.organization_id
              AND organization_roles.assigned_user_id = auth.uid()
              AND organization_roles.can_manage_roles = true
        )
    );

DROP POLICY IF EXISTS "Members can view candidates in active elections" ON candidates;
DROP POLICY IF EXISTS "Members can register as candidates" ON candidates;
DROP POLICY IF EXISTS "Admins can manage candidates" ON candidates;

CREATE POLICY "Anyone can view candidates in elections"
    ON candidates FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = candidates.election_id
        )
    );

CREATE POLICY "Approved members can nominate themselves"
    ON candidates FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = candidates.election_id
              AND elections.status = 'active'
              AND public.is_org_member(elections.organization_id)
        )
    );

CREATE POLICY "Admins can manage candidates"
    ON candidates FOR ALL
    USING (public.get_my_role() = 'admin');

CREATE POLICY "Candidates can withdraw themselves"
    ON candidates FOR DELETE
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = candidates.election_id
              AND elections.status = 'active'
        )
    );

DROP POLICY IF EXISTS "No one can read votes directly" ON votes;
DROP POLICY IF EXISTS "Admins can view vote aggregates (via functions)" ON votes;

CREATE POLICY "Admins can view votes"
    ON votes FOR SELECT
    USING (public.get_my_role() = 'admin');

CREATE POLICY "Officers can view org election votes"
    ON votes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = votes.election_id
              AND public.is_org_officer(elections.organization_id)
        )
    );

CREATE OR REPLACE FUNCTION public.cast_vote(
    p_election_id UUID,
    p_candidate_id UUID,
    p_organization_role_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election RECORD;
    v_membership RECORD;
    v_candidate RECORD;
    v_existing_vote RECORD;
    v_vote_id UUID;
BEGIN
    SELECT * INTO v_election
    FROM elections
    WHERE id = p_election_id
      AND status = 'active';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Election is not active or does not exist.');
    END IF;

    IF now() < v_election.start_date THEN
        RETURN jsonb_build_object('error', 'Voting has not started yet.');
    END IF;

    IF now() > v_election.end_date THEN
        RETURN jsonb_build_object('error', 'Voting has ended.');
    END IF;

    SELECT * INTO v_membership
    FROM memberships
    WHERE user_id = auth.uid()
      AND organization_id = v_election.organization_id
      AND role = 'officer'
      AND status = 'approved';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Only officers of this organization can vote.');
    END IF;

    SELECT * INTO v_candidate
    FROM candidates
    WHERE id = p_candidate_id
      AND election_id = p_election_id
      AND organization_role_id = p_organization_role_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Invalid candidate for this role.');
    END IF;

    SELECT * INTO v_existing_vote
    FROM votes
    WHERE election_id = p_election_id
      AND organization_role_id = p_organization_role_id
      AND membership_id = v_membership.id;

    IF FOUND THEN
        RETURN jsonb_build_object('error', 'You have already voted for this role.');
    END IF;

    INSERT INTO votes (election_id, membership_id, candidate_id, organization_role_id)
    VALUES (p_election_id, v_membership.id, p_candidate_id, p_organization_role_id)
    RETURNING id INTO v_vote_id;

    RETURN jsonb_build_object('success', true, 'vote_id', v_vote_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_election_results(p_election_id UUID)
RETURNS TABLE (
    role_id UUID,
    role_title TEXT,
    candidate_id UUID,
    candidate_user_id UUID,
    candidate_name TEXT,
    candidate_avatar TEXT,
    candidate_platform TEXT,
    vote_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election RECORD;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election_id;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF public.get_my_role() != 'admin'
       AND NOT public.is_org_officer(v_election.organization_id)
       AND NOT public.is_org_member(v_election.organization_id) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        c.organization_role_id AS role_id,
        orr.title AS role_title,
        c.id AS candidate_id,
        c.user_id AS candidate_user_id,
        p.full_name AS candidate_name,
        p.avatar_url AS candidate_avatar,
        c.platform AS candidate_platform,
        COALESCE(COUNT(v.id), 0) AS vote_count
    FROM candidates c
    JOIN organization_roles orr ON orr.id = c.organization_role_id
    JOIN profiles p ON p.id = c.user_id
    LEFT JOIN votes v ON v.candidate_id = c.id
    WHERE c.election_id = p_election_id
    GROUP BY c.organization_role_id, orr.title, c.id, c.user_id, p.full_name, p.avatar_url, c.platform
    ORDER BY orr.title, vote_count DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_election_results(p_election_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_election RECORD;
    v_role RECORD;
    v_winner RECORD;
    v_is_admin BOOLEAN;
    v_is_role_manager BOOLEAN;
BEGIN
    SELECT * INTO v_election FROM elections WHERE id = p_election_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Election not found.');
    END IF;

    v_is_admin := (public.get_my_role() = 'admin');

    SELECT EXISTS (
        SELECT 1 FROM organization_roles
        WHERE organization_id = v_election.organization_id
          AND assigned_user_id = auth.uid()
          AND can_manage_roles = true
    ) INTO v_is_role_manager;

    IF NOT v_is_admin AND NOT v_is_role_manager THEN
        RETURN jsonb_build_object('error', 'Only admins or role managers can publish results.');
    END IF;

    FOR v_role IN
        SELECT DISTINCT c.organization_role_id
        FROM candidates c
        WHERE c.election_id = p_election_id
    LOOP
        SELECT c.user_id INTO v_winner
        FROM candidates c
        LEFT JOIN votes v ON v.candidate_id = c.id
        WHERE c.election_id = p_election_id
          AND c.organization_role_id = v_role.organization_role_id
        GROUP BY c.id, c.user_id
        ORDER BY COUNT(v.id) DESC
        LIMIT 1;

        IF v_winner IS NOT NULL THEN
            UPDATE organization_roles
            SET assigned_user_id = v_winner.user_id
            WHERE id = v_role.organization_role_id;
        END IF;
    END LOOP;

    UPDATE elections SET status = 'closed' WHERE id = p_election_id;

    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_voted_roles(p_election_id UUID)
RETURNS UUID[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_voted_roles UUID[];
BEGIN
    SELECT ARRAY_AGG(v.organization_role_id) INTO v_voted_roles
    FROM votes v
    JOIN memberships m ON m.id = v.membership_id
    WHERE v.election_id = p_election_id
      AND m.user_id = auth.uid();

    RETURN COALESCE(v_voted_roles, ARRAY[]::UUID[]);
END;
$$;
