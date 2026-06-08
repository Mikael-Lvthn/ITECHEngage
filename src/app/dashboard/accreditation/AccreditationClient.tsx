"use client";

import { useState, useTransition } from "react";
import { submitAccreditation, approveAccreditation, rejectAccreditation } from "@/lib/actions/accreditation";
import { useRouter } from "next/navigation";

interface AccreditationEntry {
    id: string;
    organization_id: string;
    academic_year: string;
    status: string;
    documents_url: string | null;
    notes: string | null;
    submitted_at: string;
    submitted_by: string | null;
    reviewed_at: string | null;
    organizations: { name: string } | null;
    submitter?: { full_name: string } | null;
}

interface OfficerOrg {
    id: string;
    name: string;
}

type ActiveView = "pending" | "history" | "submit";

interface AccreditationClientProps {
    isAdmin: boolean;
    isOfficer: boolean;
    pendingAccreditations: AccreditationEntry[];
    accreditationHistory: AccreditationEntry[];
    officerOrgs: OfficerOrg[];
}

export default function AccreditationClient({
    isAdmin,
    isOfficer,
    pendingAccreditations,
    accreditationHistory,
    officerOrgs,
}: AccreditationClientProps) {
    const router = useRouter();
    const [activeView, setActiveView] = useState<ActiveView>("pending");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [rejectingId, setRejectingId] = useState<string | null>(null);
    const [rejectionNotes, setRejectionNotes] = useState("");

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await submitAccreditation(formData);
                setSuccess("Accreditation application submitted successfully!");
                setActiveView("pending");
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Submission failed.");
            }
        });
    };

    const handleApprove = (id: string) => {
        startTransition(async () => {
            try {
                await approveAccreditation(id);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Approval failed.");
            }
        });
    };

    const handleReject = (id: string) => {
        startTransition(async () => {
            try {
                await rejectAccreditation(id, rejectionNotes);
                setRejectingId(null);
                setRejectionNotes("");
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Rejection failed.");
            }
        });
    };

    const views: { key: ActiveView; label: string; icon: string; show: boolean }[] = [
        { key: "pending", label: "Pending Review", icon: "⏳", show: true },
        { key: "history", label: "History", icon: "📋", show: true },
        { key: "submit", label: "Submit Application", icon: "📝", show: isOfficer },
    ];

    return (
        <div className="space-y-6">
            {/* View Tabs */}
            <div className="border-b border-border">
                <div className="flex gap-1 overflow-x-auto">
                    {views
                        .filter((v) => v.show)
                        .map((view) => (
                            <button
                                key={view.key}
                                onClick={() => {
                                    setActiveView(view.key);
                                    setError("");
                                    setSuccess("");
                                }}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeView === view.key
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                }`}
                            >
                                <span>{view.icon}</span>
                                {view.label}
                                {view.key === "pending" && pendingAccreditations.length > 0 && (
                                    <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {pendingAccreditations.length}
                                    </span>
                                )}
                            </button>
                        ))}
                </div>
            </div>

            {/* Alerts */}
            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
            )}
            {success && (
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">{success}</div>
            )}

            {/* Pending Review */}
            {activeView === "pending" && (
                <section className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-500/5 to-transparent">
                        <h3 className="font-semibold text-foreground">⏳ Pending Accreditation Applications</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {isAdmin ? "Review and process applications" : "Track your submitted applications"}
                        </p>
                    </div>
                    <div className="p-4">
                        {pendingAccreditations.length === 0 ? (
                            <div className="py-8 text-center">
                                <span className="text-3xl block mb-2">✅</span>
                                <p className="text-sm text-muted-foreground">No pending accreditation applications.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pendingAccreditations.map((acc) => (
                                    <div key={acc.id} className="p-4 rounded-lg border bg-muted/50">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold">
                                                    {acc.organizations?.name || "Unknown Organization"}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Academic Year: <span className="font-medium">{acc.academic_year}</span>
                                                </p>
                                                {acc.submitter?.full_name && (
                                                    <p className="text-xs text-muted-foreground">
                                                        Submitted by: {acc.submitter.full_name}
                                                    </p>
                                                )}
                                                <p className="text-xs text-muted-foreground">
                                                    {new Date(acc.submitted_at).toLocaleDateString()}
                                                </p>
                                                {acc.documents_url && (
                                                    <a
                                                        href={acc.documents_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
                                                    >
                                                        📎 View Documents
                                                    </a>
                                                )}
                                                {acc.notes && (
                                                    <p className="text-xs text-muted-foreground mt-1 italic">
                                                        Notes: {acc.notes}
                                                    </p>
                                                )}
                                            </div>
                                            {isAdmin && (
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    {rejectingId === acc.id ? (
                                                        <div className="space-y-2 w-48">
                                                            <textarea
                                                                value={rejectionNotes}
                                                                onChange={(e) => setRejectionNotes(e.target.value)}
                                                                placeholder="Reason for rejection (optional)..."
                                                                rows={2}
                                                                className="w-full px-3 py-2 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                                            />
                                                            <div className="flex gap-1.5">
                                                                <button
                                                                    onClick={() => handleReject(acc.id)}
                                                                    disabled={isPending}
                                                                    className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                                                >
                                                                    {isPending ? "..." : "Confirm"}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setRejectingId(null);
                                                                        setRejectionNotes("");
                                                                    }}
                                                                    className="px-2 py-1.5 text-xs font-semibold rounded-lg border hover:bg-accent transition-colors"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(acc.id)}
                                                                disabled={isPending}
                                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                                            >
                                                                {isPending ? "..." : "Approve"}
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectingId(acc.id)}
                                                                disabled={isPending}
                                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                                            >
                                                                Reject
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* History */}
            {activeView === "history" && (
                <section className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-500/5 to-transparent">
                        <h3 className="font-semibold text-foreground">📋 Accreditation History</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Past accreditation decisions</p>
                    </div>
                    <div className="p-4">
                        {accreditationHistory.length === 0 ? (
                            <div className="py-8 text-center">
                                <span className="text-3xl block mb-2">📋</span>
                                <p className="text-sm text-muted-foreground">No accreditation history yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {accreditationHistory.map((acc) => (
                                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">
                                                {acc.organizations?.name || "Unknown Org"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {acc.academic_year} · Reviewed{" "}
                                                {acc.reviewed_at
                                                    ? new Date(acc.reviewed_at).toLocaleDateString()
                                                    : "N/A"}
                                            </p>
                                            {acc.notes && (
                                                <p className="text-xs text-muted-foreground mt-0.5 italic line-clamp-1">
                                                    {acc.notes}
                                                </p>
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ml-3 ${
                                                acc.status === "approved"
                                                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                                    : acc.status === "rejected"
                                                    ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                    : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                            }`}
                                        >
                                            {acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Submit New Application */}
            {activeView === "submit" && isOfficer && (
                <section className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gradient-to-r from-[#22543D]/5 to-transparent">
                        <h3 className="font-semibold text-foreground">📝 Submit Accreditation Application</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Submit an accreditation application for your organization
                        </p>
                    </div>
                    <div className="p-6">
                        {officerOrgs.length === 0 ? (
                            <div className="py-8 text-center">
                                <span className="text-3xl block mb-2">🏢</span>
                                <p className="text-sm text-muted-foreground">
                                    You are not an officer of any organization. Only officers can submit accreditation applications.
                                </p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Organization <span className="text-destructive">*</span>
                                    </label>
                                    <select
                                        name="organization_id"
                                        required
                                        className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    >
                                        <option value="">Select an organization</option>
                                        {officerOrgs.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Academic Year <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        name="academic_year"
                                        required
                                        placeholder="e.g., 2025-2026"
                                        className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Documents URL
                                    </label>
                                    <input
                                        name="documents_url"
                                        type="url"
                                        placeholder="https://drive.google.com/..."
                                        className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Link to your accreditation documents (Google Drive, etc.)
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">
                                        Notes
                                    </label>
                                    <textarea
                                        name="notes"
                                        rows={3}
                                        placeholder="Any additional information for the reviewer..."
                                        className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isPending ? "Submitting..." : "Submit Application"}
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
}
