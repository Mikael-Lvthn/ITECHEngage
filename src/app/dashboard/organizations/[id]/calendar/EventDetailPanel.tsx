"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { X, MapPin, Clock, Users, CheckCircle, HelpCircle, XCircle, Edit2, Trash2 } from "lucide-react";
import { rsvpToEvent, deleteCalendarEvent } from "@/lib/actions/calendar";
import type { CalendarEvent, RSVPCounts, RSVPResponse } from "@/lib/types/calendar";

interface EventDetailPanelProps {
    event: CalendarEvent | null;
    isOpen: boolean;
    isOfficer: boolean;
    isAdmin: boolean;
    organizationId: string;
    rsvpCounts: RSVPCounts;
    myRsvp: RSVPResponse | null;
    onClose: () => void;
    onEdit: (event: CalendarEvent) => void;
}

function formatDateRange(event: CalendarEvent) {
    const start = new Date(event.start_datetime);
    const dateStr = start.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
    });

    if (event.is_all_day) return { date: dateStr, time: "All day" };

    const startTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    if (!event.end_datetime) return { date: dateStr, time: startTime };

    const end = new Date(event.end_datetime);
    const endTime = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    // Same day?
    if (start.toDateString() === end.toDateString()) {
        return { date: dateStr, time: `${startTime} – ${endTime}` };
    }

    const endDate = end.toLocaleDateString("en-US", {
        weekday: "long", month: "long", day: "numeric",
    });
    return { date: dateStr, time: `${startTime} – ${endDate} ${endTime}` };
}

const RSVP_OPTIONS: { response: RSVPResponse; label: string; icon: typeof CheckCircle; color: string }[] = [
    { response: "going", label: "Going", icon: CheckCircle, color: "text-green-600" },
    { response: "maybe", label: "Maybe", icon: HelpCircle, color: "text-yellow-600" },
    { response: "not_going", label: "Can't Go", icon: XCircle, color: "text-red-500" },
];

export default function EventDetailPanel({
    event,
    isOpen,
    isOfficer,
    isAdmin,
    organizationId,
    rsvpCounts,
    myRsvp,
    onClose,
    onEdit,
}: EventDetailPanelProps) {
    const [pendingRsvp, startRsvp] = useTransition();
    const [pendingDelete, startDelete] = useTransition();
    const [localRsvp, setLocalRsvp] = useState<RSVPResponse | null>(myRsvp);
    const [localCounts, setLocalCounts] = useState<RSVPCounts>(rsvpCounts);
    const panelRef = useRef<HTMLDivElement>(null);

    // Sync external myRsvp changes
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalRsvp(myRsvp);
        setLocalCounts(rsvpCounts);
    }, [myRsvp, rsvpCounts, event?.id]);

    // Focus trap + Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKey);
        panelRef.current?.focus();
        return () => window.removeEventListener("keydown", handleKey);
    }, [isOpen, onClose]);

    function handleRsvp(response: RSVPResponse) {
        if (!event) return;
        const prev = localRsvp;
        // Optimistic update
        setLocalRsvp(response);
        setLocalCounts((c) => {
            const next = { ...c };
            if (prev) next[prev] = Math.max(0, next[prev] - 1);
            next[response] = next[response] + 1;
            return next;
        });

        startRsvp(async () => {
            try {
                await rsvpToEvent(event.id, response);
            } catch {
                // Revert
                setLocalRsvp(prev);
                setLocalCounts(rsvpCounts);
            }
        });
    }

    function handleDelete() {
        if (!event) return;
        if (!confirm(`Cancel the event "${event.title}"? It will be marked as cancelled.`)) return;
        startDelete(async () => {
            try {
                await deleteCalendarEvent(event.id, organizationId, false);
                onClose();
            } catch (err) {
                alert(err instanceof Error ? err.message : "Delete failed.");
            }
        });
    }

    function handleHardDelete() {
        if (!event) return;
        if (!confirm(`WARNING: Are you sure you want to permanently erase the event "${event.title}"? This cannot be undone.`)) return;
        startDelete(async () => {
            try {
                await deleteCalendarEvent(event.id, organizationId, true);
                onClose();
            } catch (err) {
                alert(err instanceof Error ? err.message : "Hard delete failed.");
            }
        });
    }

    if (!event) return null;

    const { date, time } = formatDateRange(event);
    const statusColors: Record<string, string> = {
        published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
        draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
        cancelled: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
        completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Slide-in panel */}
            <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label={event.title}
                className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-card shadow-2xl border-l border-border
                    flex flex-col transition-transform duration-300 outline-none
                    ${isOpen ? "translate-x-0" : "translate-x-full"}
                `}
            >
                {/* Color stripe */}
                <div
                    className="h-1.5 w-full shrink-0"
                    style={{ backgroundColor: event.color || "#800000" }}
                />

                {/* Header */}
                <div className="flex items-start justify-between p-5 pb-3 border-b">
                    <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${statusColors[event.status] || ""}`}>
                                {event.status}
                            </span>
                            {event.recurrence && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground capitalize">
                                    ↻ {event.recurrence}
                                </span>
                            )}
                        </div>
                        <h2 className="text-xl font-bold leading-tight text-foreground">
                            {event.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close event panel"
                        className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Date & Time */}
                    <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-foreground">{date}</p>
                            <p className="text-sm text-muted-foreground">{time}</p>
                        </div>
                    </div>

                    {/* Location */}
                    {event.location && (
                        <div className="flex items-start gap-3">
                            <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                            <p className="text-sm text-foreground">{event.location}</p>
                        </div>
                    )}

                    {/* Description */}
                    {event.description && (
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">About</h3>
                            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{event.description}</p>
                        </div>
                    )}

                    {/* RSVP Section */}
                    {event.status === "published" && (
                        <div>
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Users className="w-3.5 h-3.5" />
                                RSVP
                            </h3>

                            {/* RSVP buttons */}
                            <div className="grid grid-cols-3 gap-2 mb-3">
                                {RSVP_OPTIONS.map(({ response, label, icon: Icon, color }) => {
                                    const isSelected = localRsvp === response;
                                    return (
                                        <button
                                            key={response}
                                            onClick={() => handleRsvp(response)}
                                            disabled={pendingRsvp}
                                            aria-pressed={isSelected}
                                            className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all cursor-pointer
                                                ${isSelected
                                                    ? "border-current bg-accent shadow-sm"
                                                    : "border-border hover:border-current hover:bg-accent/50"
                                                }
                                                ${color}
                                                disabled:opacity-50
                                            `}
                                        >
                                            <Icon className="w-5 h-5" />
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* RSVP counts */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="text-green-600 font-medium">{localCounts.going} going</span>
                                <span>·</span>
                                <span className="text-yellow-600 font-medium">{localCounts.maybe} maybe</span>
                                <span>·</span>
                                <span className="text-red-500 font-medium">{localCounts.not_going} can&apos;t go</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer actions — officers only */}
                {(isOfficer || isAdmin) && (
                    <div className="border-t p-4 flex flex-col gap-2">
                        {event.status !== "cancelled" && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onEdit(event)}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40"
                                >
                                    <Edit2 className="w-4 h-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={pendingDelete}
                                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-destructive/40"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {pendingDelete ? "Cancelling…" : "Cancel Event"}
                                </button>
                            </div>
                        )}
                        {isAdmin && (
                            <button
                                onClick={handleHardDelete}
                                disabled={pendingDelete}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-bold cursor-pointer disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-red-500/40"
                            >
                                <Trash2 className="w-4 h-4" />
                                Erase Permanently
                            </button>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
