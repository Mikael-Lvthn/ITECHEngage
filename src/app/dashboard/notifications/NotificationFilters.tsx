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
            <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100">
                {filters.map((filter) => (
                    <Link
                        key={filter.key}
                        href={`/dashboard/notifications?filter=${filter.key}`}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                            currentFilter === filter.key
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-600 hover:text-gray-900"
                        }`}
                    >
                        {filter.label}
                        {filter.count > 0 && (
                            <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs ${
                                currentFilter === filter.key
                                    ? "bg-[#800000]/10 text-[#800000]"
                                    : "bg-gray-200 text-gray-600"
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
                        className="px-3 py-1.5 text-sm font-medium text-[#800000] bg-[#800000]/10 hover:bg-[#800000]/20 rounded-lg transition-colors border border-[#800000]/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Mark all as read
                    </button>
                )}
                {counts.read > 0 && (
                    <button
                        onClick={handleArchiveAllRead}
                        disabled={isPending}
                        className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                        Archive all read
                    </button>
                )}
            </div>
        </div>
    );
}
