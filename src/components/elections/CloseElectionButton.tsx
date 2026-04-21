"use client";

import { useState, useTransition } from "react";
import { completeElection } from "@/lib/actions/elections";

export default function CloseElectionButton({ electionId }: { electionId: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleComplete = () => {
        if (!confirm("Are you sure you want to complete this election? This action cannot be undone and will stop any further voting.")) {
            return;
        }

        setError(null);
        startTransition(async () => {
            try {
                await completeElection(electionId);
            } catch (err: any) {
                setError(err.message || "Failed to complete election");
            }
        });
    };

    return (
        <div className="flex flex-col items-end">
            <button
                onClick={handleComplete}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-[#800000] text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
                {isPending ? "Completing..." : "Complete Election"}
            </button>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}
