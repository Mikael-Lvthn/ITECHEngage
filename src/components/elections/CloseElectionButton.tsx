"use client";

import { useState, useTransition } from "react";
import { closeElection } from "@/lib/actions/elections";

export default function CloseElectionButton({ electionId }: { electionId: string }) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleClose = () => {
        if (!confirm("Are you sure you want to close this election? This action cannot be undone and will stop any further voting.")) {
            return;
        }

        setError(null);
        startTransition(async () => {
            try {
                await closeElection(electionId);
            } catch (err: any) {
                setError(err.message || "Failed to close election");
            }
        });
    };

    return (
        <div className="flex flex-col items-end">
            <button
                onClick={handleClose}
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-[#800000] text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
                {isPending ? "Closing..." : "Close Election"}
            </button>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
    );
}
