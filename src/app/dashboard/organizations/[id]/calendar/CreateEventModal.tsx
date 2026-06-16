"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { createCalendarEvent, updateCalendarEvent } from "@/lib/actions/calendar";
import type { CalendarEvent } from "@/lib/types/calendar";

const PRESET_COLORS = [
    { hex: "#800000", label: "Maroon" },
    { hex: "#C9A227", label: "Gold" },
    { hex: "#1D4ED8", label: "Blue" },
    { hex: "#15803D", label: "Green" },
    { hex: "#7C3AED", label: "Purple" },
    { hex: "#0D9488", label: "Teal" },
];

interface CreateEventModalProps {
    isOpen: boolean;
    organizationId: string;
    isAdmin: boolean;
    initialDate?: Date | null;
    eventToEdit?: CalendarEvent | null;
    onClose: () => void;
    onSuccess?: () => void;
}

function toDatetimeLocal(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toLocalDatetimeLocal(date: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`;
}

export default function CreateEventModal({
    isOpen,
    organizationId,
    isAdmin,
    initialDate,
    eventToEdit,
    onClose,
    onSuccess,
}: CreateEventModalProps) {
    const isEdit = !!eventToEdit;
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    // Form state
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState("#800000");
    const [isAllDay, setIsAllDay] = useState(false);
    const [startDatetime, setStartDatetime] = useState("");
    const [endDatetime, setEndDatetime] = useState("");
    const [location, setLocation] = useState("");
    const [status, setStatus] = useState<"draft" | "published" | "cancelled">("draft");
    const [recurrence, setRecurrence] = useState<string>("none");
    const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

    // Populate form when opening
    useEffect(() => {
        if (!isOpen) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError(null);
        setSuccess(false);

        if (eventToEdit) {
            setTitle(eventToEdit.title);
            setDescription(eventToEdit.description || "");
            setColor(eventToEdit.color || "#800000");
            setIsAllDay(eventToEdit.is_all_day);
            setStartDatetime(toDatetimeLocal(eventToEdit.start_datetime));
            setEndDatetime(eventToEdit.end_datetime ? toDatetimeLocal(eventToEdit.end_datetime) : "");
            setLocation(eventToEdit.location || "");
            setStatus(eventToEdit.status as "draft" | "published" | "cancelled");
            setRecurrence(eventToEdit.recurrence || "none");
            setRecurrenceEndDate(eventToEdit.recurrence_end_date || "");
        } else {
            setTitle("");
            setDescription("");
            setColor("#800000");
            setIsAllDay(false);
            setStartDatetime(initialDate ? toLocalDatetimeLocal(initialDate) : "");
            setEndDatetime("");
            setLocation("");
            setStatus("draft");
            setRecurrence("none");
            setRecurrenceEndDate("");
        }
    }, [isOpen, eventToEdit, initialDate]);

    // Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && isOpen) onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, onClose]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        if (!title.trim()) { setError("Title is required."); return; }
        if (!startDatetime) { setError("Start date/time is required."); return; }
        if (endDatetime && new Date(endDatetime) <= new Date(startDatetime)) {
            setError("End date must be after start date."); return;
        }
        if (recurrence !== "none" && !recurrenceEndDate) {
            setError("Recurrence end date is required."); return;
        }

        const formData = new FormData();
        formData.set("organization_id", organizationId);
        formData.set("title", title);
        formData.set("description", description);
        formData.set("color", color);
        formData.set("is_all_day", String(isAllDay));
        formData.set("start_datetime", new Date(startDatetime).toISOString());
        if (endDatetime) formData.set("end_datetime", new Date(endDatetime).toISOString());
        formData.set("location", location);
        formData.set("status", status);
        formData.set("recurrence", recurrence === "none" ? "null" : recurrence);
        if (recurrence !== "none") formData.set("recurrence_end_date", recurrenceEndDate);

        if (isEdit && eventToEdit) {
            formData.set("event_id", eventToEdit.id);
        }

        startTransition(async () => {
            try {
                if (isEdit) {
                    await updateCalendarEvent(formData);
                } else {
                    await createCalendarEvent(formData);
                }
                setSuccess(true);
                setTimeout(() => {
                    onSuccess?.();
                    onClose();
                }, 600);
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong.");
            }
        });
    }

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border pointer-events-auto animate-scale-in overflow-hidden flex flex-col max-h-[90vh]"
                    role="dialog"
                    aria-modal="true"
                    aria-label={isEdit ? "Edit Event" : "Create Event"}
                >
                    {/* Header */}
                    <div className="px-6 py-4 border-b flex items-center justify-between bg-gradient-to-r from-[#800000]/5 to-transparent shrink-0">
                        <h2 className="text-lg font-bold text-foreground">
                            {isEdit ? "Edit Event" : "Create New Event"}
                        </h2>
                        <button
                            onClick={onClose}
                            aria-label="Close modal"
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Form body */}
                    <form ref={formRef} onSubmit={handleSubmit} className="overflow-y-auto flex-1">
                        <div className="p-6 space-y-5">
                            {/* Title */}
                            <div>
                                <label htmlFor="cal-title" className="block text-sm font-medium mb-1.5">
                                    Title <span className="text-destructive">*</span>
                                </label>
                                <input
                                    id="cal-title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Event title"
                                    required
                                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000]/50 transition-all"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="cal-desc" className="block text-sm font-medium mb-1.5">
                                    Description
                                </label>
                                <textarea
                                    id="cal-desc"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    placeholder="Event details..."
                                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 transition-all resize-none"
                                />
                            </div>

                            {/* Color picker */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Color</label>
                                <div className="flex items-center gap-2 flex-wrap">
                                    {PRESET_COLORS.map((c) => (
                                        <button
                                            key={c.hex}
                                            type="button"
                                            onClick={() => setColor(c.hex)}
                                            aria-label={c.label}
                                            className={`w-8 h-8 rounded-full cursor-pointer transition-all focus-visible:ring-2 focus-visible:ring-offset-2 ${color === c.hex ? "ring-2 ring-offset-2 ring-foreground scale-110" : "hover:scale-105"}`}
                                            style={{ backgroundColor: c.hex }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* All-day toggle */}
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={isAllDay}
                                    onClick={() => setIsAllDay(!isAllDay)}
                                    className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#800000]/40 ${isAllDay ? "bg-[#800000]" : "bg-muted-foreground/30"}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAllDay ? "translate-x-5" : "translate-x-0"}`} />
                                </button>
                                <label className="text-sm font-medium cursor-pointer" onClick={() => setIsAllDay(!isAllDay)}>
                                    All-day event
                                </label>
                            </div>

                            {/* Date/time */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="cal-start" className="block text-sm font-medium mb-1.5">
                                        Start <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="cal-start"
                                        type={isAllDay ? "date" : "datetime-local"}
                                        value={isAllDay ? startDatetime.slice(0, 10) : startDatetime}
                                        onChange={(e) => setStartDatetime(isAllDay ? `${e.target.value}T00:00` : e.target.value)}
                                        required
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 transition-all"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="cal-end" className="block text-sm font-medium mb-1.5">
                                        End
                                    </label>
                                    <input
                                        id="cal-end"
                                        type={isAllDay ? "date" : "datetime-local"}
                                        value={isAllDay ? endDatetime.slice(0, 10) : endDatetime}
                                        onChange={(e) => setEndDatetime(isAllDay ? `${e.target.value}T23:59` : e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <label htmlFor="cal-location" className="block text-sm font-medium mb-1.5">
                                    Location
                                </label>
                                <input
                                    id="cal-location"
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="Event location or link"
                                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 transition-all"
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label htmlFor="cal-status" className="block text-sm font-medium mb-1.5">
                                    Status
                                </label>
                                <select
                                    id="cal-status"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as "draft" | "published" | "cancelled")}
                                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 transition-all cursor-pointer"
                                >
                                    <option value="draft">Draft (only officers see it)</option>
                                    <option value="published">Published (visible to all members)</option>
                                    {isAdmin && <option value="cancelled">Cancelled</option>}
                                </select>
                            </div>

                            {/* Recurrence */}
                            <div>
                                <label htmlFor="cal-recurrence" className="block text-sm font-medium mb-1.5">
                                    Recurrence
                                </label>
                                <select
                                    id="cal-recurrence"
                                    value={recurrence}
                                    onChange={(e) => setRecurrence(e.target.value)}
                                    className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 transition-all cursor-pointer"
                                >
                                    <option value="none">Does not repeat</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>

                            {/* Recurrence end date */}
                            {recurrence !== "none" && (
                                <div>
                                    <label htmlFor="cal-rec-end" className="block text-sm font-medium mb-1.5">
                                        Repeat until <span className="text-destructive">*</span>
                                    </label>
                                    <input
                                        id="cal-rec-end"
                                        type="date"
                                        value={recurrenceEndDate}
                                        onChange={(e) => setRecurrenceEndDate(e.target.value)}
                                        required={recurrence !== "none"}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/30 transition-all"
                                    />
                                </div>
                            )}

                            {/* Error */}
                            {error && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                                    {error}
                                </div>
                            )}

                            {/* Success */}
                            {success && (
                                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 text-sm">
                                    Event saved successfully!
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 bg-card border-t px-6 py-4 flex justify-end gap-3 shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isPending || success}
                                className="px-6 py-2 rounded-lg bg-[#800000] text-white text-sm font-semibold hover:bg-[#600000] transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-2 min-h-[44px]"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                {isEdit ? "Save Changes" : "Create Event"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
