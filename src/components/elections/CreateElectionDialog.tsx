"use client";

import { useState, useTransition } from "react";
import { createElection } from "@/lib/actions/elections";

interface CreateElectionDialogProps {
    organizations: { id: string; name: string }[];
}

export default function CreateElectionDialog({ organizations }: CreateElectionDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            try {
                await createElection(formData);
                setOpen(false);
            } catch (err: any) {
                setError(err.message || "Failed to create election.");
            }
        });
    };

    if (organizations.length === 0) return null;

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
                <span>+</span> Create Election
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border animate-scale-in overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/10 to-transparent">
                                <h2 className="text-lg font-bold">Create Election</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">Set up a new election for an organization</p>
                            </div>

                            <form onSubmit={handleSubmit}>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Organization *</label>
                                        <select
                                            name="organization_id"
                                            required
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        >
                                            <option value="">Select organization...</option>
                                            {organizations.map((org) => (
                                                <option key={org.id} value={org.id}>
                                                    {org.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Election Title *</label>
                                        <input
                                            name="title"
                                            required
                                            placeholder="e.g. 2026-2027 Officer Elections"
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Description (optional)</label>
                                        <textarea
                                            name="description"
                                            rows={2}
                                            placeholder="Brief description of the election..."
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Start Date *</label>
                                            <input
                                                type="datetime-local"
                                                name="start_date"
                                                required
                                                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5 flex items-center gap-1">
                                                End Date <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                            </label>
                                            <input
                                                type="datetime-local"
                                                name="end_date"
                                                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            />
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                            {error}
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-4 border-t flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {isPending ? "Creating..." : "Create Election"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
