"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markAllAsRead, archiveAllRead } from "@/lib/actions/notifications";
import { Loader2 } from "lucide-react";

interface NotificationFiltersProps {
    currentFilter: string;
    counts: {
        all: number;
        unread: number;
        read: number;
        archived: number;
    };
}

export default function NotificationFilters({ currentFilter, counts }: NotificationFiltersProps) {
    const [isPending, startTransition] = useTransition();

    const handleMarkAllAsRead = () => {
        startTransition(() => {
            markAllAsRead().catch(console.error);
        });
    };

    const handleArchiveAllRead = () => {
        startTransition(() => {
            archiveAllRead().catch(console.error);
        });
    };

    const filters = [
        { key: "all", label: "All", count: counts.all },
        { key: "unread", label: "Unread", count: counts.unread },
        { key: "read", label: "Read", count: counts.read },
        { key: "archived", label: "Archived", count: counts.archived },
    ];

    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Filter tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
                {filters.map((filter) => (
                    <Link
                        key={filter.key}
                        href={`/dashboard/notifications?filter=${filter.key}`}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            currentFilter === filter.key
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        {filter.label}
                        {filter.count > 0 && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                                currentFilter === filter.key
                                    ? "bg-[#800000]/20 text-[#800000] dark:text-[#C9A227] dark:bg-[#C9A227]/20"
                                    : "bg-muted-foreground/10 text-muted-foreground"
                            }`}>
                                {filter.count}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
                {counts.unread > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        disabled={isPending}
                        className="px-3 py-1.5 text-sm font-medium text-[#800000] bg-[#800000]/10 hover:bg-[#800000]/20 rounded-lg transition-colors border border-[#800000]/20 disabled:opacity-50 flex items-center gap-2 dark:text-[#C9A227] dark:bg-[#C9A227]/10 dark:hover:bg-[#C9A227]/20 dark:border-[#C9A227]/20"
                    >
                        {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Mark all as read
                    </button>
                )}
                {counts.read > 0 && (
                    <button
                        onClick={handleArchiveAllRead}
                        disabled={isPending}
                        className="px-3 py-1.5 text-sm font-medium text-muted-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors border border-border disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Archive all read
                    </button>
                )}
            </div>
        </div>
    );
}
