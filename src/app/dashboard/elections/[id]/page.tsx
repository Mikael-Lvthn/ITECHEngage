import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import VotingDialog from "@/components/elections/VotingDialog";
import NominateDialog from "@/components/elections/NominateDialog";
import PublishResultsButton from "@/components/elections/PublishResultsButton";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ElectionDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: election } = await supabase
        .from("elections")
        .select("*, organizations(id, name)")
        .eq("id", id)
        .single();

    if (!election) notFound();

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

    const { data: membership } = await supabase
        .from("memberships")
        .select("id, role, status")
        .eq("user_id", user.id)
        .eq("organization_id", election.organization_id)
        .eq("status", "approved")
        .maybeSingle();

    const isOfficer = membership?.role === "officer";
    const isMember = !!membership;

    const { data: roleManagerCheck } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("organization_id", election.organization_id)
        .eq("assigned_user_id", user.id)
        .eq("can_manage_roles", true)
        .limit(1);

    const canManage = isAdmin || (roleManagerCheck && roleManagerCheck.length > 0);

    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("id, title")
        .eq("organization_id", election.organization_id)
        .order("hierarchy_level");

    const { data: candidates } = await supabase
        .from("candidates")
        .select("*, profiles(full_name, avatar_url)")
        .eq("election_id", id);

    const { data: votedRolesData } = await supabase.rpc("get_my_voted_roles", {
        p_election_id: id,
    });

    const votedRoles: string[] = Array.isArray(votedRolesData) ? votedRolesData : [];

    let electionResults: any[] = [];
    const isClosed = election.status === "closed";
    if (isClosed || canManage) {
        const { data: results } = await supabase.rpc("get_election_results", {
            p_election_id: id,
        });
        electionResults = results || [];
    }

    const now = new Date();
    const start = new Date(election.start_date);
    const end = new Date(election.end_date);
    const isVotingOpen = election.status === "active" && now >= start && now <= end;
    const isUpcoming = election.status === "active" && now < start;

    const statusLabel = isClosed
        ? "Closed"
        : isUpcoming
            ? "Upcoming"
            : isVotingOpen
                ? "Voting Open"
                : "Active";
    const statusColor = isClosed
        ? "bg-gray-100 text-gray-600"
        : isUpcoming
            ? "bg-blue-100 text-blue-700"
            : isVotingOpen
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700";

    const roleIds = [...new Set((candidates || []).map((c) => c.organization_role_id).filter(Boolean))];
    const availableRoles = (orgRoles || []).filter((r) => roleIds.includes(r.id) || election.status === "active");

    const myCandidateRoleIds = (candidates || [])
        .filter((c) => c.user_id === user.id)
        .map((c) => c.organization_role_id)
        .filter(Boolean) as string[];

    const candidatesByRole: Record<string, any[]> = {};
    (candidates || []).forEach((c) => {
        const key = c.organization_role_id || "other";
        if (!candidatesByRole[key]) candidatesByRole[key] = [];
        candidatesByRole[key].push(c);
    });

    const resultsByRole: Record<string, any[]> = {};
    electionResults.forEach((r) => {
        if (!resultsByRole[r.role_id]) resultsByRole[r.role_id] = [];
        resultsByRole[r.role_id].push(r);
    });

    return (
        <div className="space-y-6 pb-12">
            <Link
                href="/dashboard/elections"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                ← Back to Elections
            </Link>

            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{election.title}</h1>
                            <p className="text-muted-foreground text-sm mt-1">
                                {election.organizations?.name || "Unknown Organization"}
                            </p>
                            {election.description && (
                                <p className="text-sm text-muted-foreground mt-2">{election.description}</p>
                            )}
                        </div>
                        <span className={`shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${statusColor}`}>
                            {statusLabel}
                        </span>
                    </div>

                    <div className="flex items-center gap-6 mt-4 pt-4 border-t text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <span>📅</span>
                            <span>
                                {start.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                {" — "}
                                {end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span>👤</span>
                            <span>{(candidates || []).length} candidate{(candidates || []).length !== 1 ? "s" : ""}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {isMember && isVotingOpen && (
                    <NominateDialog
                        electionId={id}
                        roles={availableRoles}
                        alreadyNominated={myCandidateRoleIds}
                    />
                )}

                {canManage && election.status === "active" && now > end && (
                    <PublishResultsButton electionId={id} />
                )}
            </div>

            <div className="space-y-6">
                <h2 className="text-lg font-semibold">
                    {isClosed ? "Results by Role" : "Candidates by Role"}
                </h2>

                {availableRoles.length === 0 ? (
                    <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                        <p className="text-sm">No roles have been assigned to this election yet.</p>
                        <p className="text-xs mt-1">Candidates need to nominate themselves for specific organization roles.</p>
                    </div>
                ) : (
                    availableRoles.map((role) => {
                        const roleCandidates = isClosed
                            ? (resultsByRole[role.id] || []).map((r) => ({
                                id: r.candidate_id,
                                user_id: r.candidate_user_id,
                                name: r.candidate_name,
                                avatar_url: r.candidate_avatar,
                                platform: r.candidate_platform,
                                vote_count: Number(r.vote_count),
                            }))
                            : (candidatesByRole[role.id] || []).map((c) => ({
                                id: c.id,
                                user_id: c.user_id,
                                name: c.profiles?.full_name || "Unknown",
                                avatar_url: c.profiles?.avatar_url || null,
                                platform: c.platform,
                            }));

                        return (
                            <VotingDialog
                                key={role.id}
                                electionId={id}
                                roleId={role.id}
                                roleTitle={role.title}
                                candidates={roleCandidates}
                                hasVoted={votedRoles.includes(role.id)}
                                isOfficer={isOfficer || isAdmin}
                                isClosed={isClosed}
                                isVotingOpen={isVotingOpen}
                            />
                        );
                    })
                )}
            </div>
        </div>
    );
}
