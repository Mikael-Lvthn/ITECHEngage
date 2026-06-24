"use client";

import { useState, useTransition } from "react";
import { createRecruitment, closeRecruitment } from "@/lib/actions/recruitment";
import { getErrorMessage } from "@/lib/utils/error";

interface Position {
    id: string;
    title: string;
    organization_id: string;
    organization: { id: string; name: string };
}

interface Recruitment {
    id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    organization_id: string;
    organizations: { name: string } | null;
}

interface Props {
    positions: Position[];
    recruitments: Recruitment[];
}

export default function RecruitmentPageClient({ positions, recruitments }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const orgs = positions.reduce<{ id: string; name: string }[]>((acc, p) => {
        if (!acc.find((o) => o.id === p.organization.id)) {
            acc.push({ id: p.organization.id, name: p.organization.name });
        }
        return acc;
    }, []);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        const fd = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await createRecruitment(fd);
                (e.target as HTMLFormElement).reset();
                setSuccess(true);
            } catch (err) {
                setError(getErrorMessage(err));
            }
        });
    }

    function handleClose(recruitmentId: string, organizationId: string) {
        startTransition(async () => {
            try {
                await closeRecruitment(recruitmentId, organizationId);
            } catch (err) {
                setError(getErrorMessage(err));
            }
        });
    }

    const activeOnes = recruitments.filter((r) => r.is_active);
    const closedOnes = recruitments.filter((r) => !r.is_active);

    return (
        <div className="space-y-8 max-w-4xl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Recruitment</h1>
                <p className="text-muted-foreground mt-1">
                    Post and manage recruitment opportunities for your organization.
                </p>
            </div>

            {/* Post Recruitment Form */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                    <h2 className="font-semibold text-foreground">📋 Post Recruitment</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Create a new recruitment post for your organization</p>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {orgs.length > 1 && (
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">
                                Organization <span className="text-destructive">*</span>
                            </label>
                            <select
                                name="organization_id"
                                required
                                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                {orgs.map((o) => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    {orgs.length === 1 && (
                        <input type="hidden" name="organization_id" value={orgs[0].id} />
                    )}

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">
                            Position / Role Title <span className="text-destructive">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            required
                            placeholder="e.g. Secretary, Public Relations Officer..."
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Description</label>
                        <textarea
                            name="description"
                            rows={3}
                            placeholder="Describe the role, responsibilities, and requirements..."
                            className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
                    )}
                    {success && (
                        <p className="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
                            ✓ Recruitment post created successfully!
                        </p>
                    )}

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Posting..." : "Post Recruitment"}
                        </button>
                    </div>
                </form>
            </section>

            {/* My Active Posts */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#C9A227]/5 to-transparent">
                    <h2 className="font-semibold text-foreground">📌 My Active Posts</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{activeOnes.length} active recruitment post{activeOnes.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="p-4">
                    {activeOnes.length === 0 ? (
                        <div className="py-8 text-center text-muted-foreground">
                            <p className="text-3xl mb-2">📋</p>
                            <p className="text-sm">No active recruitment posts. Create one above!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeOnes.map((r) => (
                                <div key={r.id} className="flex items-start gap-4 p-4 rounded-xl border hover:bg-accent/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800">
                                                ● Active
                                            </span>
                                            <span className="text-xs text-muted-foreground">{r.organizations?.name}</span>
                                        </div>
                                        <p className="font-semibold mt-1">{r.title}</p>
                                        {r.description && (
                                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Posted {new Date(r.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleClose(r.id, r.organization_id)}
                                        disabled={isPending}
                                        className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                                    >
                                        Close
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Closed posts */}
            {closedOnes.length > 0 && (
                <section className="rounded-xl border bg-card overflow-hidden opacity-60">
                    <div className="px-6 py-4 border-b">
                        <h2 className="font-semibold text-muted-foreground text-sm">Closed Posts ({closedOnes.length})</h2>
                    </div>
                    <div className="p-4 space-y-2">
                        {closedOnes.map((r) => (
                            <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border shrink-0">
                                    Closed
                                </span>
                                <p className="text-sm font-medium flex-1 truncate">{r.title}</p>
                                <p className="text-xs text-muted-foreground shrink-0">{r.organizations?.name}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
