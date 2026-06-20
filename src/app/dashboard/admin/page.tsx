import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
// TEMPORARY auto-approve feature — owner-only toggle card.
import AutoApproveToggle from "./AutoApproveToggle";
import { getAppSettings } from "@/lib/actions/app-settings";
import { OWNER_UID } from "@/lib/app-config";
import AdminPanelClient, {
    MembershipRequest,
    PendingEvent,
    PendingNews,
    PendingAccreditation,
    Category,
    Organization,
    LeaveRequest,
    PendingVerificationUser,
    ManagementUser,
} from "./AdminPanelClient";

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

    // TEMPORARY auto-approve feature: only the owner account sees the toggle card.
    const isOwner = user.id === OWNER_UID;
    const appSettings = isOwner ? await getAppSettings() : null;

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
        .select("id, user_id, organization_id, status, created_at, reviewed_at, actioned_by_id, designated_approver_id, profiles!leave_requests_user_id_fkey(full_name, email), organizations(id, name)")
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
        pendingNewsResult,
        pendingAccreditationsResult,
        categoriesResult,
        organizationsListResult,
        pendingLeaveResult,
        leaveHistoryResult,
        pendingVerificationResult,
        allUsersResult,
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
            .eq("status", "draft")
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("news")
            .select("id, title, content, image_url, status, created_at, organization_id, organizations(name)")
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(50),
        supabase
            .from("accreditations")
            .select("id, organization_id, status, submitted_at, organizations(name)")
            .eq("status", "pending")
            .order("submitted_at", { ascending: false })
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
        supabase
            .from("profiles")
            .select("id, email, full_name, account_status, created_at, students(student_number, course, section, year_level)")
            .eq("account_status", "pending_verification")
            .order("created_at", { ascending: false })
            .limit(50),
        // All users for User Management tab
        supabase
            .from("profiles")
            .select("id, email, full_name, role, account_status, created_at, students(student_number, course, section, year_level)", { count: "exact" })
            .order("created_at", { ascending: false })
            .range(0, 199),
    ]);

    const pendingEventsCount = pendingEventsResult.data?.length ?? 0;
    const pendingNewsCount = pendingNewsResult.data?.length ?? 0;
    const pendingLeaveCount = pendingLeaveResult.data?.length ?? 0;
    const allPendingVerificationUsers = (pendingVerificationResult.data || []).map(item => ({
        ...item,
        students: Array.isArray(item.students) ? item.students[0] : item.students
    })) as PendingVerificationUser[];
    
    const pendingStudents = allPendingVerificationUsers.filter(u => u.students !== null);
    const pendingAdmins = allPendingVerificationUsers.filter(u => u.students === null);
    
    const pendingVerificationCount = pendingStudents.length + pendingAdmins.length;

    const allUsers = (allUsersResult.data || []).map(item => ({
        ...item,
        students: Array.isArray(item.students) ? item.students[0] : item.students
    })) as ManagementUser[];
    const totalUsersCount = allUsersResult.count ?? 0;

    // Supabase returns the profile under an aliased key when using !fkey syntax.
    // This helper normalizes it to the plain `profiles` field that LeaveRequest expects.
    function normalizeLeaveRequest(item: Record<string, unknown>) {
        const rawProfile =
            item['profiles!leave_requests_user_id_fkey'] ||
            item.profiles;
        return {
            ...item,
            profiles: Array.isArray(rawProfile) ? rawProfile[0] : rawProfile,
            organizations: Array.isArray(item.organizations)
                ? (item.organizations as unknown[])[0]
                : item.organizations,
        };
    }

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

            {isOwner && appSettings && <AutoApproveToggle settings={appSettings} />}

            <AdminPanelClient
                membershipRequests={(membershipRequestsResult.data || []).map(item => ({
                    ...item,
                    profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
                    organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
                })) as MembershipRequest[]}
                pendingEvents={(pendingEventsResult.data || []).map(item => ({
                    ...item,
                    organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
                })) as PendingEvent[]}
                pendingNews={(pendingNewsResult.data || []).map(item => ({
                    ...item,
                    organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
                })) as PendingNews[]}
                pendingAccreditations={(pendingAccreditationsResult.data || []).map(item => ({
                    ...item,
                    organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations
                })) as PendingAccreditation[]}
                categories={(categoriesResult.data as Category[]) || []}
                organizations={(organizationsListResult.data as Organization[]) || []}
                pendingLeaveRequests={(pendingLeaveResult.data || []).map(normalizeLeaveRequest) as LeaveRequest[]}
                leaveHistory={(leaveHistoryResult.data || []).map(normalizeLeaveRequest) as LeaveRequest[]}
                pendingStudents={pendingStudents}
                pendingAdmins={pendingAdmins}
                allUsers={allUsers}
                totalUsersCount={totalUsersCount}
                stats={{
                    totalUsers: usersResult.count ?? 0,
                    totalOrgs: orgsResult.count ?? 0,
                    pendingMemberships: pendingMembershipsResult.count ?? 0,
                    pendingEventsCount,
                    pendingNewsCount,
                    pendingLeaveCount,
                    pendingVerificationCount,
                }}
            />
        </div>
    );
}
