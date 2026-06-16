"use client";
import { useState, useCallback } from "react";

export function useCalendarNavigation(initialYear: number, initialMonth: number) {
    const [year, setYear] = useState(initialYear);
    const [month, setMonth] = useState(initialMonth); // 0-indexed

    const goToPrev = useCallback(() => {
        if (month === 0) {
            setMonth(11);
            setYear((y) => y - 1);
        } else {
            setMonth((m) => m - 1);
        }
    }, [month]);

    const goToNext = useCallback(() => {
        if (month === 11) {
            setMonth(0);
            setYear((y) => y + 1);
        } else {
            setMonth((m) => m + 1);
        }
    }, [month]);

    const goToToday = useCallback(() => {
        const now = new Date();
        setYear(now.getFullYear());
        setMonth(now.getMonth());
    }, []);

    return { year, month, goToPrev, goToNext, goToToday };
}
