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
    status = 'active'
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
        AND elections.status = 'active'
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
