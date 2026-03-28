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
    isClosed: boolean;
    isVotingOpen: boolean;
}

export default function VotingDialog({
    electionId,
    roleId,
    roleTitle,
    candidates,
    hasVoted,
    isOfficer,
    isClosed,
    isVotingOpen,
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

    const canVote = isOfficer && isVotingOpen && !hasVoted && !isClosed;
    const showResults = isClosed;

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
                        const isSelected = selectedCandidate === candidate.id;
                        const initials = candidate.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);

                        return (
                            <div
                                key={candidate.id}
                                className={`relative flex items-start gap-4 p-4 rounded-lg border transition-all ${canVote
                                    ? "cursor-pointer hover:shadow-md hover:border-primary/30"
                                    : ""
                                    } ${isSelected
                                        ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
                                        : "border-border"
                                    }`}
                                onClick={() => {
                                    if (canVote) setSelectedCandidate(candidate.id);
                                }}
                            >
                                {canVote && (
                                    <div className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected
                                        ? "border-primary bg-primary"
                                        : "border-gray-300"
                                        }`}>
                                        {isSelected && (
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </div>
                                )}

                                <div className="w-10 h-10 rounded-full bg-[#C9A227] text-[#2B2B2B] text-sm font-bold flex items-center justify-center shrink-0">
                                    {candidate.avatar_url ? (
                                        <img src={candidate.avatar_url} alt={candidate.name} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        initials
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm">{candidate.name}</p>
                                    {candidate.platform && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{candidate.platform}</p>
                                    )}
                                </div>

                                {showResults && candidate.vote_count !== undefined && (
                                    <div className="shrink-0 text-right">
                                        <p className="text-lg font-bold text-primary">{candidate.vote_count}</p>
                                        <p className="text-[10px] text-muted-foreground">vote{candidate.vote_count !== 1 ? "s" : ""}</p>
                                    </div>
                                )}
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
                                    ⚠️ Are you sure? Your vote cannot be changed once submitted.
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

                {!isOfficer && isVotingOpen && !isClosed && (
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
