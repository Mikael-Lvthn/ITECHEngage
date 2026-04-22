import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPanelClient from "./AdminPanelClient";

interface Props {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminPage({ searchParams }: Props) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        redirect("/dashboard");
    }

    // Read org filter from search params
    const params = await searchParams;
    const orgFilter = (params?.org as string) || "all";

    // Build leave request queries with optional org filter
    let pendingLeaveQuery = supabase
        .from("leave_requests")
        .select("id, user_id, organization_id, status, created_at, designated_approver_id, profiles!leave_requests_user_id_fkey(full_name, email), organizations(id, name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(50);

    let leaveHistoryQuery = supabase
        .from("leave_requests")
        .select("id, user_id, organization_id, status, created_at, reviewed_at, actioned_by_id, profiles!leave_requests_user_id_fkey(full_name, email), organizations(id, name)")
        .neq("status", "pending")
        .order("reviewed_at", { ascending: false })
        .limit(30);

    if (orgFilter !== "all") {
        pendingLeaveQuery = pendingLeaveQuery.eq("organization_id", orgFilter);
        leaveHistoryQuery = leaveHistoryQuery.eq("organization_id", orgFilter);
    }

    // Parallel data fetching for all tabs
    const [
        usersResult,
        orgsResult,
        pendingMembershipsResult,
        membershipRequestsResult,
        pendingEventsResult,
        pendingAccreditationsResult,
        auditLogsResult,
        categoriesResult,
        organizationsListResult,
        pendingLeaveResult,
        leaveHistoryResult,
    ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("organizations").select("*", { count: "exact", head: true }),
        supabase.from("memberships").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase
            .from("memberships")
            .select("id, user_id, organization_id, status, created_at, profiles(full_name, email), organizations(name)")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("events")
            .select("id, title, description, start_datetime, location, status, organizations(name)")
            .in("status", ["draft", "pending"])
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("accreditations")
            .select("id, organization_id, status, created_at, organizations(name)")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("audit_logs")
            .select("id, actor_id, action, entity_type, entity_id, metadata, created_at, profiles(full_name)")
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("organization_categories")
            .select("*")
            .order("name"),
        // Organizations list for filter dropdown
        supabase
            .from("organizations")
            .select("id, name")
            .order("name"),
        // Leave requests
        pendingLeaveQuery,
        leaveHistoryQuery,
    ]);

    const pendingEventsCount = pendingEventsResult.data?.length ?? 0;
    const pendingLeaveCount = pendingLeaveResult.data?.length ?? 0;

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage organizations, events, members, and system configuration.
                    </p>
                </div>
            </div>

            <AdminPanelClient
                membershipRequests={(membershipRequestsResult.data as any) || []}
                pendingEvents={(pendingEventsResult.data as any) || []}
                pendingAccreditations={(pendingAccreditationsResult.data as any) || []}
                auditLogs={(auditLogsResult.data as any) || []}
                categories={(categoriesResult.data as any) || []}
                organizations={(organizationsListResult.data as any) || []}
                pendingLeaveRequests={(pendingLeaveResult.data as any) || []}
                leaveHistory={(leaveHistoryResult.data as any) || []}
                stats={{
                    totalUsers: usersResult.count ?? 0,
                    totalOrgs: orgsResult.count ?? 0,
                    pendingMemberships: pendingMembershipsResult.count ?? 0,
                    pendingEventsCount,
                    pendingLeaveCount,
                }}
            />
        </div>
    );
}
