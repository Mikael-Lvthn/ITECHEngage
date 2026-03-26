import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewsAndEventsClient from "./NewsAndEventsClient";

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

    if (userRole !== "admin") {
        const { data: officerships } = await supabase
            .from("memberships")
            .select("id")
            .eq("user_id", user.id)
            .eq("role", "officer")
            .eq("status", "approved")
            .limit(1);

        if (officerships && officerships.length > 0) {
            userRole = "officer";
        } else {
            userRole = "student";
        }
    }

    const { data: officerMemberships } = await supabase
        .from("memberships")
        .select("organization_id, organizations(name)")
        .eq("user_id", user.id)
        .eq("role", "officer")
        .eq("status", "approved");

    const isOfficer = userRole === "officer";
    const isAdmin = userRole === "admin";
    const canCreate = isOfficer || isAdmin;

    let news: any[] = [];
    let events: any[] = [];

    if (isAdmin) {
        const { data: allNews } = await supabase
            .from("news")
            .select("*, organizations(name)")
            .order("created_at", { ascending: false });
        news = allNews || [];

        const { data: allEvents } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, organization_id, organizations(name)")
            .order("created_at", { ascending: false });
        events = allEvents || [];
    } else if (isOfficer && officerMemberships && officerMemberships.length > 0) {
        const orgIds = officerMemberships.map(m => m.organization_id);

        const { data: orgNews } = await supabase
            .from("news")
            .select("*, organizations(name)")
            .in("organization_id", orgIds)
            .order("created_at", { ascending: false });
        news = orgNews || [];

        const { data: orgEvents } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, organization_id, organizations(name)")
            .in("organization_id", orgIds)
            .order("created_at", { ascending: false });
        events = orgEvents || [];
    } else {
        const { data: pubNews } = await supabase
            .from("news")
            .select("*, organizations(name)")
            .eq("status", "published")
            .order("created_at", { ascending: false });
        news = pubNews || [];

        const { data: pubEvents } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, organization_id, organizations(name)")
            .eq("status", "published")
            .order("created_at", { ascending: false });
        events = pubEvents || [];
    }

    let userOrganizations: { id: string; name: string }[] = [];

    if (isAdmin) {
        const { data: allOrgs } = await supabase
            .from("organizations")
            .select("id, name")
            .order("name");
        userOrganizations = (allOrgs || []).map(o => ({ id: o.id, name: o.name }));
    } else if (isOfficer && officerMemberships) {
        userOrganizations = officerMemberships.map(m => ({
            id: m.organization_id,
            name: (m.organizations as any)?.name
        }));
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">News & Events</h1>
                    <p className="text-gray-500 mt-1">
                        {isAdmin
                            ? "Manage and approve all news and events across the platform."
                            : isOfficer
                                ? "Create and manage your organization's announcements and activities."
                                : "Browse the latest news and upcoming events."}
                    </p>
                </div>
            </div>

            <NewsAndEventsClient
                initialNews={news}
                initialEvents={events as any}
                userOrganizations={userOrganizations}
                userRole={userRole}
                canCreate={canCreate}
            />
        </div>
    );
}
