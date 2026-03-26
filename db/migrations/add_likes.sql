CREATE TABLE IF NOT EXISTS news_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    news_id UUID NOT NULL REFERENCES news(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(news_id, user_id)
);

CREATE TABLE IF NOT EXISTS event_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_news_likes_news_id ON news_likes(news_id);
CREATE INDEX IF NOT EXISTS idx_news_likes_user_id ON news_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_event_id ON event_likes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_likes_user_id ON event_likes(user_id);

ALTER TABLE news_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view news likes"
    ON news_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own news likes"
    ON news_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own news likes"
    ON news_likes FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view event likes"
    ON event_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert their own event likes"
    ON event_likes FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own event likes"
    ON event_likes FOR DELETE
    USING (auth.uid() = user_id);
