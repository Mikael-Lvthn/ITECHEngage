"use client";

import { useState, useMemo, useCallback } from "react";
import { useCalendarNavigation } from "@/lib/hooks/useCalendarNavigation";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import CalendarHeader from "./CalendarHeader";
import CalendarDayCell from "./CalendarDayCell";
import EventDetailPanel from "./EventDetailPanel";
import CreateEventModal from "./CreateEventModal";
import ListView from "./ListView";
import WeekView from "./WeekView";
import type { CalendarEvent, RSVPCounts, RSVPResponse } from "@/lib/types/calendar";

interface CalendarGridProps {
    events: CalendarEvent[];
    isOfficer: boolean;
    isAdmin: boolean;
    organizationId: string;
    initialYear: number;
    initialMonth: number; // 0-indexed
    rsvpCounts: Record<string, RSVPCounts>;
    myRsvps: Record<string, string>;
    currentUserId: string;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(year: number, month: number): Date[] {
    // Returns an array of Date objects for the grid (may include prev/next month days)
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = firstDay.getDay(); // 0=Sun
    const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

    const cells: Date[] = [];
    for (let i = 0; i < totalCells; i++) {
        const d = new Date(year, month, 1 - startOffset + i);
        cells.push(d);
    }
    return cells;
}

function sameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
}

function getEventsForDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
    return events.filter((e) => {
        const start = new Date(e.start_datetime);
        const end = e.end_datetime ? new Date(e.end_datetime) : start;
        const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
        return start <= dayEnd && end >= dayStart;
    });
}

export default function CalendarGrid({
    events,
    isOfficer,
    isAdmin,
    organizationId,
    initialYear,
    initialMonth,
    rsvpCounts,
    myRsvps,
    currentUserId,
}: CalendarGridProps) {
    const { year, month, goToPrev, goToNext, goToToday } = useCalendarNavigation(initialYear, initialMonth);
    const isMobile = useMediaQuery("(max-width: 767px)");

    const [viewMode, setViewMode] = useState<"month" | "week" | "list">(isMobile ? "list" : "month");
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
    const [createInitialDate, setCreateInitialDate] = useState<Date | null>(null);

    const today = new Date();

    // Build month grid cells
    const gridCells = useMemo(() => buildMonthGrid(year, month), [year, month]);

    // Events filtered for current display window
    const visibleEvents = useMemo(() => {
        return events.filter((e) => {
            const start = new Date(e.start_datetime);
            if (viewMode === "month") {
                const firstCell = gridCells[0];
                const lastCell = gridCells[gridCells.length - 1];
                return start >= firstCell && start <= lastCell;
            }
            return start.getFullYear() === year && start.getMonth() === month;
        });
    }, [events, gridCells, year, month, viewMode]);

    const handleDayClick = useCallback((date: Date) => {
        setSelectedDate(date);
        if (isOfficer) {
            setCreateInitialDate(date);
            setEventToEdit(null);
            setShowCreateModal(true);
        }
    }, [isOfficer]);

    const handleEventClick = useCallback((event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsPanelOpen(true);
    }, []);

    const handleEditEvent = useCallback((event: CalendarEvent) => {
        setEventToEdit(event);
        setIsPanelOpen(false);
        setShowCreateModal(true);
    }, []);

    const handleCreateEvent = useCallback(() => {
        setEventToEdit(null);
        setCreateInitialDate(null);
        setShowCreateModal(true);
    }, []);

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
            {/* Calendar header */}
            <div className="border-b bg-card/50 px-4">
                <CalendarHeader
                    year={year}
                    month={month}
                    viewMode={viewMode}
                    isOfficer={isOfficer}
                    onPrev={goToPrev}
                    onNext={goToNext}
                    onToday={goToToday}
                    onViewChange={setViewMode}
                    onCreateEvent={handleCreateEvent}
                />
            </div>

            {/* Views */}
            <div className="p-4">
                {/* Month View */}
                {viewMode === "month" && (
                    <div>
                        {/* Day-of-week headers */}
                        <div className="grid grid-cols-7 mb-2">
                            {DAY_LABELS.map((d) => (
                                <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wider">
                                    {d}
                                </div>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {gridCells.map((day, idx) => {
                                const isCurrentMonth = day.getMonth() === month;
                                const isToday = sameDay(day, today);
                                const isSelected = selectedDate ? sameDay(day, selectedDate) : false;
                                const dayEvents = getEventsForDay(visibleEvents, day);

                                return (
                                    <CalendarDayCell
                                        key={idx}
                                        date={day}
                                        isCurrentMonth={isCurrentMonth}
                                        isToday={isToday}
                                        isSelected={isSelected}
                                        events={dayEvents}
                                        isOfficer={isOfficer}
                                        onClick={() => handleDayClick(day)}
                                        onEventClick={handleEventClick}
                                    />
                                );
                            })}
                        </div>

                        {/* Empty state */}
                        {visibleEvents.length === 0 && (
                            <div className="text-center py-8 mt-4 border-t">
                                <p className="text-sm text-muted-foreground">
                                    {isOfficer
                                        ? "No events this month. Click a day or use \"Create Event\" to add one."
                                        : "No events scheduled for this month."}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Week View */}
                {viewMode === "week" && (
                    <WeekView
                        year={year}
                        month={month}
                        events={visibleEvents}
                        currentUserId={currentUserId}
                        onEventClick={handleEventClick}
                    />
                )}

                {/* List View */}
                {viewMode === "list" && (
                    <ListView
                        events={visibleEvents}
                        isOfficer={isOfficer}
                        onEventClick={handleEventClick}
                        onCreateEvent={handleCreateEvent}
                    />
                )}
            </div>

            {/* Event Detail Panel */}
            <EventDetailPanel
                event={selectedEvent}
                isOpen={isPanelOpen}
                isOfficer={isOfficer}
                isAdmin={isAdmin}
                organizationId={organizationId}
                rsvpCounts={selectedEvent ? (rsvpCounts[selectedEvent.id] || { going: 0, maybe: 0, not_going: 0 }) : { going: 0, maybe: 0, not_going: 0 }}
                myRsvp={(selectedEvent ? (myRsvps[selectedEvent.id] as RSVPResponse) : null) || null}
                onClose={() => setIsPanelOpen(false)}
                onEdit={handleEditEvent}
            />

            {/* Create / Edit Modal */}
            <CreateEventModal
                isOpen={showCreateModal}
                organizationId={organizationId}
                isAdmin={false} // non-admin officers: can't set 'cancelled' status
                initialDate={createInitialDate}
                eventToEdit={eventToEdit}
                onClose={() => {
                    setShowCreateModal(false);
                    setEventToEdit(null);
                }}
                onSuccess={() => {
                    setShowCreateModal(false);
                    setEventToEdit(null);
                }}
            />
        </div>
    );
}
