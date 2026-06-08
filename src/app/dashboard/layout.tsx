import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const [profileResult, prefsResult, officerResult, orgRoleResult] = await Promise.all([
        supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single(),
        supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("memberships")
            .select("id")
            .eq("user_id", user.id)
            .eq("role", "officer")
            .eq("status", "approved")
            .limit(1),
        // Also check organization_roles for structural role assignments
        supabase
            .from("organization_roles")
            .select("id")
            .eq("assigned_user_id", user.id)
            .limit(1),
    ]);

    const profile = profileResult.data;
    const prefs = prefsResult.data;
    const officerships = officerResult.data;
    const orgRoleAssignments = orgRoleResult.data;

    let userRole: UserRole = (profile?.role as UserRole) || "student";
    const userName: string = profile?.full_name || "User";

    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) {
            userRole = rpcRole as UserRole;
        }
    }

    if (userRole !== "admin") {
        if ((officerships && officerships.length > 0) || (orgRoleAssignments && orgRoleAssignments.length > 0)) {
            userRole = "officer";
        } else {
            userRole = "student";
        }
    }

    const userEmail: string = user.email || "";

    // Fetch badge counts for Admin Panel and Officer Panel
    let adminBadgeCount = 0;
    let officerBadgeCount = 0;

    if (userRole === "admin") {
        const [pendingMembers, pendingLeave, pendingEvents, pendingNews] = await Promise.all([
            supabase.from("memberships").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("leave_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
            supabase.from("events").select("*", { count: "exact", head: true }).in("status", ["draft", "pending"]),
            supabase.from("news").select("*", { count: "exact", head: true }).in("status", ["draft", "pending"]),
        ]);
        adminBadgeCount = (pendingMembers.count ?? 0) + (pendingLeave.count ?? 0) + (pendingEvents.count ?? 0) + (pendingNews.count ?? 0);
    }

    if (userRole === "officer") {
        // Get org IDs where user has a top-level role
        const { data: userOrgRoles } = await supabase
            .from("organization_roles")
            .select("organization_id")
            .eq("assigned_user_id", user.id)
            .lte("hierarchy_level", 2);

        const officerOrgIds = [...new Set((userOrgRoles || []).map(r => r.organization_id))];

        if (officerOrgIds.length > 0) {
            const [pendingMembers, pendingLeave] = await Promise.all([
                supabase.from("memberships").select("*", { count: "exact", head: true }).in("organization_id", officerOrgIds).eq("status", "pending"),
                supabase.from("leave_requests").select("*", { count: "exact", head: true }).in("organization_id", officerOrgIds).eq("status", "pending"),
            ]);
            officerBadgeCount = (pendingMembers.count ?? 0) + (pendingLeave.count ?? 0);
        }
    }

    return (
        <ThemeProvider initialPrefs={prefs}>
            <div className="min-h-screen bg-background">
                <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} adminBadgeCount={adminBadgeCount} officerBadgeCount={officerBadgeCount} />

                <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm sticky top-0 z-30">
                    <MobileNav userRole={userRole} userName={userName} userEmail={userEmail} adminBadgeCount={adminBadgeCount} officerBadgeCount={officerBadgeCount} />
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">iE</span>
                        <span className="text-sm font-semibold">ITECHEngage</span>
                    </div>
                    <div className="w-10" />
                </div>

                <main className="lg:pl-64">
                    <div className="max-w-6xl mx-auto p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </ThemeProvider>
    );
}
