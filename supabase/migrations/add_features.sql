DO $$ BEGIN
    CREATE TYPE news_status AS ENUM ('draft', 'pending', 'published', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS news (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    status news_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published news" ON news
    FOR SELECT USING (status = 'published');

CREATE POLICY "Officers can view all news for their org" ON news
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = news.organization_id
            AND role = 'officer'
        )
    );

CREATE POLICY "Officers can insert news for their org" ON news
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = news.organization_id
            AND role = 'officer'
        )
    );

CREATE POLICY "Officers can update news for their org" ON news
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = news.organization_id
            AND role = 'officer'
        )
    );

CREATE POLICY "Officers can delete news for their org" ON news
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM memberships
            WHERE user_id = auth.uid()
            AND organization_id = news.organization_id
            AND role = 'officer'
        )
    );

CREATE POLICY "Admins can do everything on news" ON news
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS cover_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS mission TEXT,
    ADD COLUMN IF NOT EXISTS vision TEXT,
    ADD COLUMN IF NOT EXISTS core_values TEXT;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS phone_number TEXT,
    ADD COLUMN IF NOT EXISTS website_url TEXT,
    ADD COLUMN IF NOT EXISTS social_links JSONB;

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('organization-assets', 'organization-assets', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('news-images', 'news-images', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public avatars access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Public organization-assets access" ON storage.objects FOR SELECT USING (bucket_id = 'organization-assets');
CREATE POLICY "Authenticated users can upload organization-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update organization-assets" ON storage.objects FOR UPDATE USING (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete organization-assets" ON storage.objects FOR DELETE USING (bucket_id = 'organization-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Public news-images access" ON storage.objects FOR SELECT USING (bucket_id = 'news-images');
CREATE POLICY "Authenticated users can upload news-images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'news-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update news-images" ON storage.objects FOR UPDATE USING (bucket_id = 'news-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete news-images" ON storage.objects FOR DELETE USING (bucket_id = 'news-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own memberships" ON memberships FOR DELETE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION revert_officer_role()
RETURNS TRIGGER AS $$
DECLARE
    target_user_id UUID;
    remaining_count INT;
    current_role TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_user_id := OLD.user_id;
    ELSE
        target_user_id := OLD.user_id;
    END IF;

    SELECT role INTO current_role FROM profiles WHERE id = target_user_id;

    IF current_role IS NULL OR current_role = 'admin' THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    SELECT COUNT(*) INTO remaining_count
    FROM memberships
    WHERE user_id = target_user_id
      AND role = 'officer'
      AND status = 'approved';

    IF remaining_count = 0 THEN
        UPDATE profiles SET role = 'student' WHERE id = target_user_id AND role != 'admin';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_revert_officer_role ON memberships;
CREATE TRIGGER trigger_revert_officer_role
AFTER DELETE OR UPDATE ON memberships
FOR EACH ROW
EXECUTE FUNCTION revert_officer_role();