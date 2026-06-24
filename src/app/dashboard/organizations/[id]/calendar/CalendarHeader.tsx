"use client";

import { ChevronLeft, ChevronRight, Calendar, List, LayoutGrid, Plus } from "lucide-react";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

type ViewMode = "month" | "week" | "list";

interface CalendarHeaderProps {
    year: number;
    month: number; // 0-indexed
    viewMode: ViewMode;
    isOfficer: boolean;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
    onViewChange: (mode: ViewMode) => void;
    onCreateEvent: () => void;
}

export default function CalendarHeader({
    year,
    month,
    viewMode,
    isOfficer,
    onPrev,
    onNext,
    onToday,
    onViewChange,
    onCreateEvent,
}: CalendarHeaderProps) {
    const isCurrentMonth =
        year === new Date().getFullYear() && month === new Date().getMonth();

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 px-1">
            {/* Left: Month navigation */}
            <div className="flex items-center gap-2">
                <button
                    onClick={onPrev}
                    aria-label="Previous month"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="min-w-[160px] text-center">
                    <h2 className="text-xl font-bold tracking-tight text-foreground">
                        {MONTHS[month]} {year}
                    </h2>
                </div>

                <button
                    onClick={onNext}
                    aria-label="Next month"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>

                {!isCurrentMonth && (
                    <button
                        onClick={onToday}
                        className="ml-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
                    >
                        Today
                    </button>
                )}
            </div>

            {/* Right: View toggles + Create */}
            <div className="flex items-center gap-2">
                {/* View mode pill */}
                <div className="flex items-center rounded-lg border border-border bg-muted p-0.5 gap-0.5">
                    <button
                        onClick={() => onViewChange("month")}
                        aria-label="Month view"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            viewMode === "month"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Month</span>
                    </button>
                    <button
                        onClick={() => onViewChange("week")}
                        aria-label="Week view"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            viewMode === "week"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Week</span>
                    </button>
                    <button
                        onClick={() => onViewChange("list")}
                        aria-label="List view"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                            viewMode === "list"
                                ? "bg-card text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <List className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">List</span>
                    </button>
                </div>

                {/* Create event button — officers only */}
                {isOfficer && (
                    <button
                        onClick={onCreateEvent}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Create Event</span>
                    </button>
                )}
            </div>
        </div>
    );
}
