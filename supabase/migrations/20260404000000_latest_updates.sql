-- 1. CLEANUP OLD TRIGGERS
DROP TRIGGER IF EXISTS on_event_published ON events;
DROP FUNCTION IF EXISTS notify_followers_on_event();
DROP TRIGGER IF EXISTS on_news_published ON news;
DROP FUNCTION IF EXISTS notify_followers_on_news();
DROP TRIGGER IF EXISTS on_election_started ON elections;
DROP FUNCTION IF EXISTS notify_members_on_election();

-- 2. DROP ALL POLICIES DEPENDING ON ELECTIONS.STATUS
DROP POLICY IF EXISTS "Members can view active elections" ON elections;
DROP POLICY IF EXISTS "Members can view published and voting elections" ON elections;
DROP POLICY IF EXISTS "Anyone can view published elections" ON elections;
DROP POLICY IF EXISTS "Members can view candidates in active elections" ON candidates;
DROP POLICY IF EXISTS "Approved members can nominate themselves" ON candidates;
DROP POLICY IF EXISTS "Candidates can withdraw themselves" ON candidates;

-- 3. ENUM UPDATE (From election_notification_updates.sql)
DO $DO BEGIN
    CREATE TYPE election_status_new AS ENUM ('draft', 'published', 'voting', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $DO;

ALTER TABLE elections ALTER COLUMN status DROP DEFAULT;
ALTER TABLE elections ALTER COLUMN status TYPE election_status_new 
    USING CASE status::text 
        WHEN 'draft' THEN 'draft'::election_status_new
        WHEN 'active' THEN 'voting'::election_status_new
        WHEN 'closed' THEN 'closed'::election_status_new
        WHEN 'completed' THEN 'closed'::election_status_new
        ELSE 'draft'::election_status_new
    END;
ALTER TABLE elections ALTER COLUMN status SET DEFAULT 'draft'::election_status_new;
DROP TYPE IF EXISTS election_status CASCADE;
ALTER TYPE election_status_new RENAME TO election_status;

-- 4. RESTORE AND UPDATE CANDIDATE POLICIES WITH 'voting'
CREATE POLICY "Approved members can nominate themselves"
    ON candidates FOR INSERT
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = candidates.election_id
              AND elections.status = 'voting'
              AND public.is_org_member(elections.organization_id)
        )
    );

CREATE POLICY "Candidates can withdraw themselves"
    ON candidates FOR DELETE
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = candidates.election_id
              AND elections.status = 'voting'
        )
    );

-- 5. FROM db/fix_rls_final.sql
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_org_officer(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = org_id
      AND memberships.user_id = auth.uid()
      AND memberships.role = 'officer'
      AND memberships.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.organization_id = org_id
      AND memberships.user_id = auth.uid()
      AND memberships.status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_any_membership(profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM memberships
    WHERE memberships.user_id = profile_id
  );
$$;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Profiles readable for org member names" ON profiles;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (public.get_my_role() = 'admin');

CREATE POLICY "Profiles readable for org member names"
  ON profiles FOR SELECT
  USING (public.has_any_membership(id));

DROP POLICY IF EXISTS "Users can view their own memberships" ON memberships;
DROP POLICY IF EXISTS "Users can request to join organizations" ON memberships;
DROP POLICY IF EXISTS "Officers can view org memberships" ON memberships;
DROP POLICY IF EXISTS "Officers can update org memberships" ON memberships;
DROP POLICY IF EXISTS "Admins can manage all memberships" ON memberships;

CREATE POLICY "Users can view their own memberships"
  ON memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can request to join organizations"
  ON memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Officers can view org memberships"
  ON memberships FOR SELECT
  USING (public.is_org_officer(organization_id));

CREATE POLICY "Officers can update org memberships"
  ON memberships FOR UPDATE
  USING (public.is_org_officer(organization_id));

CREATE POLICY "Admins can manage all memberships"
  ON memberships FOR ALL
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Anyone can view public organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view their private organizations" ON organizations;
DROP POLICY IF EXISTS "Admins can manage organizations" ON organizations;

CREATE POLICY "Anyone can view public organizations"
  ON organizations FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Members can view their private organizations"
  ON organizations FOR SELECT
  USING (public.is_org_member(id));

CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  USING (public.get_my_role() = 'admin');


DROP POLICY IF EXISTS "Anyone can view published events" ON events;
DROP POLICY IF EXISTS "Creators can view their own events" ON events;
DROP POLICY IF EXISTS "Officers can manage org events" ON events;
DROP POLICY IF EXISTS "Admins can manage all events" ON events;

CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  USING (status = 'published');

CREATE POLICY "Creators can view their own events"
  ON events FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "Officers can manage org events"
  ON events FOR ALL
  USING (public.is_org_officer(organization_id));

CREATE POLICY "Admins can manage all events"
  ON events FOR ALL
  USING (public.get_my_role() = 'admin');


DROP POLICY IF EXISTS "Users can view their own participations" ON event_participations;
DROP POLICY IF EXISTS "Users can register for events" ON event_participations;
DROP POLICY IF EXISTS "Officers can view event participations" ON event_participations;

CREATE POLICY "Users can view their own participations"
  ON event_participations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can register for events"
  ON event_participations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Officers can view event participations"
  ON event_participations FOR SELECT
  USING (
    public.is_org_officer(
      (SELECT organization_id FROM events WHERE events.id = event_participations.event_id)
    )
  );

DROP POLICY IF EXISTS "Members can view active elections" ON elections;
DROP POLICY IF EXISTS "Admins can manage elections" ON elections;

CREATE POLICY "Members can view active elections"
  ON elections FOR SELECT
  USING (
    status = 'voting'
    AND public.is_org_member(organization_id)
  );

CREATE POLICY "Admins can manage elections"
  ON elections FOR ALL
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Members can view candidates in active elections" ON candidates;
DROP POLICY IF EXISTS "Members can register as candidates" ON candidates;
DROP POLICY IF EXISTS "Admins can manage candidates" ON candidates;

CREATE POLICY "Members can view candidates in active elections"
  ON candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM elections
      WHERE elections.id = candidates.election_id
        AND elections.status = 'voting'
    )
  );

CREATE POLICY "Members can register as candidates"
  ON candidates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage candidates"
  ON candidates FOR ALL
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "No one can read votes directly" ON votes;
DROP POLICY IF EXISTS "Admins can view vote aggregates (via functions)" ON votes;

CREATE POLICY "No one can read votes directly"
  ON votes FOR SELECT
  USING (false);

CREATE POLICY "Admins can view vote aggregates (via functions)"
  ON votes FOR SELECT
  USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Officers can view their org accreditations" ON accreditations;
DROP POLICY IF EXISTS "Officers can submit accreditations" ON accreditations;
DROP POLICY IF EXISTS "Admins can manage all accreditations" ON accreditations;

CREATE POLICY "Officers can view their org accreditations"
  ON accreditations FOR SELECT
  USING (public.is_org_officer(organization_id));

CREATE POLICY "Officers can submit accreditations"
  ON accreditations FOR INSERT
  WITH CHECK (public.is_org_officer(organization_id));

CREATE POLICY "Admins can manage all accreditations"
  ON accreditations FOR ALL
  USING (public.get_my_role() = 'admin');


DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'recruitment_requests') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Officers can manage recruitment requests" ON recruitment_requests';
    EXECUTE 'DROP POLICY IF EXISTS "Admins can manage all recruitment requests" ON recruitment_requests';

    EXECUTE '
      CREATE POLICY "Officers can manage recruitment requests"
        ON recruitment_requests FOR ALL
        USING (public.is_org_officer(organization_id))';

    EXECUTE '
      CREATE POLICY "Admins can manage all recruitment requests"
        ON recruitment_requests FOR ALL
        USING (public.get_my_role() = ''admin'')';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.promote_student_on_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'approved') THEN
      UPDATE profiles
      SET role = 'officer'
      WHERE id = NEW.user_id
        AND role = 'student';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_membership_approved ON memberships;
CREATE TRIGGER on_membership_approved
  AFTER INSERT OR UPDATE ON memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.promote_student_on_approval();

UPDATE profiles
SET role = 'officer'
WHERE role = 'student'
  AND id IN (
    SELECT DISTINCT user_id FROM memberships WHERE status = 'approved'
  );


-- 6. FROM db/recruitment_migration.sql
CREATE TABLE IF NOT EXISTS recruitment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recruitment_org ON recruitment_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_recruitment_active ON recruitment_requests(is_active);

ALTER TABLE recruitment_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view active recruitment requests" ON recruitment_requests;
DROP POLICY IF EXISTS "Officers can manage recruitment requests" ON recruitment_requests;
DROP POLICY IF EXISTS "Admins can manage all recruitment requests" ON recruitment_requests;


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


-- 7. FROM supabase/migrations/election_notification_updates.sql (Part 2)
-- ============================================================================
-- NOTIFICATION STATUS UPDATE
-- Add status column with enum (unread, read, archived) to replace is_read
-- ============================================================================

-- Create notification_status enum
DO $$ BEGIN
    CREATE TYPE notification_status AS ENUM ('unread', 'read', 'archived');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add the new status column
ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS status notification_status DEFAULT 'unread';

-- Migrate existing is_read data to new status column
UPDATE notifications 
SET status = CASE 
    WHEN is_read = true THEN 'read'::notification_status
    ELSE 'unread'::notification_status
END
WHERE status IS NULL;

-- Set NOT NULL constraint after migration
ALTER TABLE notifications 
    ALTER COLUMN status SET NOT NULL;

-- Keep is_read for backward compatibility but it will be deprecated
-- We won't drop it to avoid breaking existing code during migration

-- ============================================================================
-- ELECTION DESCRIPTION COLUMN (ensure it exists)
-- ============================================================================
ALTER TABLE elections ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE elections ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================================================
-- UPDATE RLS POLICIES FOR ELECTIONS
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view active elections" ON elections;
DROP POLICY IF EXISTS "Members can view published and voting elections" ON elections;
DROP POLICY IF EXISTS "Anyone can view published elections" ON elections;

-- Policy: Members can view their organization's elections in any status
CREATE POLICY "Members can view org elections" ON elections
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE memberships.organization_id = elections.organization_id
              AND memberships.user_id = auth.uid()
              AND memberships.status = 'approved'
        )
    );

-- Policy: Anyone can view published and voting elections (Homepage visibility)
CREATE POLICY "Anyone can view public elections" ON elections
    FOR SELECT USING (
        status IN ('published', 'voting', 'closed')
    );

-- ============================================================================
-- UPDATE CANDIDATE RLS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Members can view candidates in active elections" ON candidates;

-- Members can view candidates in elections that are not draft
CREATE POLICY "Members can view candidates" ON candidates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM elections
            WHERE elections.id = candidates.election_id
              AND elections.status IN ('published', 'voting', 'closed')
        )
    );

-- ============================================================================
-- UPDATE ELECTION NOTIFICATION TRIGGER
-- Notify when election status changes to 'voting' instead of 'active'
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_org_followers_on_election()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify when election enters voting phase
    IF NEW.status = 'voting' AND (OLD.status IS NULL OR OLD.status != 'voting') THEN
        INSERT INTO notifications (user_id, type, title, message, link, status)
        SELECT 
            user_id, 
            'election_started', 
            NEW.title || ' - Voting Now Open', 
            COALESCE(NEW.description, 'Cast your vote in this election!'), 
            '/dashboard/elections/' || NEW.id,
            'unread'
        FROM organization_follows
        WHERE organization_id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- ELECTION RESULTS NOTIFICATION TRIGGER
-- Notify org members when election is closed
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_org_members_on_election_close()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'closed' AND (OLD.status IS NULL OR OLD.status != 'closed') THEN
        INSERT INTO notifications (user_id, type, title, message, link, status)
        SELECT 
            m.user_id, 
            'election_results', 
            NEW.title || ' - Results Available', 
            'The election has ended. View the official results now.', 
            '/dashboard/elections/' || NEW.id,
            'unread'
        FROM memberships m
        WHERE m.organization_id = NEW.organization_id
          AND m.status = 'approved';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS election_closed_trigger ON elections;
CREATE TRIGGER election_closed_trigger
AFTER UPDATE ON elections
FOR EACH ROW EXECUTE FUNCTION notify_org_members_on_election_close();

-- ============================================================================
-- CREATE INDEX FOR NOTIFICATION STATUS
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);


-- 8. FROM supabase/migrations/notifications_triggers.sql
-- Create function to notify followers when a new event is published
CREATE OR REPLACE FUNCTION notify_org_followers_on_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        SELECT 
            user_id, 
            'event_created', 
            NEW.title, 
            NEW.description, 
            '/dashboard/events/' || NEW.id
        FROM organization_follows
        WHERE organization_id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS event_published_trigger ON events;
CREATE TRIGGER event_published_trigger
AFTER INSERT OR UPDATE ON events
FOR EACH ROW EXECUTE FUNCTION notify_org_followers_on_event();

-- Create function to notify followers when a new news article is published
CREATE OR REPLACE FUNCTION notify_org_followers_on_news()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        SELECT 
            user_id, 
            'news_published', 
            NEW.title, 
            left(NEW.content, 100), 
            '/dashboard/news/' || NEW.id
        FROM organization_follows
        WHERE organization_id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS news_published_trigger ON news;
CREATE TRIGGER news_published_trigger
AFTER INSERT OR UPDATE ON news
FOR EACH ROW EXECUTE FUNCTION notify_org_followers_on_news();

