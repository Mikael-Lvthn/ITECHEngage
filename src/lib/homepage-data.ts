import "server-only";

import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

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
    description: string | null;
    status: string;
    start_date: string;
    end_date: string | null;
    organization_id: string;
    organizations: RelatedOrganization;
    isFollowed?: boolean;
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
                .select("id, title, description, status, start_date, end_date, organization_id, organizations(name)")
                .in("status", ["published", "voting"])
                .order("start_date", { ascending: false })
                .limit(6),
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
    ["homepage-public-data-v2"],
    {
        revalidate: 180,
        tags: ["homepage-public-data"],
    }
);

// Get elections with follow status for authenticated users
export async function getHomepageElectionsWithFollowStatus(userId: string): Promise<HomepageElection[]> {
    const supabase = await createClient();

    // Get elections that are published or in voting phase
    const { data: elections } = await supabase
        .from("elections")
        .select("id, title, description, status, start_date, end_date, organization_id, organizations(name)")
        .in("status", ["published", "voting"])
        .order("start_date", { ascending: false })
        .limit(12);

    if (!elections || elections.length === 0) {
        return [];
    }

    // Get user's followed organizations
    const { data: follows } = await supabase
        .from("organization_follows")
        .select("organization_id")
        .eq("user_id", userId);

    const followedOrgIds = new Set((follows || []).map(f => f.organization_id));

    // Mark elections as followed or not and sort
    const electionsWithFollow = (elections as HomepageElection[]).map(e => ({
        ...e,
        isFollowed: followedOrgIds.has(e.organization_id),
    }));

    // Sort: followed organizations first, then by start_date
    electionsWithFollow.sort((a, b) => {
        if (a.isFollowed && !b.isFollowed) return -1;
        if (!a.isFollowed && b.isFollowed) return 1;
        return new Date(b.start_date).getTime() - new Date(a.start_date).getTime();
    });

    return electionsWithFollow;
}
