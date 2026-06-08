import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OfficerPanelClient from "./OfficerPanelClient";

export default async function OfficerPanelPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Check if user has a hierarchy_level <= 2 role assignment
    const { data: topRoles } = await supabase
        .from("organization_roles")
        .select("id, title, hierarchy_level, organization_id, organizations(id, name)")
        .eq("assigned_user_id", user.id)
        .lte("hierarchy_level", 2)
        .order("hierarchy_level", { ascending: true });

    if (!topRoles || topRoles.length === 0) {
        redirect("/dashboard");
    }

    // Get unique org IDs where user holds top-level roles
    const orgIds = [...new Set(topRoles.map((r) => r.organization_id))];
    const orgNames = topRoles.reduce((acc, r) => {
        const org = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
        if (org) acc[r.organization_id] = org.name;
        return acc;
    }, {} as Record<string, string>);

    // Fetch data scoped to these organizations
    const [
        pendingMembershipsResult,
        pendingLeaveResult,
        pendingEventsResult,
        pendingNewsResult,
    ] = await Promise.all([
        // Pending membership requests
        supabase
            .from("memberships")
            .select("id, user_id, organization_id, status, created_at, profiles(full_name, email), organizations(name)")
            .in("organization_id", orgIds)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
        // Pending leave requests
        supabase
            .from("leave_requests")
            .select("id, user_id, organization_id, status, created_at, profiles!leave_requests_user_id_fkey(full_name, email), organizations(name)")
            .in("organization_id", orgIds)
            .eq("status", "pending")
            .order("created_at", { ascending: false }),
        // Draft/pending events
        supabase
            .from("events")
            .select("id, title, description, start_datetime, location, status, organization_id, organizations(name)")
            .in("organization_id", orgIds)
            .in("status", ["draft", "pending"])
            .order("created_at", { ascending: false }),
        // Draft/pending news
        supabase
            .from("news")
            .select("id, title, content, status, organization_id, created_at, organizations(name)")
            .in("organization_id", orgIds)
            .in("status", ["draft", "pending"])
            .order("created_at", { ascending: false }),
    ]);

    // Fetch approved members separately for better control/debugging
    const rosterResults = await Promise.all(
        orgIds.map((orgId) => supabase.rpc("get_org_full_roster", { org_id: orgId }))
    );
    const approvedMembersData = rosterResults.flatMap((r) => r.data || []);

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const normalize = (item: any) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
        organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
    });

    const normalizedApprovedMembers = approvedMembersData.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        organization_id: item.organization_id,
        role: item.role,
        created_at: item.created_at,
        profiles: {
            full_name: item.full_name,
            email: item.email,
            avatar_url: item.avatar_url
        },
        organizations: {
            name: item.org_name
        }
    }));

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Officer Panel</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your organization{orgIds.length > 1 ? "s" : ""}: {Object.values(orgNames).join(", ")}
                    </p>
                </div>
            </div>

            <OfficerPanelClient
                pendingMemberships={(pendingMembershipsResult.data || []).map(normalize) as any}
                pendingLeaveRequests={(pendingLeaveResult.data || []).map(normalize) as any}
                pendingEvents={(pendingEventsResult.data || []).map(normalize) as any}
                pendingNews={(pendingNewsResult.data || []).map(normalize) as any}
                approvedMembers={normalizedApprovedMembers as any}
                organizations={orgIds.map((id) => ({ id, name: orgNames[id] || "Unknown" }))}
            />
        </div>
    );
}
