"use client";

import { useState, useTransition } from "react";
import { castVote } from "@/lib/actions/elections";

interface CandidateOption {
    id: string;
    user_id: string;
    name: string;
    avatar_url: string | null;
    platform: string | null;
    vote_count?: number;
}

interface VotingDialogProps {
    electionId: string;
    roleId: string;
    roleTitle: string;
    candidates: CandidateOption[];
    hasVoted: boolean;
    isOfficer: boolean;
    isAdmin: boolean;
    isClosed: boolean;
    isVotingOpen: boolean;
    currentUserId: string;
}

export default function VotingDialog({
    electionId,
    roleId,
    roleTitle,
    candidates,
    hasVoted,
    isOfficer,
    isAdmin,
    isClosed,
    isVotingOpen,
    currentUserId,
}: VotingDialogProps) {
    const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleVote = () => {
        if (!selectedCandidate) return;
        setErrorMsg(null);

        startTransition(async () => {
            try {
                await castVote(electionId, selectedCandidate, roleId);
                setSuccessMsg("Your vote has been recorded successfully!");
                setShowConfirm(false);
                setSelectedCandidate(null);
            } catch (err: any) {
                setErrorMsg(err.message || "Failed to cast vote.");
                setShowConfirm(false);
            }
        });
    };

    // Officers can vote (not admins), voting must be open, not yet voted, not closed
    const canVote = isOfficer && !isAdmin && isVotingOpen && !hasVoted && !isClosed;
    const showResults = isClosed;
    const totalVotes = candidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-5 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-lg">🎖️</span>
                        <h3 className="font-bold text-base">{roleTitle}</h3>
                    </div>
                    {hasVoted && !isClosed && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                            ✓ Voted
                        </span>
                    )}
                </div>
            </div>

            <div className="p-5 space-y-3">
                {candidates.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm">
                        <p>No candidates have nominated for this role yet.</p>
                    </div>
                ) : (
                    candidates.map((candidate) => {
                        const isSelf = candidate.user_id === currentUserId;
                        const isSelected = selectedCandidate === candidate.id;
                        const initials = candidate.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);

                        const percentage = totalVotes > 0 && candidate.vote_count !== undefined
                            ? Math.round((candidate.vote_count / totalVotes) * 100)
                            : 0;

                        // Can't select yourself as a vote target
                        const canSelectThis = canVote && !isSelf;

                        return (
                            <div
                                key={candidate.id}
                                className={`relative flex flex-col gap-3 p-4 rounded-lg border transition-all overflow-hidden z-10 ${canSelectThis
                                    ? "cursor-pointer hover:shadow-md hover:border-primary/30"
                                    : isSelf && canVote
                                        ? "opacity-60 cursor-not-allowed"
                                        : ""
                                    } ${isSelected
                                        ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                                        : "border-border bg-card"
                                    }`}
                                onClick={() => {
                                    if (canSelectThis) setSelectedCandidate(candidate.id);
                                }}
                            >
                                {/* Progress bar background for results */}
                                {showResults && (
                                    <div
                                        className="absolute left-0 top-0 bottom-0 bg-[#C9A227]/10 -z-10 transition-all duration-1000 ease-out"
                                        style={{ width: `${percentage}%` }}
                                    />
                                )}

                                <div className="flex items-start gap-4">
                                    {canVote && (
                                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelf
                                            ? "border-gray-200 bg-gray-100"
                                            : isSelected
                                                ? "border-primary bg-primary"
                                                : "border-gray-300 bg-background"
                                            }`}>
                                            {isSelected && (
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                            {isSelf && (
                                                <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                </svg>
                                            )}
                                        </div>
                                    )}

                                    <div className="w-10 h-10 rounded-full bg-[#C9A227] text-[#2B2B2B] text-sm font-bold flex items-center justify-center shrink-0 z-10">
                                        {candidate.avatar_url ? (
                                            <img src={candidate.avatar_url} alt={candidate.name} className="w-full h-full rounded-full object-cover" />
                                        ) : (
                                            initials
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 z-10">
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-sm">{candidate.name}</p>
                                            {isSelf && canVote && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                                    You
                                                </span>
                                            )}
                                        </div>
                                        {candidate.platform && (
                                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{candidate.platform}</p>
                                        )}
                                    </div>

                                    {showResults && candidate.vote_count !== undefined && (
                                        <div className="shrink-0 text-right z-10">
                                            <p className="text-lg font-bold text-primary">{percentage}%</p>
                                            <p className="text-[10px] text-muted-foreground">{candidate.vote_count} vote{candidate.vote_count !== 1 ? "s" : ""}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}

                {successMsg && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                        <span>✅</span> {successMsg}
                    </div>
                )}

                {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                        <span>❌</span> {errorMsg}
                    </div>
                )}

                {canVote && !successMsg && (
                    <div className="pt-2">
                        {!showConfirm ? (
                            <button
                                onClick={() => {
                                    if (selectedCandidate) setShowConfirm(true);
                                }}
                                disabled={!selectedCandidate || isPending}
                                className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                Cast Vote
                            </button>
                        ) : (
                            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 space-y-3">
                                <p className="text-sm font-medium text-yellow-800">
                                    ⚠️ Are you sure? Your vote is anonymous and cannot be changed once submitted.
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleVote}
                                        disabled={isPending}
                                        className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {isPending ? "Submitting..." : "Confirm Vote"}
                                    </button>
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        disabled={isPending}
                                        className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {isAdmin && isVotingOpen && !isClosed && (
                    <p className="text-xs text-muted-foreground text-center py-2 bg-muted/50 rounded-lg">
                        🔒 Administrators cannot cast votes in elections.
                    </p>
                )}

                {!isOfficer && !isAdmin && isVotingOpen && !isClosed && (
                    <p className="text-xs text-muted-foreground text-center py-2 bg-muted/50 rounded-lg">
                        🔒 Only officers of this organization can cast votes.
                    </p>
                )}

                {hasVoted && !isClosed && (
                    <p className="text-xs text-green-600 text-center py-2 bg-green-50 rounded-lg">
                        ✅ You have already voted for this role.
                    </p>
                )}
            </div>
        </div>
    );
}
