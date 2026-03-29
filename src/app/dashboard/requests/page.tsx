import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ApproveButton, RejectButton } from "../memberships/MembershipActions";

export default async function RequestsPage() {
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

    let userRole = profile?.role || "student";
    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) userRole = rpcRole;
    }

    let presidentOrgIds: string[] = [];
    if (userRole === "officer") {
        const { data: roles } = await supabase
            .from("organization_roles")
            .select("organization_id")
            .eq("assigned_user_id", user.id)
            .lte("hierarchy_level", 2);
        presidentOrgIds = roles?.map(r => r.organization_id) || [];
    }

    const canManageRequests = userRole === "admin" || presidentOrgIds.length > 0;

    if (!canManageRequests) {
        redirect("/dashboard");
    }

    let pendingQuery = supabase
        .from("memberships")
        .select("id, role, status, created_at, profiles(id, full_name, email), organizations(id, name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
        
    let approvedQuery = supabase
        .from("memberships")
        .select("id, role, status, created_at, profiles(id, full_name, email), organizations(id, name)")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(10);

    if (userRole !== "admin") {
        pendingQuery = pendingQuery.in("organization_id", presidentOrgIds);
        approvedQuery = approvedQuery.in("organization_id", presidentOrgIds);
    }

    const { data: pendingRequests } = await pendingQuery;
    const { data: recentApproved } = await approvedQuery;

    const pending = pendingRequests || [];
    const approved = recentApproved || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Membership Requests</h1>
                <p className="text-muted-foreground mt-1">
                    Approve or reject students requesting to join organizations.
                </p>
            </div>

            <div className="animate-slide-up">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    Pending Requests ({pending.length})
                </h2>
                {pending.length === 0 ? (
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                        <div className="text-center py-16 px-6">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-100 flex items-center justify-center mb-4">
                                <span className="text-3xl">✅</span>
                            </div>
                            <p className="font-semibold">No pending requests</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                All membership requests have been processed.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pending.map((m, i) => {
                            const memberProfile = m.profiles as unknown as { id: string; full_name: string; email: string } | null;
                            const org = m.organizations as unknown as { id: string; name: string } | null;
                            return (
                                <div
                                    key={m.id}
                                    className="rounded-xl border bg-card overflow-hidden card-hover"
                                    style={{ animationDelay: `${i * 60}ms` }}
                                >
                                    <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                                    <div className="p-4 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-[#800000]/10 flex items-center justify-center text-sm font-bold text-[#800000] shrink-0">
                                                {memberProfile?.full_name
                                                    ?.split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .slice(0, 2) || "?"}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-semibold text-sm truncate">
                                                    {memberProfile?.full_name || "Unknown User"}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {memberProfile?.email || ""}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Wants to join{" "}
                                                    <span className="font-medium text-foreground">
                                                        {org?.name || "Unknown Org"}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <ApproveButton membershipId={m.id} />
                                            <RejectButton membershipId={m.id} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {approved.length > 0 && (
                <div className="animate-slide-up delay-2">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Recently Approved ({approved.length})
                    </h2>
                    <div className="space-y-2">
                        {approved.map((m) => {
                            const memberProfile = m.profiles as unknown as { id: string; full_name: string; email: string } | null;
                            const org = m.organizations as unknown as { id: string; name: string } | null;
                            return (
                                <div key={m.id} className="rounded-xl border bg-card p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 shrink-0">
                                        {memberProfile?.full_name
                                            ?.split(" ")
                                            .map((n) => n[0])
                                            .join("")
                                            .toUpperCase()
                                            .slice(0, 2) || "?"}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium truncate">
                                            {memberProfile?.full_name || "Unknown"}{" "}
                                            <span className="text-muted-foreground font-normal">→</span>{" "}
                                            {org?.name || "Unknown Org"}
                                        </p>
                                    </div>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700 shrink-0">
                                        ✓ Approved
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
