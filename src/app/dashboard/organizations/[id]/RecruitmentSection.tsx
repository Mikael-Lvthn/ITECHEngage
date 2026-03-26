"use client";

import { useState } from "react";
import { createRecruitment, closeRecruitment } from "@/lib/actions/recruitment";
import { joinOrganization } from "@/lib/actions/organizations";

interface RecruitmentRequest {
    id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
}

interface RecruitmentSectionProps {
    organizationId: string;
    recruitments: RecruitmentRequest[];
    isOfficer: boolean;
    membershipStatus: string;
}

export default function RecruitmentSection({
    organizationId,
    recruitments,
    isOfficer,
    membershipStatus,
}: RecruitmentSectionProps) {
    const [showForm, setShowForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [applyingId, setApplyingId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [applied, setApplied] = useState(false);

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const formData = new FormData(e.currentTarget);
            formData.set("organization_id", organizationId);
            await createRecruitment(formData);
            setShowForm(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create recruitment");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = async (recruitmentId: string) => {
        setLoading(true);
        try {
            await closeRecruitment(recruitmentId, organizationId);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (recruitmentId: string) => {
        setApplyingId(recruitmentId);
        try {
            await joinOrganization(organizationId);
            setApplied(true);
        } catch (err) {
            console.error(err);
        } finally {
            setApplyingId(null);
        }
    };

    const activeRecruitments = recruitments.filter((r) => r.is_active);

    if (activeRecruitments.length === 0 && !isOfficer) {
        return null;
    }

    return (
        <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                    📢 Recruitment
                    {activeRecruitments.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                            {activeRecruitments.length} open
                        </span>
                    )}
                </h2>
                {isOfficer && (
                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Post Recruitment
                    </button>
                )}
            </div>

            {/* Create Form (Officer Only) */}
            {showForm && isOfficer && (
                <form onSubmit={handleCreate} className="mb-4 p-4 rounded-lg border bg-background space-y-3">
                    <div>
                        <label className="block text-xs font-medium mb-1">
                            Title <span className="text-destructive">*</span>
                        </label>
                        <input
                            name="title"
                            required
                            placeholder="e.g. Looking for Event Committee Members"
                            className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1">Description</label>
                        <textarea
                            name="description"
                            rows={2}
                            placeholder="Brief description of what you're looking for..."
                            className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                        />
                    </div>
                    {error && (
                        <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                            {error}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? "Posting..." : "Post Request"}
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowForm(false)}
                            className="px-4 py-2 rounded-lg border text-xs font-medium hover:bg-accent transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Active Recruitment Requests */}
            {activeRecruitments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                    No active recruitment requests.
                </p>
            ) : (
                <div className="space-y-3">
                    {activeRecruitments.map((req) => (
                        <div
                            key={req.id}
                            className="rounded-lg border p-4 hover:shadow-sm transition-shadow"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="font-medium text-sm">{req.title}</h3>
                                    {req.description && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {req.description}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-2">
                                        Posted {new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    {isOfficer ? (
                                        <button
                                            onClick={() => handleClose(req.id)}
                                            disabled={loading}
                                            className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                        >
                                            Close
                                        </button>
                                    ) : membershipStatus === "none" && !applied ? (
                                        <button
                                            onClick={() => handleApply(req.id)}
                                            disabled={applyingId === req.id}
                                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                                        >
                                            {applyingId === req.id ? "Applying..." : "Apply"}
                                        </button>
                                    ) : membershipStatus === "pending" || applied ? (
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium">
                                            ⏳ Pending
                                        </span>
                                    ) : membershipStatus === "approved" ? (
                                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-green-100 text-green-700 text-xs font-medium">
                                            ✅ Member
                                        </span>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
