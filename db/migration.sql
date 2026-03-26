CREATE TYPE user_role AS ENUM ('student', 'officer', 'admin');
CREATE TYPE membership_role AS ENUM ('member', 'officer');
CREATE TYPE membership_status AS ENUM ('pending', 'approved');
CREATE TYPE org_visibility AS ENUM ('public', 'private');
CREATE TYPE accreditation_status AS ENUM ('pending', 'approved', 'rejected', 'expired');
CREATE TYPE event_status AS ENUM ('draft', 'published', 'cancelled', 'completed');
CREATE TYPE election_status AS ENUM ('draft', 'active', 'closed');
CREATE TYPE participation_status AS ENUM ('registered', 'attended', 'absent');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  student_number TEXT UNIQUE NOT NULL,
  program TEXT NOT NULL DEFAULT '',
  year_level INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  visibility org_visibility NOT NULL DEFAULT 'public',
  accreditation_status accreditation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'member',
  status membership_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_datetime TIMESTAMPTZ NOT NULL,
  end_datetime TIMESTAMPTZ,
  location TEXT NOT NULL DEFAULT '',
  status event_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status participation_status NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status election_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(election_id, user_id)
);

CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(election_id, membership_id)
);

CREATE TABLE accreditations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  academic_year TEXT NOT NULL,
  status accreditation_status NOT NULL DEFAULT 'pending',
  documents_url TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id)
);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE
      WHEN NEW.raw_user_meta_data->>'registration_type' = 'faculty' THEN 'admin'::user_role
      ELSE 'student'::user_role
    END
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Profiles readable for org member names"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.user_id = profiles.id
    )
  );

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own student record"
  ON students FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own student record"
  ON students FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own student record"
  ON students FOR UPDATE
  USING (auth.uid() = id);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public organizations"
  ON organizations FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Members can view their private organizations"
  ON organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage organizations"
  ON organizations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own memberships"
  ON memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can request to join organizations"
  ON memberships FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Officers can view org memberships"
  ON memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships AS m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'officer'
        AND m.status = 'approved'
    )
  );

CREATE POLICY "Officers can update org memberships"
  ON memberships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM memberships AS m
      WHERE m.organization_id = memberships.organization_id
        AND m.user_id = auth.uid()
        AND m.role = 'officer'
        AND m.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage all memberships"
  ON memberships FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published events"
  ON events FOR SELECT
  USING (status = 'published');

CREATE POLICY "Officers can manage org events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = events.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'officer'
        AND memberships.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage all events"
  ON events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE event_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own participations"
  ON event_participations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can register for events"
  ON event_participations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Officers can view event participations"
  ON event_participations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events
      JOIN memberships ON memberships.organization_id = events.organization_id
      WHERE events.id = event_participations.event_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'officer'
        AND memberships.status = 'approved'
    )
  );

ALTER TABLE elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view active elections"
  ON elections FOR SELECT
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = elections.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage elections"
  ON elections FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

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
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No one can read votes directly"
  ON votes FOR SELECT
  USING (false);

CREATE POLICY "Admins can view vote aggregates (via functions)"
  ON votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


ALTER TABLE accreditations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Officers can view their org accreditations"
  ON accreditations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = accreditations.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'officer'
        AND memberships.status = 'approved'
    )
  );

CREATE POLICY "Officers can submit accreditations"
  ON accreditations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = accreditations.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'officer'
        AND memberships.status = 'approved'
    )
  );

CREATE POLICY "Admins can manage all accreditations"
  ON accreditations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE INDEX idx_memberships_user ON memberships(user_id);
CREATE INDEX idx_memberships_org ON memberships(organization_id);
CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_event_participations_event ON event_participations(event_id);
CREATE INDEX idx_event_participations_user ON event_participations(user_id);
CREATE INDEX idx_elections_org ON elections(organization_id);
CREATE INDEX idx_candidates_election ON candidates(election_id);
CREATE INDEX idx_votes_election ON votes(election_id);
CREATE INDEX idx_accreditations_org ON accreditations(organization_id);
