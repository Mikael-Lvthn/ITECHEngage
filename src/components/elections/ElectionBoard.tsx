"use client";

import { useState, useTransition } from "react";
import { castVote, nominateCandidate } from "@/lib/actions/elections";
import { assignUserToRole } from "@/lib/actions/org-roles";
import PositionCard from "./PositionCard";
import CandidateCard from "./CandidateCard";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/utils/error";

interface Candidate {
    id: string;
    user_id: string;
    name: string;
    avatar_url: string | null;
    platform: string | null;
    vote_count?: number;
}

interface Role {
    id: string;
    title: string;
    hierarchy_level: number;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
    assigned_user_avatar: string | null;
}

interface PositionResult {
    role_id: string;
    winner_id: string | null;
    winner_name: string | null;
    winner_avatar: string | null;
    candidates: Candidate[];
}

interface Member {
    user_id: string;
    full_name: string;
}

interface ElectionBoardProps {
    electionId: string;
    roles: Role[];
    candidatesByRole: Record<string, Candidate[]>;
    resultsByRole?: Record<string, PositionResult>;
    votedRoles: string[];
    currentUserId: string;
    isVotingOpen: boolean;
    isClosed: boolean;
    isOfficer: boolean;
    isMember: boolean;
    isAdmin: boolean;
    // New props for interactive board
    organizationId?: string;
    members?: Member[];
    canNominate?: boolean;
    alreadyNominated?: string[];
}

export default function ElectionBoard({
    electionId,
    roles,
    candidatesByRole,
    resultsByRole = {},
    votedRoles,
    currentUserId,
    isVotingOpen,
    isClosed,
    isOfficer: _isOfficer,
    isMember,
    isAdmin,
    organizationId,
    members = [],
    canNominate = false,
    alreadyNominated = [],
}: ElectionBoardProps) {
    const [isPending, startTransition] = useTransition();
    const [votingFor, setVotingFor] = useState<string | null>(null);

    // State for inline dialogs
    const [assignDialogRole, setAssignDialogRole] = useState<Role | null>(null);
    const [nominateDialogRole, setNominateDialogRole] = useState<Role | null>(null);
    const [selectedMember, setSelectedMember] = useState("");
    const [platform, setPlatform] = useState("");
    const [dialogError, setDialogError] = useState<string | null>(null);
    const [dialogSuccess, setDialogSuccess] = useState<string | null>(null);

    const handleVote = (candidateId: string, roleId: string) => {
        setVotingFor(candidateId);
        startTransition(async () => {
            try {
                await castVote(electionId, candidateId, roleId);
            } catch (error) {
                console.error("Vote failed:", getErrorMessage(error));
            } finally {
                setVotingFor(null);
            }
        });
    };

    const handleAssign = () => {
        if (!assignDialogRole || !selectedMember || !organizationId) return;
        setDialogError(null);
        startTransition(async () => {
            try {
                await assignUserToRole(assignDialogRole.id, selectedMember, organizationId);
                setDialogSuccess(`Member assigned to ${assignDialogRole.title}!`);
                setAssignDialogRole(null);
                setSelectedMember("");
            } catch (error) {
                setDialogError(getErrorMessage(error) || "Failed to assign member.");
            }
        });
    };

    const handleNominate = () => {
        if (!nominateDialogRole) return;
        setDialogError(null);
        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.set("election_id", electionId);
                formData.set("organization_role_id", nominateDialogRole.id);
                formData.set("platform", platform);
                await nominateCandidate(formData);
                setDialogSuccess(`Nominated for ${nominateDialogRole.title}!`);
                setNominateDialogRole(null);
                setPlatform("");
            } catch (error) {
                setDialogError(getErrorMessage(error) || "Failed to submit nomination.");
            }
        });
    };

    const handlePositionClick = (role: Role) => {
        setDialogError(null);
        setDialogSuccess(null);
        if (isClosed) return; // Don't allow clicks on closed elections

        if (isAdmin && organizationId && members.length > 0) {
            // Admin → open assign dialog for this role
            setAssignDialogRole(role);
            setNominateDialogRole(null);
        } else if (isMember && !isAdmin && canNominate && !alreadyNominated.includes(role.id)) {
            // Member → open nominate dialog for this role
            setNominateDialogRole(role);
            setAssignDialogRole(null);
        }
    };

    // Determine if user can vote — any approved member (not admin) can vote
    const canVote = isVotingOpen && isMember && !isAdmin;

    // Determine if position card should be clickable
    const isPositionClickable = (role: Role) => {
        if (isClosed) return false;
        if (isAdmin && organizationId && members.length > 0) return true;
        if (isMember && !isAdmin && canNominate && !alreadyNominated.includes(role.id)) return true;
        return false;
    };

    const getClickLabel = (role: Role) => {
        if (isClosed) return undefined;
        if (isAdmin && organizationId) return "Click to assign";
        if (isMember && !isAdmin && canNominate && !alreadyNominated.includes(role.id)) return "Click to nominate";
        return undefined;
    };

    // Separate roles into active (with ongoing voting) and completed (with winners)
    const activeRoles: Role[] = [];
    const completedRoles: Role[] = [];

    roles.forEach((role) => {
        const result = resultsByRole[role.id];
        if (isClosed && result?.winner_id) {
            completedRoles.push(role);
        } else if (candidatesByRole[role.id]?.length > 0 || !isClosed) {
            activeRoles.push(role);
        }
    });

    const renderPositionRow = (role: Role, showResults: boolean) => {
        const result = resultsByRole[role.id];
        const candidates = showResults && result
            ? result.candidates
            : (candidatesByRole[role.id] || []);
        
        const hasVotedForRole = votedRoles.includes(role.id);
        const hasWinner = showResults && !!result?.winner_id;

        // Sort candidates by vote count (more votes = first, closest to position card)
        const sortedCandidates = [...candidates].sort((a, b) => 
            (b.vote_count || 0) - (a.vote_count || 0)
        );

        return (
            <div
                key={role.id}
                className={`p-4 rounded-xl border ${
                    hasWinner
                        ? "bg-gradient-to-r from-[#C9A227]/10 to-transparent border-gold/30"
                        : "bg-card border-border"
                }`}
            >
                <div className="flex items-start gap-4 overflow-x-auto pb-2">
                    {/* Position card (left side) */}
                    <div className="shrink-0">
                        <PositionCard
                            title={role.title}
                            hierarchyLevel={role.hierarchy_level}
                            assignedUserName={role.assigned_user_name}
                            assignedUserAvatar={role.assigned_user_avatar}
                            isVacant={!role.assigned_user_id}
                            hasWinner={hasWinner}
                            winnerName={result?.winner_name || undefined}
                            winnerAvatar={result?.winner_avatar}
                            clickable={isPositionClickable(role)}
                            onClick={() => handlePositionClick(role)}
                            clickLabel={getClickLabel(role)}
                        />
                    </div>

                    {/* Arrow */}
                    {sortedCandidates.length > 0 && (
                        <div className="flex items-center shrink-0">
                            <div className="w-8 h-0.5 bg-border" />
                            <div className="w-0 h-0 border-t-4 border-b-4 border-l-8 border-transparent border-l-border" />
                        </div>
                    )}

                    {/* Candidates (sorted by votes - highest first, closest to position) */}
                    <div className="flex items-start gap-3">
                        {sortedCandidates.length === 0 ? (
                            <div className="flex items-center justify-center h-full px-8 py-4 text-muted-foreground text-sm">
                                No candidates nominated
                            </div>
                        ) : (
                            sortedCandidates.map((candidate) => (
                                <div key={candidate.id} className="shrink-0 w-[150px]">
                                    <CandidateCard
                                        id={candidate.id}
                                        name={candidate.name}
                                        avatarUrl={candidate.avatar_url}
                                        platform={candidate.platform}
                                        voteCount={showResults ? candidate.vote_count : undefined}
                                        isWinner={hasWinner && result?.winner_id === candidate.id}
                                        isCurrentUser={candidate.user_id === currentUserId}
                                        hasVoted={hasVotedForRole}
                                        canVote={canVote && !hasVotedForRole}
                                        onVote={() => handleVote(candidate.id, role.id)}
                                        isVoting={isPending && votingFor === candidate.id}
                                    />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Success banner */}
            {dialogSuccess && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm flex items-center gap-2 animate-scale-in">
                    <span>✅</span> {dialogSuccess}
                </div>
            )}

            {/* Active positions (voting ongoing) */}
            {activeRoles.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">
                            {isClosed ? "All Positions" : "Active Positions"}
                        </h3>
                        {isVotingOpen && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                Voting Open
                            </span>
                        )}
                    </div>
                    <div className="space-y-4">
                        {activeRoles.map((role) => renderPositionRow(role, isClosed))}
                    </div>
                </div>
            )}

            {/* Completed positions (winners determined) */}
            {completedRoles.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-bold text-foreground">Completed Positions</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">
                            ✓ Winners Determined
                        </span>
                    </div>
                    <div className="space-y-4">
                        {completedRoles.map((role) => renderPositionRow(role, true))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {activeRoles.length === 0 && completedRoles.length === 0 && (
                <div className="rounded-xl border bg-muted p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center text-3xl">
                        🗳️
                    </div>
                    <h3 className="text-lg font-bold text-foreground">No Positions Available</h3>
                    <p className="text-muted-foreground text-sm mt-2">
                        No organization roles have been set up for this election yet.
                    </p>
                </div>
            )}

            {/* Voting info */}
            {canVote && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>How to vote:</strong> Click the &quot;Vote&quot; button on a candidate card. You can only vote once per position.
                        {isAdmin && " As an admin, you cannot vote in elections."}
                    </p>
                </div>
            )}

            {isAdmin && isVotingOpen && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                        <strong>Admin Notice:</strong> Administrators cannot vote in elections. You can view candidates and monitor the election progress.
                    </p>
                </div>
            )}

            {/* Interactive hint */}
            {!isClosed && (isAdmin || (isMember && !isAdmin && canNominate)) && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs text-muted-foreground">
                        <strong className="text-foreground">💡 Tip:</strong>{" "}
                        {isAdmin
                            ? "Click on any position card to directly assign a member to that role."
                            : "Click on any position card to nominate yourself for that role."}
                    </p>
                </div>
            )}

            {/* ═══ Admin Direct Assign Dialog (inline) ═══ */}
            {assignDialogRole && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => setAssignDialogRole(null)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border animate-scale-in overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
                                <h2 className="text-lg font-bold text-foreground">Assign Member</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Assign a member to <strong>{assignDialogRole.title}</strong>
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-foreground">Member *</label>
                                    <select
                                        value={selectedMember}
                                        onChange={(e) => setSelectedMember(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    >
                                        <option value="">Select a member...</option>
                                        {members.map((m) => (
                                            <option key={m.user_id} value={m.user_id}>
                                                {m.full_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {dialogError && (
                                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                                        {dialogError}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t flex justify-end gap-2">
                                <button
                                    onClick={() => { setAssignDialogRole(null); setSelectedMember(""); setDialogError(null); }}
                                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAssign}
                                    disabled={!selectedMember || isPending}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Assign
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ═══ Member Nominate Dialog (inline) ═══ */}
            {nominateDialogRole && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => setNominateDialogRole(null)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border animate-scale-in overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#C9A227]/10 to-transparent">
                                <h2 className="text-lg font-bold text-foreground">Nominate Yourself</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Run for <strong>{nominateDialogRole.title}</strong>
                                </p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5 text-foreground">Platform / Statement (optional)</label>
                                    <textarea
                                        value={platform}
                                        onChange={(e) => setPlatform(e.target.value)}
                                        placeholder="Share your vision for this role..."
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    />
                                </div>

                                {dialogError && (
                                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                                        {dialogError}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t flex justify-end gap-2">
                                <button
                                    onClick={() => { setNominateDialogRole(null); setPlatform(""); setDialogError(null); }}
                                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleNominate}
                                    disabled={isPending}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Submit Nomination
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
