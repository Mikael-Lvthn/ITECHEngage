"use client";

import { useState, useRef } from "react";
import { createEvent } from "@/lib/actions/events";

interface Organization {
    id: string;
    name: string;
}

interface CreateEventDialogProps {
    organizations: Organization[];
}

export default function CreateEventDialog({ organizations }: CreateEventDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const formRef = useRef<HTMLFormElement>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const form = new FormData(e.currentTarget);

        try {
            await createEvent({
                organizationId: form.get("organizationId") as string,
                title: form.get("title") as string,
                description: form.get("description") as string,
                location: form.get("location") as string,
                startDatetime: form.get("startDatetime") as string,
                endDatetime: form.get("endDatetime") as string,
            });
            formRef.current?.reset();
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create event");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#800000] text-white text-sm font-semibold hover:bg-[#600000] transition-colors"
            >
                <span>＋</span> Create Event
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-card rounded-2xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                            <div className="h-2 bg-gradient-to-r from-[#2B6CB0] to-[#4299E1] rounded-t-2xl" />
                            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold">Create New Event</h2>
                                    <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                                        ✕
                                    </button>
                                </div>

                                <p className="text-xs text-muted-foreground">
                                    Events are submitted for admin approval before being published.
                                </p>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">{error}</div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">Organization</label>
                                    <select
                                        name="organizationId"
                                        required
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                                    >
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Event Title</label>
                                    <input
                                        name="title"
                                        required
                                        maxLength={200}
                                        placeholder="e.g. Annual General Assembly"
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        rows={3}
                                        placeholder="Describe the event..."
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        name="location"
                                        required
                                        placeholder="e.g. Auditorium, Room 301"
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Start Date & Time</label>
                                        <input
                                            name="startDatetime"
                                            type="datetime-local"
                                            required
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Date & Time</label>
                                        <input
                                            name="endDatetime"
                                            type="datetime-local"
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-4 py-2 rounded-lg bg-[#800000] text-white text-sm font-semibold hover:bg-[#600000] transition-colors disabled:opacity-50"
                                    >
                                        {loading ? "Submitting..." : "Submit for Approval"}
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
