"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

interface VoteStatsProps {
    electionId: string;
}

export default function VoteStats({ electionId }: VoteStatsProps) {
    const [stats, setStats] = useState<{ total_votes_cast: number; total_eligible_voters: number } | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const supabase = createClient();
            const { data, error } = await supabase.rpc("get_election_vote_stats", {
                p_election_id: electionId,
            });

            if (!error && data) {
                setStats(data as { total_votes_cast: number; total_eligible_voters: number });
            }
        } catch {
            /* ignore */
        } finally {
            setLoading(false);
        }
    }, [electionId]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (loading || !stats) return null;

    const percentage = stats.total_eligible_voters > 0
        ? Math.round((stats.total_votes_cast / stats.total_eligible_voters) * 100)
        : 0;

    return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">📊 Voter Turnout</h3>
            <div className="flex items-end gap-4">
                <div>
                    <p className="text-3xl font-bold text-[#800000]">{percentage}%</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {stats.total_votes_cast} of {stats.total_eligible_voters} eligible voters
                    </p>
                </div>
                <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div
                        className="h-full rounded-full bg-gradient-to-r from-[#800000] to-[#C9A227] transition-all duration-700"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
