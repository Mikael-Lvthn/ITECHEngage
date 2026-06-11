import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import NominateDialog from "@/components/elections/NominateDialog";
import ElectionBoard from "@/components/elections/ElectionBoard";
import ElectionResultsSection from "@/components/elections/ElectionResultsSection";
import ElectionAdminControls from "@/components/elections/ElectionAdminControls";
import VoteStats from "@/components/elections/VoteStats";

interface Props {
    params: Promise<{ id: string }>;
}

interface CandidateEntry {
    id: string;
    user_id: string;
    name: string;
    avatar_url: string | null;
    platform: string | null;
    vote_count?: number;
}

interface ElectionResult {
    role_id: string;
    candidate_id: string;
    candidate_user_id: string;
    candidate_name: string;
    candidate_avatar: string | null;
    candidate_platform: string | null;
    vote_count: number;
}

interface RoleResult {
    role_id: string;
    winner_id: string | null;
    winner_name: string | null;
    winner_avatar: string | null;
    winner_vote_count?: number;
    candidates: CandidateEntry[];
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

    const canManage = isAdmin;

    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("id, title, hierarchy_level, assigned_user_id, profiles(full_name, avatar_url)")
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

    let electionResults: ElectionResult[] = [];
    const isClosed = election.status === "completed";
    if (isClosed || canManage) {
        const { data: results } = await supabase.rpc("get_election_results", {
            p_election_id: id,
        });
        electionResults = results || [];
    }

    // Fetch members for admin direct assign
    let orgMembers: { user_id: string; full_name: string }[] = [];
    if (isAdmin) {
        const { data: membersData } = await supabase
            .from("memberships")
            .select("user_id, profiles(full_name)")
            .eq("organization_id", election.organization_id)
            .eq("status", "approved");
        orgMembers = (membersData || []).map((m) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            return {
                user_id: m.user_id,
                full_name: profile?.full_name || "Unknown",
            };
        });
    }

    const now = new Date();
    const start = new Date(election.start_date);
    const end = election.end_date ? new Date(election.end_date) : null;
    
    // Update status checks for new enum values
    const isVotingOpen = election.status === "voting";
    const isDraft = election.status === "draft";
    const isPublished = election.status === "published";
    const _isUpcoming = isPublished && now < start;

    const statusLabel = isClosed
        ? "Completed"
        : isDraft
            ? "Draft"
            : isPublished
                ? "Published"
                : isVotingOpen
                    ? "Voting Open"
                    : "Unknown";

    const statusColor = isClosed
        ? "bg-purple-100 text-purple-700"
        : isDraft
            ? "bg-gray-100 text-gray-600"
            : isPublished
                ? "bg-blue-100 text-blue-700"
                : isVotingOpen
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600";

    // Prepare roles data with assigned user info
    const rolesWithAssignments = (orgRoles || []).map((r) => {
        const profile = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
        return {
            id: r.id,
            title: r.title,
            hierarchy_level: r.hierarchy_level,
            assigned_user_id: r.assigned_user_id,
            assigned_user_name: profile?.full_name || null,
            assigned_user_avatar: profile?.avatar_url || null,
        };
    });

    // Prepare candidates by role
    const candidatesByRole: Record<string, CandidateEntry[]> = {};
    (candidates || []).forEach((c) => {
        const key = c.organization_role_id || "other";
        if (!candidatesByRole[key]) candidatesByRole[key] = [];
        candidatesByRole[key].push({
            id: c.id,
            user_id: c.user_id,
            name: c.profiles?.full_name || "Unknown",
            avatar_url: c.profiles?.avatar_url || null,
            platform: c.platform,
        });
    });

    // Prepare results by role
    const resultsByRole: Record<string, RoleResult> = {};
    electionResults.forEach((r) => {
        if (!resultsByRole[r.role_id]) {
            resultsByRole[r.role_id] = {
                role_id: r.role_id,
                winner_id: null,
                winner_name: null,
                winner_avatar: null,
                candidates: [],
            };
        }
        resultsByRole[r.role_id].candidates.push({
            id: r.candidate_id,
            user_id: r.candidate_user_id,
            name: r.candidate_name,
            avatar_url: r.candidate_avatar,
            platform: r.candidate_platform,
            vote_count: Number(r.vote_count),
        });
        // Winner is the one with most votes
        if (resultsByRole[r.role_id].candidates.length === 1 || 
            Number(r.vote_count) > (resultsByRole[r.role_id].winner_vote_count || 0)) {
            resultsByRole[r.role_id].winner_id = r.candidate_id;
            resultsByRole[r.role_id].winner_name = r.candidate_name;
            resultsByRole[r.role_id].winner_avatar = r.candidate_avatar;
            resultsByRole[r.role_id].winner_vote_count = Number(r.vote_count);
        }
    });

    const myCandidateRoleIds = (candidates || [])
        .filter((c) => c.user_id === user.id)
        .map((c) => c.organization_role_id)
        .filter(Boolean) as string[];

    // Nominations can happen only during the draft phase
    const canNominate = election.status === "draft";

    return (
        <div className="space-y-6 pb-12">
            <Link
                href="/dashboard/elections"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                ← Back to Elections
            </Link>

            {/* Election header */}
            <div className="rounded-xl border bg-card overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold">{election.title}</h1>
                            <Link 
                                href={`/dashboard/organizations/${election.organization_id}`}
                                className="text-muted-foreground text-sm mt-1 hover:text-primary transition-colors"
                            >
                                {election.organizations?.name || "Unknown Organization"}
                            </Link>
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
                                {end ? ` — ${end.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : " (Ongoing)"}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span>👤</span>
                            <span>{(candidates || []).length} candidate{(candidates || []).length !== 1 ? "s" : ""}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin controls */}
            {canManage && (
                <ElectionAdminControls
                    electionId={id}
                    status={election.status}
                />
            )}

            {/* Vote stats */}
            {(isClosed || (canManage && isVotingOpen)) && (
                <VoteStats electionId={id} />
            )}

            {/* Actions bar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Officers can nominate (not admin) */}
                {isMember && !isAdmin && canNominate && (
                    <NominateDialog
                        electionId={id}
                        roles={rolesWithAssignments.map(r => ({ id: r.id, title: r.title, assigned_user_id: r.assigned_user_id }))}
                        alreadyNominated={myCandidateRoleIds}
                    />
                )}

                {/* Admin info notice */}
                {isAdmin && isVotingOpen && (
                    <div className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground flex items-center gap-2">
                        <span>🔒</span> Admins cannot vote or nominate in elections.
                    </div>
                )}
            </div>

            {/* Election Board */}
            <div className="space-y-6">
                <h2 className="text-lg font-semibold">
                    {isClosed ? "Election Results" : "Election Board"}
                </h2>

                <ElectionBoard
                    electionId={id}
                    roles={rolesWithAssignments}
                    candidatesByRole={candidatesByRole}
                    resultsByRole={isClosed ? resultsByRole : undefined}
                    votedRoles={votedRoles}
                    currentUserId={user.id}
                    isVotingOpen={isVotingOpen}
                    isClosed={isClosed}
                    isOfficer={isOfficer}
                    isMember={isMember}
                    isAdmin={isAdmin}
                    organizationId={election.organization_id}
                    members={orgMembers}
                    canNominate={canNominate}
                    alreadyNominated={myCandidateRoleIds}
                />
            </div>

            {/* Results analytics section */}
            {isClosed && (
                <ElectionResultsSection
                    electionId={id}
                    electionTitle={election.title}
                    resultsByRole={resultsByRole}
                    roles={rolesWithAssignments}
                />
            )}
        </div>
    );
}
