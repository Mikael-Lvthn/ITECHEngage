import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewsAndEventsClient, { NewsItem, EventItem } from "./NewsAndEventsClient";

export default async function NewsAndEventsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    let userRole = profile?.role || "student";

    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) userRole = rpcRole;
    }

    const isAdmin = userRole === "admin";

    // Use organization_roles (structural roles) to determine officer status
    const { data: structuralRoles } = await supabase
        .from("organization_roles")
        .select("organization_id, organizations(name)")
        .eq("assigned_user_id", user.id);

    const hasStructuralRole = structuralRoles && structuralRoles.length > 0;

    if (!isAdmin && hasStructuralRole) {
        userRole = "officer";
    } else if (!isAdmin) {
        userRole = "student";
    }

    const isOfficer = userRole === "officer";
    const canCreate = isAdmin || hasStructuralRole;

    let news: NewsItem[] = [];
    let events: EventItem[] = [];

    if (isAdmin) {
        const { data: allNews } = await supabase
            .from("news")
            .select("*, organizations(name)")
            .order("created_at", { ascending: false });
        news = (allNews || []).map(item => ({
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        })) as NewsItem[];

        const { data: allEvents } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, created_by, organization_id, organizations(name)")
            .order("created_at", { ascending: false });
        events = (allEvents || []).map(item => ({
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        })) as EventItem[];
    } else if (isOfficer && structuralRoles && structuralRoles.length > 0) {
        const orgIds = structuralRoles.map(r => r.organization_id);

        const { data: orgNews } = await supabase
            .from("news")
            .select("*, organizations(name)")
            .in("organization_id", orgIds)
            .order("created_at", { ascending: false });
        news = (orgNews || []).map(item => ({
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        })) as NewsItem[];

        const { data: orgEvents } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, created_by, organization_id, organizations(name)")
            .in("organization_id", orgIds)
            .order("created_at", { ascending: false });
        events = (orgEvents || []).map(item => ({
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        })) as EventItem[];
    } else {
        const { data: pubNews } = await supabase
            .from("news")
            .select("*, organizations(name)")
            .eq("status", "published")
            .order("created_at", { ascending: false });
        news = (pubNews || []).map(item => ({
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        })) as NewsItem[];

        const { data: pubEvents } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, created_by, organization_id, organizations(name)")
            .eq("status", "published")
            .order("created_at", { ascending: false });
        events = (pubEvents || []).map(item => ({
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
        })) as EventItem[];
    }

    // Build org list for creation dropdown — sourced from structural roles
    let userOrganizations: { id: string; name: string }[] = [];

    if (isAdmin) {
        const { data: allOrgs } = await supabase
            .from("organizations")
            .select("id, name")
            .order("name");
        userOrganizations = (allOrgs || []).map(o => ({ id: o.id, name: o.name }));
    } else if (structuralRoles) {
        const uniqueOrgs = new Map<string, string>();
        for (const r of structuralRoles) {
            const name = (Array.isArray(r.organizations) 
                ? r.organizations[0]?.name 
                : (r.organizations as { name: string } | null)?.name) || "Unknown";
            uniqueOrgs.set(r.organization_id, name);
        }
        userOrganizations = Array.from(uniqueOrgs.entries()).map(([id, name]) => ({
            id,
            name
        }));
    }

    // Subtitle based on role
    const subtitle = isAdmin
        ? "Manage and approve all news and events across the platform."
        : isOfficer
            ? "Create and manage your organization's announcements and activities."
            : "Browse the latest news and upcoming events.";

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">News & Events</h1>
                    <p className="text-muted-foreground mt-1">{subtitle}</p>
                </div>
            </div>

            <NewsAndEventsClient
                initialNews={news}
                initialEvents={events}
                userOrganizations={userOrganizations}
                userRole={userRole}
                canCreate={canCreate ?? false}
                userId={user.id}
            />
        </div>
    );
}
