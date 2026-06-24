"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishElection, startVoting, completeElection, deleteElection } from "@/lib/actions/elections";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/utils/error";

interface ElectionAdminControlsProps {
    electionId: string;
    status: "draft" | "published" | "voting" | "completed";
}

export default function ElectionAdminControls({ electionId, status }: ElectionAdminControlsProps) {
    const [isPending, startTransition] = useTransition();
    const [action, setAction] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const router = useRouter();

    const handlePublish = () => {
        setAction("publish");
        setErrorMessage(null);
        startTransition(async () => {
            try {
                await publishElection(electionId);
            } catch (err) {
                setErrorMessage(getErrorMessage(err) || "Failed to publish election.");
            } finally {
                setAction(null);
            }
        });
    };

    const handleStartVoting = () => {
        setAction("start");
        setErrorMessage(null);
        startTransition(async () => {
            try {
                await startVoting(electionId);
            } catch (err) {
                setErrorMessage(getErrorMessage(err) || "Failed to start voting.");
            } finally {
                setAction(null);
            }
        });
    };

    const handleComplete = () => {
        setAction("complete");
        setErrorMessage(null);
        startTransition(async () => {
            try {
                await completeElection(electionId);
            } catch (err) {
                setErrorMessage(getErrorMessage(err) || "Failed to complete election.");
            } finally {
                setAction(null);
            }
        });
    };

    const handleDelete = () => {
        setAction("delete");
        setErrorMessage(null);
        startTransition(async () => {
            try {
                await deleteElection(electionId);
                router.push("/dashboard/elections");
            } catch (err) {
                setErrorMessage(getErrorMessage(err) || "Failed to delete election.");
            } finally {
                setAction(null);
                setShowDeleteConfirm(false);
            }
        });
    };

    const statusDescriptions: Record<string, string> = {
        draft: "This election is in draft mode. Publish to make it visible on the Homepage.",
        published: "This election is published. Start voting to allow members to cast their votes.",
        voting: "Voting is currently open. Complete the election to finalize results.",
        completed: "This election has been completed. Results have been finalized.",
    };

    // Delete confirmation block (reusable across all phases)
    const deleteConfirmBlock = showDeleteConfirm ? (
        <div className="rounded-xl border border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4 animate-scale-in">
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                    <span className="text-lg">⚠️</span>
                </div>
                <div className="flex-1">
                    <h4 className="font-semibold text-red-800 dark:text-red-300 text-sm">
                        Are you sure you want to delete this election?
                    </h4>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        This action cannot be undone. All candidates, votes, and results associated with this election will be permanently deleted.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <button
                            onClick={handleDelete}
                            disabled={isPending && action === "delete"}
                            className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && action === "delete" && <Loader2 className="w-3 h-3 animate-spin" />}
                            Yes, Delete Permanently
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-4 py-1.5 rounded-lg border text-sm font-medium hover:bg-card transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : null;

    // Error message display
    const errorBlock = errorMessage ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-3 flex items-start gap-2">
            <span className="text-amber-600 dark:text-amber-400 text-sm shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1">
                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">{errorMessage}</p>
            </div>
            <button
                onClick={() => setErrorMessage(null)}
                className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 text-sm shrink-0"
            >
                ✕
            </button>
        </div>
    ) : null;

    if (status === "completed") {
        return (
            <div className="space-y-3">
                <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4">
                    <p className="text-sm text-green-800 dark:text-green-300">
                        <strong>Election Completed</strong> — Results have been finalized and members have been notified.
                    </p>
                </div>

                {errorBlock}

                {/* Delete section */}
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                        Delete Election
                    </button>
                ) : (
                    deleteConfirmBlock
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">Admin Controls</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {statusDescriptions[status]}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {status === "draft" && (
                        <button
                            onClick={handlePublish}
                            disabled={isPending}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && action === "publish" && <Loader2 className="w-4 h-4 animate-spin" />}
                            Publish Election
                        </button>
                    )}

                    {status === "published" && (
                        <button
                            onClick={handleStartVoting}
                            disabled={isPending}
                            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && action === "start" && <Loader2 className="w-4 h-4 animate-spin" />}
                            Start Voting
                        </button>
                    )}

                    {status === "voting" && (
                        <button
                            onClick={handleComplete}
                            disabled={isPending}
                            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && action === "complete" && <Loader2 className="w-4 h-4 animate-spin" />}
                            Complete Election
                        </button>
                    )}

                    {/* Delete button — available in all non-completed phases */}
                    {!showDeleteConfirm && (
                        <button
                            onClick={() => { setShowDeleteConfirm(true); setErrorMessage(null); }}
                            disabled={isPending}
                            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                        >
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Error message */}
            {errorBlock}

            {/* Delete confirmation */}
            {deleteConfirmBlock}

            {/* Status workflow indicator */}
            <div className="pt-3 border-t">
                <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded ${status === "draft" ? "bg-muted dark:bg-gray-700 text-foreground dark:text-gray-200 font-bold" : "bg-muted dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground"}`}>
                        Draft
                    </span>
                    <span className="text-gray-300 dark:text-muted-foreground">→</span>
                    <span className={`px-2 py-1 rounded ${status === "published" ? "bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold" : "bg-muted dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground"}`}>
                        Published
                    </span>
                    <span className="text-gray-300 dark:text-muted-foreground">→</span>
                    <span className={`px-2 py-1 rounded ${status === "voting" ? "bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold" : "bg-muted dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground"}`}>
                        Voting
                    </span>
                    <span className="text-gray-300 dark:text-muted-foreground">→</span>
                    <span className="px-2 py-1 rounded bg-muted dark:bg-gray-800 text-muted-foreground dark:text-muted-foreground">
                        Completed
                    </span>
                </div>
            </div>
        </div>
    );
}
