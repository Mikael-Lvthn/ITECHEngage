"use client";

import { useState, useRef } from "react";
import { updateEvent } from "@/lib/actions/events";

interface EditEventDialogProps {
    event: {
        id: string;
        title: string;
        description: string | null;
        location: string;
        start_datetime: string;
        end_datetime: string | null;
    };
}

export default function EditEventDialog({ event }: EditEventDialogProps) {
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
            await updateEvent(event.id, {
                title: form.get("title") as string,
                description: form.get("description") as string,
                location: form.get("location") as string,
                startDatetime: form.get("startDatetime") as string,
                endDatetime: form.get("endDatetime") as string || undefined,
            });
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update event");
        } finally {
            setLoading(false);
        }
    };

    // Helper to format datetime for datetime-local input
    const formatForInput = (isoString?: string | null) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        // adjust for local timezone offset
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
            .toISOString()
            .slice(0, 16);
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#2B6CB0]/30 text-[#2B6CB0] hover:bg-[#2B6CB0]/5 transition-colors"
            >
                Edit
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="bg-card rounded-2xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-scale-in">
                            <div className="h-2 bg-gradient-to-r from-[#2B6CB0] to-[#4299E1] rounded-t-2xl" />
                            <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold">Edit Event</h2>
                                    <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                                        ✕
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-100 text-red-700 text-sm">{error}</div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium mb-1">Event Title</label>
                                    <input
                                        name="title"
                                        required
                                        defaultValue={event.title}
                                        maxLength={200}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        rows={3}
                                        defaultValue={event.description || ""}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1">Location</label>
                                    <input
                                        name="location"
                                        required
                                        defaultValue={event.location}
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
                                            defaultValue={formatForInput(event.start_datetime)}
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">End Date & Time</label>
                                        <input
                                            name="endDatetime"
                                            type="datetime-local"
                                            defaultValue={formatForInput(event.end_datetime)}
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
                                        className="px-4 py-2 rounded-lg bg-[#2B6CB0] text-white text-sm font-semibold hover:bg-[#1A365D] transition-colors disabled:opacity-50"
                                    >
                                        {loading ? "Saving..." : "Save Changes"}
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
