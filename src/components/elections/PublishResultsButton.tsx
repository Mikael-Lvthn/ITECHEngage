"use client";

import { useState, useTransition } from "react";
import { publishElectionResults } from "@/lib/actions/elections";

interface PublishResultsButtonProps {
    electionId: string;
}

export default function PublishResultsButton({ electionId }: PublishResultsButtonProps) {
    const [isPending, startTransition] = useTransition();
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handlePublish = () => {
        setError(null);
        startTransition(async () => {
            try {
                await publishElectionResults(electionId);
            } catch (err: any) {
                setError(err.message || "Failed to publish results.");
            }
        });
    };

    return (
        <div>
            {!showConfirm ? (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C9A227] text-[#2B2B2B] text-sm font-semibold hover:bg-[#B8911E] transition-colors shadow-sm"
                >
                    <span>📊</span> Publish Results & Assign Winners
                </button>
            ) : (
                <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200 space-y-3">
                    <p className="text-sm font-medium text-yellow-800">
                        ⚠️ This will close the election and assign the winners to their roles. This action cannot be undone.
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={handlePublish}
                            disabled={isPending}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Publishing..." : "Confirm & Publish"}
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

            {error && (
                <div className="mt-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    {error}
                </div>
            )}
        </div>
    );
}
