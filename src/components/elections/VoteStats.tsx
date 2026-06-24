"use client";

interface VoteStatsProps {
    electionId: string;
    eligibleVoters: number;
    votesCast: number;
}

export default function VoteStats({ eligibleVoters, votesCast }: VoteStatsProps) {
    const percentage = eligibleVoters > 0
        ? Math.round((votesCast / eligibleVoters) * 100)
        : 0;

    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">📊 Voter Turnout</h3>
            <div className="flex items-end gap-4">
                <div>
                    <p className="text-3xl font-bold text-primary">{percentage}%</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {eligibleVoters === 0
                            ? "No eligible voters (all members are candidates for every position)"
                            : `${votesCast} of ${eligibleVoters} eligible voter${eligibleVoters !== 1 ? "s" : ""}`}
                    </p>
                </div>
                <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#800000] to-[#C9A227] transition-all duration-700"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
            {eligibleVoters === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    ⚠️ Every member is nominated for every position — there are no eligible voters.
                </p>
            )}
        </div>
    );
}
