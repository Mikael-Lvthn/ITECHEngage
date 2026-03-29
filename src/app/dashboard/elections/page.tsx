import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ElectionCard from "@/components/elections/ElectionCard";
import CreateElectionDialog from "@/components/elections/CreateElectionDialog";

export default async function ElectionsPage() {
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

    const isAdmin = userRole === "admin";

    const { data: myOfficerships } = await supabase
        .from("memberships")
        .select("organization_id")
        .eq("user_id", user.id)
        .eq("role", "officer")
        .eq("status", "approved");

    const officerOrgIds = myOfficerships?.map((m) => m.organization_id) || [];

    const { data: elections } = await supabase
        .from("elections")
        .select("*, organizations(name)")
        .order("created_at", { ascending: false });

    const visibleElections = isAdmin
        ? elections || []
        : (elections || []).filter(
            (e) => officerOrgIds.includes(e.organization_id)
        );

    const electionIds = visibleElections.map((e) => e.id);

    let candidateCounts: Record<string, number> = {};
    let roleCounts: Record<string, number> = {};

    if (electionIds.length > 0) {
        const { data: candidates } = await supabase
            .from("candidates")
            .select("election_id, organization_role_id")
            .in("election_id", electionIds);

        if (candidates) {
            candidates.forEach((c) => {
                candidateCounts[c.election_id] = (candidateCounts[c.election_id] || 0) + 1;
            });

            const roleSet: Record<string, Set<string>> = {};
            candidates.forEach((c) => {
                if (!roleSet[c.election_id]) roleSet[c.election_id] = new Set();
                if (c.organization_role_id) roleSet[c.election_id].add(c.organization_role_id);
            });
            Object.keys(roleSet).forEach((eid) => {
                roleCounts[eid] = roleSet[eid].size;
            });
        }
    }

    // Only admins can create elections
    let manageableOrgs: { id: string; name: string }[] = [];
    if (isAdmin) {
        const { data: orgs } = await supabase
            .from("organizations")
            .select("id, name")
            .order("name");
        manageableOrgs = orgs || [];
    }

    const activeElections = visibleElections.filter((e) => e.status === "active");
    const closedElections = visibleElections.filter((e) => e.status === "closed");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Elections</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and participate in organization elections.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <CreateElectionDialog organizations={manageableOrgs} />
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors card-hover"
                    >
                        <span>🏠</span> Home
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <span className="text-lg">🗳️</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</p>
                            <p className="text-2xl font-bold mt-0.5">{activeElections.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-500/10 flex items-center justify-center">
                            <span className="text-lg">📊</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Closed</p>
                            <p className="text-2xl font-bold mt-0.5">{closedElections.length}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 flex items-center justify-center">
                            <span className="text-lg">📋</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total</p>
                            <p className="text-2xl font-bold mt-0.5">{visibleElections.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {activeElections.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Active Elections
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {activeElections.map((election, i) => (
                            <ElectionCard
                                key={election.id}
                                id={election.id}
                                title={election.title}
                                description={election.description}
                                orgName={election.organizations?.name || "Unknown Org"}
                                startDate={election.start_date}
                                endDate={election.end_date}
                                status={election.status}
                                candidateCount={candidateCounts[election.id] || 0}
                                roleCount={roleCounts[election.id] || 0}
                                index={i}
                            />
                        ))}
                    </div>
                </div>
            )}

            {closedElections.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Past Elections</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {closedElections.map((election, i) => (
                            <ElectionCard
                                key={election.id}
                                id={election.id}
                                title={election.title}
                                description={election.description}
                                orgName={election.organizations?.name || "Unknown Org"}
                                startDate={election.start_date}
                                endDate={election.end_date}
                                status={election.status}
                                candidateCount={candidateCounts[election.id] || 0}
                                roleCount={roleCounts[election.id] || 0}
                                index={i}
                            />
                        ))}
                    </div>
                </div>
            )}

            {visibleElections.length === 0 && (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-[#2D3748] to-[#4A5568]" />
                    <div className="text-center py-16 px-6">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2D3748]/10 flex items-center justify-center mb-4">
                            <span className="text-3xl">🗳️</span>
                        </div>
                        <p className="font-bold text-lg">No Elections Yet</p>
                        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                            {manageableOrgs.length > 0
                                ? "Create an election for one of your organizations to get started."
                                : "Elections for your organizations will appear here once created."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
