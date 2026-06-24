"use client";

import type { CalendarEvent } from "@/lib/types/calendar";
import { MapPin, Clock } from "lucide-react";

interface ListViewProps {
    events: CalendarEvent[];
    isOfficer: boolean;
    onEventClick: (event: CalendarEvent) => void;
    onCreateEvent: () => void;
}

function groupByDate(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of events) {
        const key = new Date(event.start_datetime).toDateString();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(event);
    }
    return groups;
}

function formatEventTime(event: CalendarEvent): string {
    if (event.is_all_day) return "All day";
    const start = new Date(event.start_datetime);
    const startStr = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    if (!event.end_datetime) return startStr;
    const end = new Date(event.end_datetime);
    const endStr = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${startStr} – ${endStr}`;
}

const statusColors: Record<string, string> = {
    published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    draft: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    cancelled: "bg-red-100 text-red-600",
};

export default function ListView({ events, isOfficer, onEventClick, onCreateEvent }: ListViewProps) {
    const now = new Date();

    // Separate upcoming and past
    const upcoming = events.filter((e) => new Date(e.start_datetime) >= now && e.status !== "cancelled");
    const past = events.filter((e) => new Date(e.start_datetime) < now || e.status === "cancelled");

    const upcomingGroups = groupByDate(upcoming);
    const pastGroups = groupByDate(past);

    const EventCard = ({ event }: { event: CalendarEvent }) => {
        const isPast = new Date(event.start_datetime) < now;
        return (
            <button
                onClick={() => onEventClick(event)}
                className={`w-full text-left flex items-stretch gap-0 rounded-xl border overflow-hidden hover:shadow-md transition-all cursor-pointer group focus-visible:ring-2 focus-visible:ring-primary/40 ${isPast ? "opacity-60" : ""}`}
            >
                {/* Color stripe */}
                <div
                    className="w-1 shrink-0"
                    style={{ backgroundColor: event.color || "#800000" }}
                />

                <div className="flex-1 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                        <h3 className={`text-sm font-semibold text-foreground group-hover:text-primary transition-colors ${event.status === "cancelled" ? "line-through opacity-60" : ""}`}>
                            {event.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${statusColors[event.status] || ""}`}>
                            {event.status}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatEventTime(event)}
                        </span>
                        {event.location && (
                            <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {event.location}
                            </span>
                        )}
                        {event.recurrence && (
                            <span className="text-primary/70 font-medium">↻ {event.recurrence}</span>
                        )}
                    </div>
                </div>
            </button>
        );
    };

    const DateGroup = ({ dateKey, events: groupEvents }: { dateKey: string; events: CalendarEvent[] }) => {
        const date = new Date(dateKey);
        const isToday = date.toDateString() === now.toDateString();
        return (
            <div>
                <div className={`sticky top-0 z-10 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider mb-2 ${isToday ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                    {isToday ? "Today — " : ""}
                    {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <div className="space-y-2 mb-5">
                    {groupEvents.map((e) => <EventCard key={e.id} event={e} />)}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-2">
            {/* Upcoming */}
            {upcoming.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                        <Clock className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">No upcoming events</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {isOfficer ? "Create the first event for this organization." : "Check back later for upcoming events."}
                    </p>
                    {isOfficer && (
                        <button
                            onClick={onCreateEvent}
                            className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                        >
                            Create Event
                        </button>
                    )}
                </div>
            ) : (
                <div>
                    {Array.from(upcomingGroups.entries()).map(([key, evts]) => (
                        <DateGroup key={key} dateKey={key} events={evts} />
                    ))}
                </div>
            )}

            {/* Past events (collapsible) */}
            {past.length > 0 && (
                <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-muted-foreground font-medium py-2 px-3 rounded-lg hover:bg-accent transition-colors select-none list-none flex items-center gap-2">
                        <span className="text-xs">▶</span>
                        Past &amp; Cancelled Events ({past.length})
                    </summary>
                    <div className="mt-3 opacity-70">
                        {Array.from(pastGroups.entries()).map(([key, evts]) => (
                            <DateGroup key={key} dateKey={key} events={evts} />
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}
