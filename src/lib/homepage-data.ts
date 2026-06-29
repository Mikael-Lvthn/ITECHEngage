import "server-only";

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
    category_id?: string | null;
}

export interface HomepageCategory {
    id: string;
    name: string;
}

export interface HomepageNews {
    id: string;
    title: string;
    content: string;
    image_url: string | null;
    published_at: string | null;
    created_at: string;
    organizations: RelatedOrganization;
    creator?: { full_name: string | null } | { full_name: string | null }[] | null;
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

export interface HomepageRecruitment {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    organization_id: string;
    organizations: RelatedOrganization;
}

export interface HomepagePublicData {
    events: HomepageEvent[];
    organizations: HomepageOrganization[];
    newsItems: HomepageNews[];
    activeElections: HomepageElection[];
    categories: HomepageCategory[];
    recruitments: HomepageRecruitment[];
}

async function fetchHomepagePublicData(): Promise<HomepagePublicData> {
    // Try authenticated client first (works when user is logged in),
    // fall back to public client for anonymous visitors.
    let supabase;
    try {
        supabase = await createClient();
    } catch {
        supabase = createPublicClient();
    }

    const [eventsResult, organizationsResult, newsResult, electionsResult, categoriesResult, recruitmentsResult] =
        await Promise.all([
            supabase
                .from("events")
                .select("id, title, description, start_datetime, location, organizations(name)")
                .eq("status", "published")
                .order("start_datetime", { ascending: true })
                .limit(4),
            supabase
                .from("organizations")
                .select("id, name, description, logo_url, accreditation_status, category_id")
                .eq("visibility", "public")
                .order("name", { ascending: true })
                .limit(6),
            supabase
                .from("news")
                .select("id, title, content, image_url, published_at, created_at, organizations(name), creator:profiles(full_name)")
                .eq("status", "published")
                .order("published_at", { ascending: false, nullsFirst: false })
                .order("created_at", { ascending: false })
                .limit(3),
            supabase
                .from("elections")
                .select("id, title, description, status, start_date, end_date, organization_id, organizations(name)")
                .in("status", ["published", "voting"])
                .order("start_date", { ascending: false })
                .limit(6),
            supabase
                .from("organization_categories")
                .select("id, name")
                .order("name"),
            supabase
                .from("recruitment_requests")
                .select("id, title, description, created_at, organization_id, organizations(name)")
                .eq("is_active", true)
                .order("created_at", { ascending: false })
                .limit(4),
        ]);

    // Debug logging - check terminal for errors
    if (eventsResult.error) console.error("[Homepage] Events error:", eventsResult.error.message);
    if (organizationsResult.error) console.error("[Homepage] Orgs error:", organizationsResult.error.message);
    if (newsResult.error) console.error("[Homepage] News error:", newsResult.error.message);
    if (electionsResult.error) console.error("[Homepage] Elections error:", electionsResult.error.message);
    if (recruitmentsResult.error) console.error("[Homepage] Recruitments error:", recruitmentsResult.error.message);

    return {
        events: (eventsResult.data ?? []) as HomepageEvent[],
        organizations: (organizationsResult.data ?? []) as HomepageOrganization[],
        newsItems: (newsResult.data ?? []) as HomepageNews[],
        activeElections: (electionsResult.data ?? []) as HomepageElection[],
        categories: (categoriesResult.data ?? []) as HomepageCategory[],
        recruitments: (recruitmentsResult.data ?? []) as HomepageRecruitment[],
    };
}

export async function getHomepagePublicData(): Promise<HomepagePublicData> {
    return fetchHomepagePublicData();
}

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
