"use client";

import { useState, useTransition } from "react";
import { submitAccreditation, updateAccreditationStatus, deleteAccreditationHistory } from "@/lib/actions/accreditation";
import { useRouter } from "next/navigation";
import DocumentChecklist, { AccreditationRequirement } from "@/components/accreditation/DocumentChecklist";
import RecordDecisionModal, { DecisionStatus } from "@/components/accreditation/RecordDecisionModal";
import AccreditationTimeline from "@/components/accreditation/AccreditationTimeline";
import DocumentViewerModal from "@/components/accreditation/DocumentViewerModal";
import { createClient } from "@/lib/supabase/client";

/* ─── HistoryCard sub-component ─────────────────────────────────────── */
interface HistoryDoc { id: string; file_name: string; storage_path: string; requirement_id: string; downloadUrl?: string; }
interface HistoryAcc {
    id: string;
    academic_year: string;
    status: string;
    notes: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    organizations: { name: string } | null;
    submitter?: { full_name: string } | null;
    accreditation_documents?: HistoryDoc[] | null;
}

function HistoryCard({
    acc,
    isAdmin,
    onDocumentClick,
}: {
    acc: HistoryAcc;
    isAdmin: boolean;
    onDocumentClick: (doc: HistoryDoc) => void;
}) {
    const [deleting, startDelete] = useTransition();
    const router = useRouter();

    const statusColor =
        acc.status === "approved"
            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
            : acc.status === "rejected"
            ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";

    function handleDelete() {
        if (!confirm(`Delete the accreditation record for "${acc.organizations?.name}" (${acc.academic_year})? This cannot be undone and will also remove it from officers' history.`)) return;
        startDelete(async () => {
            try {
                await deleteAccreditationHistory(acc.id);
                router.refresh();
            } catch (err) {
                alert(err instanceof Error ? err.message : "Delete failed.");
            }
        });
    }

    return (
        <div className="p-4 rounded-lg border bg-muted/50 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{acc.organizations?.name || "Unknown Organization"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Academic Year: <span className="font-medium">{acc.academic_year}</span>
                    </p>
                    {acc.submitter?.full_name && (
                        <p className="text-xs text-muted-foreground">Submitted by: {acc.submitter.full_name}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                        Submitted: {new Date(acc.submitted_at).toLocaleDateString()}
                        {acc.reviewed_at && (
                            <> · Reviewed: {new Date(acc.reviewed_at).toLocaleDateString()}</>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor}`}>
                        {acc.status === "revalidation_required" ? "Revalidation Required" : acc.status.charAt(0).toUpperCase() + acc.status.slice(1)}
                    </span>
                    {isAdmin && (
                        <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                            {deleting ? "Deleting…" : "🗑 Delete"}
                        </button>
                    )}
                </div>
            </div>

            {/* Notes */}
            {acc.notes && (
                <div className="px-3 py-2 rounded-md bg-background border text-xs text-muted-foreground italic">
                    📝 {acc.notes}
                </div>
            )}

            {/* Uploaded documents */}
            {acc.accreditation_documents && acc.accreditation_documents.length > 0 && (
                <div>
                    <p className="text-xs font-semibold mb-2">Submitted Documents ({acc.accreditation_documents.length}):</p>
                    <div className="flex flex-wrap gap-2">
                        {acc.accreditation_documents.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => onDocumentClick(doc)}
                                className="flex items-center gap-1.5 text-xs bg-background hover:bg-accent border px-2 py-1.5 rounded transition-colors text-left"
                            >
                                <span>📄</span>
                                <span className="truncate max-w-[160px]">{doc.file_name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
/* ─────────────────────────────────────────────────────────────────── */

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
    accreditation_documents?: { id: string; file_name: string; storage_path: string; requirement_id: string; downloadUrl?: string }[] | null;
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
    requirements: AccreditationRequirement[];
}

export default function AccreditationClient({
    isAdmin,
    isOfficer,
    pendingAccreditations,
    accreditationHistory,
    officerOrgs,
    requirements,
}: AccreditationClientProps) {
    const router = useRouter();
    const [activeView, setActiveView] = useState<ActiveView>(isAdmin ? "pending" : isOfficer ? "submit" : "pending");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [recordingDecisionFor, setRecordingDecisionFor] = useState<{ id: string; orgName: string } | null>(null);

    const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
    const [viewingDocument, setViewingDocument] = useState<{url: string, name: string} | null>(null);

    const handleDocumentClick = async (doc: { downloadUrl?: string; storage_path: string; file_name: string }) => {
        if (doc.downloadUrl) {
            setViewingDocument({ url: doc.downloadUrl, name: doc.file_name });
            return;
        }
        try {
            const supabase = createClient();
            const { data, error } = await supabase.storage
                .from("accreditation-documents")
                .createSignedUrl(doc.storage_path, 3600);
            if (error) throw error;
            setViewingDocument({ url: data.signedUrl, name: doc.file_name });
        } catch (err) {
            console.error("Failed to load document:", err);
            alert("Could not load the document. Please try downloading it or contact support.");
        }
    };

    const handleFileSelect = (requirementId: string, file: File) => {
        setSelectedFiles(prev => ({ ...prev, [requirementId]: file }));
    };

    const revalidationNames = ['Constitution and By-Laws (CBL)', 'Resolutions', 'Memorandum Order', 'List of Officers/ Organizational Chart', 'General Plan of Activities (GPOA)', 'Minutes of the Meetings', 'Narrative Reports', 'Financial Report', 'Turnover Documents'];

    const isSubmissionComplete = requirements
        .filter(r => revalidationNames.includes(r.name) && r.is_required)
        .every(r => selectedFiles[r.id]);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!isSubmissionComplete) {
            setError("Please upload all required documents.");
            return;
        }

        const formData = new FormData(e.currentTarget);
        // Append all selected files
        Object.entries(selectedFiles).forEach(([reqId, file]) => {
            formData.append(`file_${reqId}`, file);
        });

        startTransition(async () => {
            try {
                await submitAccreditation(formData);
                setSuccess("Accreditation application submitted successfully!");
                setActiveView("pending");
                setSelectedFiles({}); // Clear form state
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Submission failed.");
            }
        });
    };

    const handleRecordDecision = async (status: DecisionStatus, notes?: string, expiresAt?: string) => {
        if (!recordingDecisionFor) return;

        try {
            await updateAccreditationStatus(recordingDecisionFor.id, status, notes, expiresAt);
            router.refresh();
        } catch (err) {
            throw err;
        }
    };

    const handleProgressUpdate = async (accreditationId: string, newStatus: 'pending' | 'forwarded' | 'deliberating' | 'decision_received') => {
        try {
            await updateAccreditationStatus(accreditationId, newStatus);
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to update progress.");
        }
    };

    const views: { key: ActiveView; label: string; icon: string; show: boolean }[] = [
        { key: "submit", label: "Submit Application", icon: "📝", show: isOfficer && !isAdmin },
        { key: "pending", label: "Pending Review", icon: "⏳", show: true },
        { key: "history", label: "History", icon: "📋", show: true },
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

            {/* Modal */}
            {recordingDecisionFor && (
                <RecordDecisionModal
                    accreditationId={recordingDecisionFor.id}
                    organizationName={recordingDecisionFor.orgName}
                    onClose={() => setRecordingDecisionFor(null)}
                    onSave={handleRecordDecision}
                />
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
                                                {acc.accreditation_documents && acc.accreditation_documents.length > 0 && (
                                                    <div className="mt-3 space-y-1">
                                                        <p className="text-xs font-semibold">Uploaded Documents:</p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {acc.accreditation_documents.map(doc => (
                                                                <button
                                                                    key={doc.id}
                                                                    onClick={() => handleDocumentClick(doc)}
                                                                    className="flex items-center gap-1.5 text-xs bg-background hover:bg-accent border px-2 py-1.5 rounded transition-colors text-left"
                                                                >
                                                                    <span>📄</span>
                                                                    <span className="truncate max-w-[150px]">{doc.file_name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {acc.notes && (
                                                    <p className="text-xs text-muted-foreground mt-2 italic">
                                                        Notes: {acc.notes}
                                                    </p>
                                                )}
                                            </div>
                                            {isAdmin && (
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    {acc.status === "pending" && (
                                                        <button
                                                            onClick={() => handleProgressUpdate(acc.id, "forwarded")}
                                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                                                        >
                                                            Acknowledge & Forward
                                                        </button>
                                                    )}
                                                    {acc.status === "forwarded" && (
                                                        <button
                                                            onClick={() => handleProgressUpdate(acc.id, "deliberating")}
                                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
                                                        >
                                                            Begin Deliberation
                                                        </button>
                                                    )}
                                                    {acc.status === "deliberating" && (
                                                        <button
                                                            onClick={() => handleProgressUpdate(acc.id, "decision_received")}
                                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors"
                                                        >
                                                            Receive Decision
                                                        </button>
                                                    )}
                                                    {acc.status === "decision_received" && (
                                                        <button
                                                            onClick={() => setRecordingDecisionFor({
                                                                id: acc.id,
                                                                orgName: acc.organizations?.name || "Unknown Organization"
                                                            })}
                                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                                                        >
                                                            Record Decision
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className="mt-6 pt-4 border-t">
                                            <h4 className="text-sm font-semibold mb-4">Tracking</h4>
                                            <AccreditationTimeline
                                                status={acc.status}
                                                submittedAt={acc.submitted_at}
                                                reviewedAt={acc.reviewed_at}
                                            />
                                        </div>
                                        <div className="mt-6 pt-4 border-t flex justify-end">
                                            <a
                                                href={`/dashboard/accreditation/${acc.id}/manifest`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2 text-sm font-medium rounded-lg border bg-background hover:bg-accent text-foreground transition-colors inline-flex items-center gap-2"
                                            >
                                                📄 Export for Commission
                                            </a>
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
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {isAdmin ? "All completed accreditation records — only admins can delete entries" : "Past accreditation decisions for your organizations"}
                        </p>
                    </div>
                    <div className="p-4">
                        {accreditationHistory.length === 0 ? (
                            <div className="py-8 text-center">
                                <span className="text-3xl block mb-2">📋</span>
                                <p className="text-sm text-muted-foreground">No accreditation history yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {accreditationHistory.map((acc) => (
                                    <HistoryCard
                                        key={acc.id}
                                        acc={acc}
                                        isAdmin={isAdmin}
                                        onDocumentClick={handleDocumentClick}
                                    />
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
                            <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>
                                
                                <div className="pt-4 border-t">
                                    <h4 className="text-sm font-semibold mb-3">Required Documents</h4>
                                    <DocumentChecklist
                                        requirements={requirements}
                                        selectedFiles={selectedFiles}
                                        onFileSelect={handleFileSelect}
                                    />
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
                                    disabled={isPending || !isSubmissionComplete}
                                    className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isPending ? "Submitting..." : "Submit Application"}
                                </button>
                            </form>
                        )}
                    </div>
                </section>
            )}

            {viewingDocument && (
                <DocumentViewerModal
                    fileUrl={viewingDocument.url}
                    fileName={viewingDocument.name}
                    onClose={() => setViewingDocument(null)}
                />
            )}
        </div>
    );
}
