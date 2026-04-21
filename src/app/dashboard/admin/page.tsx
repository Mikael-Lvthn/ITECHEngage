import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminPanelClient from "./AdminPanelClient";

export default async function AdminPage() {
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
    ]);

    const pendingEventsCount = pendingEventsResult.data?.length ?? 0;

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
                stats={{
                    totalUsers: usersResult.count ?? 0,
                    totalOrgs: orgsResult.count ?? 0,
                    pendingMemberships: pendingMembershipsResult.count ?? 0,
                    pendingEventsCount,
                }}
            />
        </div>
    );
}
