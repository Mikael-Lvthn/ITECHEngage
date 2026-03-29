import "server-only";

import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

type RelatedOrganization = { name: string | null } | { name: string | null }[] | null;

export interface HomepageEvent {
    id: string;
    title: string;
    description: string | null;
    start_datetime: string;
    location: string;
    organizations: RelatedOrganization;
}

export interface HomepageOrganization {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    accreditation_status: string;
}

export interface HomepageNews {
    id: string;
    title: string;
    content: string;
    published_at: string | null;
    created_at: string;
    organizations: RelatedOrganization;
}

export interface HomepageElection {
    id: string;
    title: string;
    status: string;
    start_date: string;
    end_date: string | null;
    organizations: RelatedOrganization;
}

export interface HomepagePublicData {
    events: HomepageEvent[];
    organizations: HomepageOrganization[];
    newsItems: HomepageNews[];
    activeElections: HomepageElection[];
}

async function fetchHomepagePublicData(): Promise<HomepagePublicData> {
    const supabase = createPublicClient();

    const [eventsResult, organizationsResult, newsResult, electionsResult] =
        await Promise.all([
            supabase
                .from("events")
                .select("id, title, description, start_datetime, location, organizations(name)")
                .eq("status", "published")
                .order("start_datetime", { ascending: true })
                .limit(4),
            supabase
                .from("organizations")
                .select("id, name, description, logo_url, accreditation_status")
                .eq("visibility", "public")
                .order("name", { ascending: true })
                .limit(6),
            supabase
                .from("news")
                .select("id, title, content, published_at, created_at, organizations(name)")
                .eq("status", "published")
                .order("published_at", { ascending: false })
                .limit(3),
            supabase
                .from("elections")
                .select("id, title, status, start_date, end_date, organizations(name)")
                .in("status", ["active", "completed"])
                .order("start_date", { ascending: false })
                .limit(3),
        ]);

    return {
        events: (eventsResult.data ?? []) as HomepageEvent[],
        organizations: (organizationsResult.data ?? []) as HomepageOrganization[],
        newsItems: (newsResult.data ?? []) as HomepageNews[],
        activeElections: (electionsResult.data ?? []) as HomepageElection[],
    };
}

export const getHomepagePublicData = unstable_cache(
    fetchHomepagePublicData,
    ["homepage-public-data-v1"],
    {
        revalidate: 180,
        tags: ["homepage-public-data"],
    }
);
