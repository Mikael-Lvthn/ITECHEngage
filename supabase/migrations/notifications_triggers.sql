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

-- Create function to notify followers when an election is created (active)
CREATE OR REPLACE FUNCTION notify_org_followers_on_election()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
        INSERT INTO notifications (user_id, type, title, message, link)
        SELECT 
            user_id, 
            'election_started', 
            NEW.title, 
            NEW.description, 
            '/dashboard/elections/' || NEW.id
        FROM organization_follows
        WHERE organization_id = NEW.organization_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS election_started_trigger ON elections;
CREATE TRIGGER election_started_trigger
AFTER INSERT OR UPDATE ON elections
FOR EACH ROW EXECUTE FUNCTION notify_org_followers_on_election();
