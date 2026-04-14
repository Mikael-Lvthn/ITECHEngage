"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishElection, startVoting, closeElection, deleteElection } from "@/lib/actions/elections";
import { Loader2 } from "lucide-react";

interface ElectionAdminControlsProps {
    electionId: string;
    status: "draft" | "published" | "voting" | "closed";
}

export default function ElectionAdminControls({ electionId, status }: ElectionAdminControlsProps) {
    const [isPending, startTransition] = useTransition();
    const [action, setAction] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const router = useRouter();

    const handlePublish = () => {
        setAction("publish");
        startTransition(async () => {
            try {
                await publishElection(electionId);
            } catch (err: any) {
                console.error(err.message);
            } finally {
                setAction(null);
            }
        });
    };

    const handleStartVoting = () => {
        setAction("start");
        startTransition(async () => {
            try {
                await startVoting(electionId);
            } catch (err: any) {
                console.error(err.message);
            } finally {
                setAction(null);
            }
        });
    };

    const handleClose = () => {
        setAction("close");
        startTransition(async () => {
            try {
                await closeElection(electionId);
            } catch (err: any) {
                console.error(err.message);
            } finally {
                setAction(null);
            }
        });
    };

    const handleDelete = () => {
        setAction("delete");
        startTransition(async () => {
            try {
                await deleteElection(electionId);
                router.push("/dashboard/elections");
            } catch (err: any) {
                console.error(err.message);
            } finally {
                setAction(null);
                setShowDeleteConfirm(false);
            }
        });
    };

    if (status === "closed") {
        return (
            <div className="space-y-3">
                <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 p-4">
                    <p className="text-sm text-purple-800 dark:text-purple-300">
                        <strong>Election Closed</strong> — Results have been finalized and members have been notified.
                    </p>
                </div>

                {/* Delete section */}
                {!showDeleteConfirm ? (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-4 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                        Delete Election
                    </button>
                ) : (
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
                )}
            </div>
        );
    }

    return (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-foreground">Admin Controls</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {status === "draft" && "This election is in draft mode. Publish to make it visible on the Homepage."}
                        {status === "published" && "This election is published. Start voting to allow members to cast their votes."}
                        {status === "voting" && "Voting is currently open. Close the election to finalize results."}
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
                            onClick={handleClose}
                            disabled={isPending}
                            className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isPending && action === "close" && <Loader2 className="w-4 h-4 animate-spin" />}
                            Close Election
                        </button>
                    )}
                </div>
            </div>

            {/* Status workflow indicator */}
            <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-xs">
                    <span className={`px-2 py-1 rounded ${status === "draft" ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                        Draft
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">→</span>
                    <span className={`px-2 py-1 rounded ${status === "published" ? "bg-blue-200 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 font-bold" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                        Published
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">→</span>
                    <span className={`px-2 py-1 rounded ${status === "voting" ? "bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold" : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                        Voting
                    </span>
                    <span className="text-gray-300 dark:text-gray-600">→</span>
                    <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                        Closed
                    </span>
                </div>
            </div>
        </div>
    );
}
