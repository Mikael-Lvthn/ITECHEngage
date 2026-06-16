"use client";

import type { CalendarEvent } from "@/lib/types/calendar";

interface CalendarDayCellProps {
    date: Date;
    isCurrentMonth: boolean;
    isToday: boolean;
    isSelected: boolean;
    events: CalendarEvent[];
    isOfficer: boolean;
    onClick: () => void;
    onEventClick: (event: CalendarEvent) => void;
}

function hexToRgba(hex: string, alpha: number) {
    const h = hex.replace("#", "");
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
}

export default function CalendarDayCell({
    date,
    isCurrentMonth,
    isToday,
    isSelected,
    events,
    isOfficer,
    onClick,
    onEventClick,
}: CalendarDayCellProps) {
    const visibleEvents = events.slice(0, 3);
    const hiddenCount = events.length - visibleEvents.length;

    return (
        <div
            onClick={onClick}
            role="button"
            tabIndex={0}
            aria-label={`${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${events.length > 0 ? `, ${events.length} event${events.length > 1 ? "s" : ""}` : ""}`}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
            className={`min-h-[96px] p-1.5 rounded-lg border transition-all duration-150 cursor-pointer group outline-none
                ${isCurrentMonth ? "bg-card hover:bg-accent/40" : "bg-muted/30 hover:bg-muted/50"}
                ${isSelected ? "ring-2 ring-[#800000]/40 border-[#800000]/30" : "border-border"}
                focus-visible:ring-2 focus-visible:ring-[#800000]/50
            `}
        >
            {/* Day number */}
            <div className="flex items-center justify-end mb-1">
                <span
                    className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold transition-colors
                        ${isToday
                            ? "bg-[#800000] text-white"
                            : isCurrentMonth
                                ? "text-foreground group-hover:bg-accent"
                                : "text-muted-foreground/50"
                        }
                    `}
                >
                    {date.getDate()}
                </span>
            </div>

            {/* Event chips */}
            <div className="space-y-0.5">
                {visibleEvents.map((event) => {
                    const isDraft = event.status === "draft";
                    const isCancelled = event.status === "cancelled";

                    return (
                        <button
                            key={event.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                onEventClick(event);
                            }}
                            title={event.title}
                            aria-label={event.title}
                            className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate transition-all
                                hover:brightness-90 cursor-pointer focus-visible:ring-1
                                ${isDraft ? "opacity-60" : ""}
                                ${isCancelled ? "opacity-40 line-through" : ""}
                            `}
                            style={{
                                backgroundColor: hexToRgba(event.color || "#800000", 0.15),
                                borderLeft: `3px solid ${isDraft ? "transparent" : event.color || "#800000"}`,
                                borderLeftStyle: isDraft ? "dashed" : "solid",
                                color: event.color || "#800000",
                                outlineColor: event.color || "#800000",
                            }}
                        >
                            {event.is_all_day ? "● " : ""}{event.title}
                        </button>
                    );
                })}

                {hiddenCount > 0 && (
                    <button
                        onClick={(e) => { e.stopPropagation(); onClick(); }}
                        className="w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors cursor-pointer"
                    >
                        +{hiddenCount} more
                    </button>
                )}
            </div>

            {/* Officer: subtle "+" indicator on hover */}
            {isOfficer && events.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none">
                    <span className="text-2xl text-muted-foreground">+</span>
                </div>
            )}
        </div>
    );
}
