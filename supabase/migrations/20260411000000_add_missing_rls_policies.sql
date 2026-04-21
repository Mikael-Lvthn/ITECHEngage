-- =================================================================
-- ADD MISSING RLS POLICIES FOR CRITICAL TABLES
-- =================================================================
-- This migration adds RLS policies for 5 tables that were missing them:
-- 1. notifications - User isolation
-- 2. news - Status-based + creator access
-- 3. organization_follows - User isolation
-- 4. organization_roles - Officer access only
-- 5. user_preferences - User isolation
-- =================================================================

-- ========================
-- 1. NOTIFICATIONS TABLE
-- ========================
-- Enable RLS (should already be enabled)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can manage their own notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can view all notifications" ON notifications;

-- Only users can see their own notifications (READ)
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Only users can update/delete their own notifications (UPDATE)
CREATE POLICY "Users can manage their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Only users can delete their own notifications (DELETE)
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (user_id = auth.uid());

-- Admins can view all notifications (audit purposes)
CREATE POLICY "Admins can view all notifications"
  ON notifications FOR SELECT
  USING (public.get_my_role() = 'admin');

-- Notification inserts are handled by triggers (SECURITY DEFINER), so no INSERT policy needed

-- ========================
-- 2. NEWS TABLE
-- ========================
-- Enable RLS
ALTER TABLE news ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view published news" ON news;
DROP POLICY IF EXISTS "Creators can view their own news" ON news;
DROP POLICY IF EXISTS "Officers can manage org news" ON news;
DROP POLICY IF EXISTS "Admins can manage all news" ON news;

-- Anyone can view published news
CREATE POLICY "Anyone can view published news"
  ON news FOR SELECT
  USING (status = 'published');

-- Creators can view/edit their own news (any status)
CREATE POLICY "Creators can view their own news"
  ON news FOR SELECT
  USING (created_by = auth.uid());

-- Officers can create and manage organization news
CREATE POLICY "Officers can manage org news"
  ON news FOR ALL
  USING (public.is_org_officer(organization_id));

-- Admins can manage all news
CREATE POLICY "Admins can manage all news"
  ON news FOR ALL
  USING (public.get_my_role() = 'admin');

-- ========================
-- 3. ORGANIZATION_FOLLOWS TABLE
-- ========================
-- Enable RLS
ALTER TABLE organization_follows ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own follows" ON organization_follows;
DROP POLICY IF EXISTS "Users can manage their own follows" ON organization_follows;
DROP POLICY IF EXISTS "Anyone can see who follows public organizations" ON organization_follows;

-- Users can only see their own follows
CREATE POLICY "Users can view their own follows"
  ON organization_follows FOR SELECT
  USING (user_id = auth.uid());

-- Users can follow/unfollow (only their own)
CREATE POLICY "Users can manage their own follows"
  ON organization_follows FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all follows
CREATE POLICY "Admins can view all follows"
  ON organization_follows FOR SELECT
  USING (public.get_my_role() = 'admin');

-- ========================
-- 4. ORGANIZATION_ROLES TABLE
-- ========================
-- Enable RLS
ALTER TABLE organization_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Officers can manage organization roles" ON organization_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON organization_roles;
DROP POLICY IF EXISTS "Organization members can view roles" ON organization_roles;

-- Members can view roles in their organization
CREATE POLICY "Organization members can view roles"
  ON organization_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = organization_roles.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.status = 'approved'
    )
  );

-- Officers can manage roles in their organization
CREATE POLICY "Officers can manage organization roles"
  ON organization_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM memberships
      WHERE memberships.organization_id = organization_roles.organization_id
        AND memberships.user_id = auth.uid()
        AND memberships.role = 'officer'
        AND memberships.status = 'approved'
    )
  );

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles"
  ON organization_roles FOR ALL
  USING (public.get_my_role() = 'admin');

-- ========================
-- 5. USER_PREFERENCES TABLE
-- ========================
-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Admins can view all preferences" ON user_preferences;

-- Users can only see their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (user_id = auth.uid());

-- Users can manage their own preferences
CREATE POLICY "Users can manage their own preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid());

-- Admins can view all preferences (for support/debugging)
CREATE POLICY "Admins can view all preferences"
  ON user_preferences FOR SELECT
  USING (public.get_my_role() = 'admin');

-- =================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =================================================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_news_status ON news(status);
CREATE INDEX IF NOT EXISTS idx_news_org ON news(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_follows_user ON organization_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_org_follows_org ON organization_follows(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_roles_org ON organization_roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);

-- =================================================================
-- VERIFY RLS IS ENABLED ON ALL TABLES
-- =================================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
