"use client";

import { useRef } from "react";
import Image from "next/image";

interface Candidate {
    id: string;
    user_id: string;
    name: string;
    avatar_url: string | null;
    platform: string | null;
    vote_count?: number;
}

interface PositionResult {
    role_id: string;
    winner_id: string | null;
    winner_name: string | null;
    winner_avatar: string | null;
    candidates: Candidate[];
}

interface Role {
    id: string;
    title: string;
    hierarchy_level: number;
}

interface ElectionResultsSectionProps {
    electionId: string;
    electionTitle: string;
    resultsByRole: Record<string, PositionResult>;
    roles: Role[];
}

export default function ElectionResultsSection({
    electionId: _electionId,
    electionTitle,
    resultsByRole,
    roles,
}: ElectionResultsSectionProps) {
    const resultsRef = useRef<HTMLDivElement>(null);

    // Calculate totals
    const allCandidates = Object.values(resultsByRole).flatMap(r => r.candidates);
    const totalVotes = allCandidates.reduce((sum, c) => sum + (c.vote_count || 0), 0);
    const totalPositions = roles.length;
    const filledPositions = Object.values(resultsByRole).filter(r => r.winner_id).length;

    return (
        <div className="space-y-6" ref={resultsRef}>
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-foreground">📊 Election Analytics</h2>
                        <button
                            onClick={async () => {
                                if (!resultsRef.current) return;
                                const html2pdf = (await import("html2pdf.js")).default;
                                // Force light mode for PDF export
                                const el = resultsRef.current;
                                const htmlEl = document.documentElement;
                                const wasDark = htmlEl.classList.contains("dark");
                                if (wasDark) htmlEl.classList.remove("dark");
                                el.classList.add("pdf-export-light");
                                await html2pdf()
                                    .set({
                                        margin: [10, 10, 10, 10],
                                        filename: `${electionTitle.replace(/\s+/g, "_")}_Results.pdf`,
                                        image: { type: "jpeg", quality: 0.98 },
                                        html2canvas: { scale: 2, useCORS: true },
                                        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
                                    })
                                    .from(el)
                                    .save();
                                el.classList.remove("pdf-export-light");
                                if (wasDark) htmlEl.classList.add("dark");
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/30 bg-primary/5 text-primary dark:text-gold dark:border-gold/30 dark:bg-gold/5 text-sm font-semibold hover:bg-primary/10 dark:hover:bg-gold/10 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Download PDF
                        </button>
                    </div>

                    {/* Summary stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-lg bg-muted p-4 text-center">
                            <p className="text-3xl font-bold text-primary">{totalVotes}</p>
                            <p className="text-xs text-muted-foreground mt-1">Total Votes Cast</p>
                        </div>
                        <div className="rounded-lg bg-muted p-4 text-center">
                            <p className="text-3xl font-bold text-gold">{filledPositions}</p>
                            <p className="text-xs text-muted-foreground mt-1">Positions Filled</p>
                        </div>
                        <div className="rounded-lg bg-muted p-4 text-center">
                            <p className="text-3xl font-bold text-foreground">{totalPositions}</p>
                            <p className="text-xs text-muted-foreground mt-1">Total Positions</p>
                        </div>
                        <div className="rounded-lg bg-muted p-4 text-center">
                            <p className="text-3xl font-bold text-green-600">{allCandidates.length}</p>
                            <p className="text-xs text-muted-foreground mt-1">Candidates</p>
                        </div>
                    </div>

                    {/* Position breakdown */}
                    <h3 className="font-semibold text-foreground mb-3">Results by Position</h3>
                    <div className="space-y-4">
                        {roles.map((role) => {
                            const result = resultsByRole[role.id];
                            if (!result || result.candidates.length === 0) {
                                return (
                                    <div key={role.id} className="p-4 rounded-lg border border-border bg-muted">
                                        <h4 className="font-medium text-foreground">{role.title}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">No candidates</p>
                                    </div>
                                );
                            }

                            const sortedCandidates = [...result.candidates].sort(
                                (a, b) => (b.vote_count || 0) - (a.vote_count || 0)
                            );
                            const positionTotalVotes = sortedCandidates.reduce(
                                (sum, c) => sum + (c.vote_count || 0), 0
                            );

                            return (
                                <div key={role.id} className="p-4 rounded-lg border border-border">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-foreground">{role.title}</h4>
                                        <span className="text-xs text-muted-foreground">
                                            {positionTotalVotes} total vote{positionTotalVotes !== 1 ? "s" : ""}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        {sortedCandidates.map((candidate, index) => {
                                            const percentage = positionTotalVotes > 0
                                                ? Math.round((candidate.vote_count || 0) / positionTotalVotes * 100)
                                                : 0;
                                            const isWinner = candidate.id === result.winner_id;

                                            return (
                                                <div
                                                    key={candidate.id}
                                                    className={`flex items-center gap-3 p-2 rounded-lg ${
                                                        isWinner ? "bg-gold/10 border border-gold/30" : "bg-muted"
                                                    }`}
                                                >
                                                    {/* Rank */}
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                        isWinner
                                                            ? "bg-gold text-white"
                                                            : "bg-muted dark:bg-gray-700 text-muted-foreground dark:text-gray-300"
                                                    }`}>
                                                        {index + 1}
                                                    </div>

                                                    {/* Avatar */}
                                                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-border shrink-0">
                                                        {candidate.avatar_url ? (
                                                            <Image
                                                                src={candidate.avatar_url}
                                                                alt={candidate.name}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-[#800000] to-[#C9A227] flex items-center justify-center text-white text-xs font-bold">
                                                                {candidate.name.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Name and votes */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-medium text-sm truncate ${
                                                                isWinner ? "text-primary dark:text-gold" : "text-foreground"
                                                            }`}>
                                                                {candidate.name}
                                                            </span>
                                                            {isWinner && (
                                                                <span className="text-[10px] font-bold text-gold">
                                                                    🏆 WINNER
                                                                </span>
                                                            )}
                                                        </div>
                                                        {/* Progress bar */}
                                                        <div className="mt-1 h-1.5 bg-muted dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    isWinner ? "bg-gold" : "bg-gray-400"
                                                                }`}
                                                                style={{ width: `${percentage}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Vote count */}
                                                    <div className="text-right shrink-0">
                                                        <p className={`text-sm font-bold ${
                                                            isWinner ? "text-primary dark:text-gold" : "text-foreground"
                                                        }`}>
                                                            {candidate.vote_count || 0}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground">{percentage}%</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
