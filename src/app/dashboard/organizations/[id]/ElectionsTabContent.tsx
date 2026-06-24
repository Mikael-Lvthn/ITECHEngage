"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { publishElection, startVoting, completeElection } from "@/lib/actions/elections";
import DirectAssignDialog from "@/components/elections/DirectAssignDialog";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/utils/error";

interface Election {
    id: string;
    title: string;
    description: string | null;
    status: "draft" | "published" | "voting" | "completed";
    start_date: string;
    end_date: string | null;
    created_at: string;
}

interface OrgRole {
    id: string;
    title: string;
    hierarchy_level: number;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
}

interface Member {
    user_id: string;
    full_name: string;
}

interface ElectionsTabContentProps {
    organizationId: string;
    organizationName: string;
    elections: Election[];
    roles: OrgRole[];
    members: Member[];
    isAdmin: boolean;
    isOfficer: boolean;
    isMember: boolean;
    canManageRoles: boolean;
}

export default function ElectionsTabContent({
    organizationId,
    organizationName: _organizationName,
    elections,
    roles,
    members,
    isAdmin,
    isOfficer: _isOfficer,
    isMember,
    canManageRoles,
}: ElectionsTabContentProps) {
    const [isPending, startTransition] = useTransition();
    const [actionId, setActionId] = useState<string | null>(null);

    const handlePublish = (electionId: string) => {
        setActionId(electionId);
        startTransition(async () => {
            try {
                await publishElection(electionId);
            } catch (err) {
                console.error(getErrorMessage(err));
            } finally {
                setActionId(null);
            }
        });
    };

    const handleStartVoting = (electionId: string) => {
        setActionId(electionId);
        startTransition(async () => {
            try {
                await startVoting(electionId);
            } catch (err) {
                console.error(getErrorMessage(err));
            } finally {
                setActionId(null);
            }
        });
    };

    const handleClose = (electionId: string) => {
        setActionId(electionId);
        startTransition(async () => {
            try {
                await completeElection(electionId);
            } catch (err) {
                console.error(getErrorMessage(err));
            } finally {
                setActionId(null);
            }
        });
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            draft: "bg-muted text-muted-foreground dark:bg-gray-800 dark:text-gray-300",
            published: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
            voting: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
            completed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        };
        const labels: Record<string, string> = {
            draft: "Draft",
            published: "Published",
            voting: "Voting Open",
            completed: "Completed",
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${styles[status] || styles.draft}`}>
                {labels[status] || status}
            </span>
        );
    };

    // Sort elections: voting first, then published, then draft, then closed
    // Draft elections visible to all approved members (they need to nominate) + admins
    const visibleElections = elections.filter((election) => {
        if (election.status === "draft") {
            return isAdmin || isMember;
        }
        return true;
    });

    const sortedElections = [...visibleElections].sort((a, b) => {
        const order = { voting: 0, published: 1, draft: 2, completed: 3 };
        return (order[a.status] ?? 4) - (order[b.status] ?? 4);
    });

    return (
        <div className="space-y-6">
            {/* Header with Direct Assign button */}
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">Elections</h2>
                {canManageRoles && (
                    <DirectAssignDialog
                        organizationId={organizationId}
                        roles={roles}
                        members={members}
                    />
                )}
            </div>

            {/* Elections list */}
            {sortedElections.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
                    <div className="w-14 h-14 mx-auto bg-muted rounded-full flex items-center justify-center text-2xl mb-4">
                        🗳️
                    </div>
                    <h3 className="text-lg font-bold text-foreground">No Elections Yet</h3>
                    <p className="text-muted-foreground mt-2 text-sm max-w-sm mx-auto">
                        {isAdmin
                            ? "Create an election from the Elections page to get started."
                            : "No elections have been created for this organization yet."}
                    </p>
                    {isAdmin && (
                        <Link
                            href="/dashboard/elections"
                            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                        >
                            Go to Elections
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedElections.map((election) => (
                        <div
                            key={election.id}
                            className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        {getStatusBadge(election.status)}
                                        <h3 className="font-bold text-foreground truncate">
                                            {election.title}
                                        </h3>
                                    </div>
                                    {election.description && (
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                            {election.description}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            📅 {new Date(election.start_date).toLocaleDateString()}
                                            {election.end_date && ` — ${new Date(election.end_date).toLocaleDateString()}`}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    {/* Admin actions based on status */}
                                    {isAdmin && election.status === "draft" && (
                                        <button
                                            onClick={() => handlePublish(election.id)}
                                            disabled={isPending && actionId === election.id}
                                            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {isPending && actionId === election.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Publish
                                        </button>
                                    )}
                                    {isAdmin && election.status === "published" && (
                                        <button
                                            onClick={() => handleStartVoting(election.id)}
                                            disabled={isPending && actionId === election.id}
                                            className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {isPending && actionId === election.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Start Voting
                                        </button>
                                    )}
                                    {isAdmin && election.status === "voting" && (
                                        <button
                                            onClick={() => handleClose(election.id)}
                                            disabled={isPending && actionId === election.id}
                                            className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                                        >
                                            {isPending && actionId === election.id && <Loader2 className="w-3 h-3 animate-spin" />}
                                            Close Election
                                        </button>
                                    )}

                                    <Link
                                        href={`/dashboard/elections/${election.id}`}
                                        className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-accent transition-colors"
                                    >
                                        View Details
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info card about election workflow */}
            {isAdmin && elections.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800 p-4">
                    <h4 className="font-semibold text-blue-900 text-sm mb-2">Election Workflow</h4>
                    <div className="flex items-center gap-2 text-xs text-blue-800">
                        <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">Draft</span>
                        <span>→</span>
                        <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-700 font-medium">Published</span>
                        <span>→</span>
                        <span className="px-2 py-0.5 rounded bg-green-200 text-green-700 font-medium">Voting</span>
                        <span>→</span>
                        <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-700 font-medium">Closed</span>
                    </div>
                    <p className="text-xs text-blue-700 mt-2">
                        Draft elections are only visible here. Published elections appear on the Homepage. Voting opens the election for members to cast votes. Closing finalizes results.
                    </p>
                </div>
            )}
        </div>
    );
}
