"use client";

import type { CalendarEvent } from "@/lib/types/calendar";

interface WeekViewProps {
    year: number;
    month: number; // 0-indexed
    events: CalendarEvent[];
    currentUserId: string;
    onEventClick: (event: CalendarEvent) => void;
}

const HOUR_START = 7;  // 7 AM
const HOUR_END = 22;   // 10 PM
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT = 64; // px per hour

function getWeekDays(year: number, month: number): Date[] {
    // Get the week that contains "today" if in current month, else first of month
    const today = new Date();
    const inCurrentMonth =
        today.getFullYear() === year && today.getMonth() === month;
    const anchor = inCurrentMonth ? today : new Date(year, month, 1);
    const dayOfWeek = anchor.getDay(); // 0=Sun
    const sunday = new Date(anchor);
    sunday.setDate(anchor.getDate() - dayOfWeek);

    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(sunday);
        d.setDate(sunday.getDate() + i);
        return d;
    });
}

function getEventPosition(event: CalendarEvent, dayDate: Date): { top: number; height: number } | null {
    const eventStart = new Date(event.start_datetime);
    const eventEnd = event.end_datetime ? new Date(event.end_datetime) : new Date(eventStart.getTime() + 60 * 60 * 1000);

    const dayStart = new Date(dayDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    if (eventStart > dayEnd || eventEnd < dayStart) return null;

    const clampedStart = eventStart < dayStart ? dayStart : eventStart;
    const clampedEnd = eventEnd > dayEnd ? dayEnd : eventEnd;

    const startHour = clampedStart.getHours() + clampedStart.getMinutes() / 60;
    const endHour = clampedEnd.getHours() + clampedEnd.getMinutes() / 60;

    const topHour = Math.max(startHour, HOUR_START);
    const bottomHour = Math.min(endHour, HOUR_END);

    if (bottomHour <= topHour) return null;

    const top = (topHour - HOUR_START) * HOUR_HEIGHT;
    const height = Math.max((bottomHour - topHour) * HOUR_HEIGHT, 22);

    return { top, height };
}

export default function WeekView({ year, month, events, onEventClick }: WeekViewProps) {
    const weekDays = getWeekDays(year, month);
    const today = new Date();
    const hours = Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i);

    // All-day events
    const allDayEvents = events.filter((e) => e.is_all_day);

    // Timed events
    const timedEvents = events.filter((e) => !e.is_all_day);

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            {/* Day headers */}
            <div className="grid grid-cols-8 border-b sticky top-0 bg-card z-10">
                <div className="border-r" /> {/* time column */}
                {weekDays.map((day, i) => {
                    const isToday = day.toDateString() === today.toDateString();
                    const isCurrentMonth = day.getMonth() === month;
                    return (
                        <div
                            key={i}
                            className={`text-center py-3 px-1 border-r last:border-r-0 ${!isCurrentMonth ? "opacity-40" : ""}`}
                        >
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">
                                {day.toLocaleDateString("en-US", { weekday: "short" })}
                            </p>
                            <span
                                className={`text-xl font-bold mt-0.5 w-9 h-9 flex items-center justify-center mx-auto rounded-full
                                    ${isToday ? "bg-[#800000] text-white" : "text-foreground"}`}
                            >
                                {day.getDate()}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* All-day row */}
            {allDayEvents.length > 0 && (
                <div className="grid grid-cols-8 border-b bg-muted/30">
                    <div className="border-r px-2 py-1 text-[10px] text-muted-foreground flex items-center justify-end">All day</div>
                    {weekDays.map((day, i) => {
                        const dayEvents = allDayEvents.filter((e) => {
                            const eDay = new Date(e.start_datetime).toDateString();
                            return eDay === day.toDateString();
                        });
                        return (
                            <div key={i} className="border-r last:border-r-0 p-0.5 space-y-0.5 min-h-[28px]">
                                {dayEvents.map((e) => (
                                    <button
                                        key={e.id}
                                        onClick={() => onEventClick(e)}
                                        className="w-full text-left text-[10px] font-medium px-1 py-0.5 rounded truncate cursor-pointer hover:brightness-90 transition-all"
                                        style={{
                                            backgroundColor: `${e.color || "#800000"}22`,
                                            color: e.color || "#800000",
                                            borderLeft: `2px solid ${e.color || "#800000"}`,
                                        }}
                                    >
                                        {e.title}
                                    </button>
                                ))}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Timed grid */}
            <div className="overflow-y-auto max-h-[calc(100vh-300px)]">
                <div className="grid grid-cols-8 relative" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
                    {/* Hour labels */}
                    <div className="border-r relative">
                        {hours.map((h) => (
                            <div
                                key={h}
                                className="absolute w-full flex items-start justify-end pr-2"
                                style={{ top: (h - HOUR_START) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                            >
                                <span className="text-[10px] text-muted-foreground -mt-2">
                                    {h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`}
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Day columns */}
                    {weekDays.map((day, colIdx) => {
                        const dayEvents = timedEvents.filter((e) => getEventPosition(e, day) !== null);
                        const isToday = day.toDateString() === today.toDateString();

                        return (
                            <div
                                key={colIdx}
                                className={`border-r last:border-r-0 relative ${isToday ? "bg-[#800000]/3" : ""}`}
                            >
                                {/* Hour lines */}
                                {hours.map((h) => (
                                    <div
                                        key={h}
                                        className="absolute w-full border-t border-border/30"
                                        style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
                                    />
                                ))}

                                {/* Events */}
                                {dayEvents.map((event) => {
                                    const pos = getEventPosition(event, day);
                                    if (!pos) return null;
                                    return (
                                        <button
                                            key={event.id}
                                            onClick={() => onEventClick(event)}
                                            title={event.title}
                                            aria-label={event.title}
                                            className="absolute left-0.5 right-0.5 rounded text-[10px] font-medium px-1.5 py-1 overflow-hidden cursor-pointer hover:brightness-90 transition-all focus-visible:ring-1 text-left"
                                            style={{
                                                top: pos.top,
                                                height: pos.height,
                                                backgroundColor: `${event.color || "#800000"}22`,
                                                borderLeft: `3px solid ${event.color || "#800000"}`,
                                                color: event.color || "#800000",
                                            }}
                                        >
                                            <p className="font-semibold truncate">{event.title}</p>
                                            {pos.height > 40 && event.location && (
                                                <p className="truncate opacity-70">{event.location}</p>
                                            )}
                                        </button>
                                    );
                                })}

                                {/* Current time indicator */}
                                {isToday && (() => {
                                    const now = new Date();
                                    const nowHour = now.getHours() + now.getMinutes() / 60;
                                    if (nowHour < HOUR_START || nowHour > HOUR_END) return null;
                                    return (
                                        <div
                                            className="absolute left-0 right-0 z-20 pointer-events-none"
                                            style={{ top: (nowHour - HOUR_START) * HOUR_HEIGHT }}
                                        >
                                            <div className="relative">
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#800000] -ml-1 absolute -top-1.5" />
                                                <div className="h-0.5 bg-[#800000] ml-1" />
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
