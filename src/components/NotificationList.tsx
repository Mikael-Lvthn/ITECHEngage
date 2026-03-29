"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { markAsRead, markAllAsRead } from "@/lib/actions/notifications";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

function getTimeAgo(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getTypeIcon(type: string) {
    switch (type) {
        case "election_started": return "🗳️";
        case "event_created": return "📅";
        case "news_published": return "📰";
        case "membership_approved": return "✅";
        case "membership_denied": return "❌";
        default: return "🔔";
    }
}

interface NotificationListProps {
    notifications: Notification[];
}

export default function NotificationList({ notifications }: NotificationListProps) {
    const [items, setItems] = useState(notifications);
    const [isPending, startTransition] = useTransition();

    const handleMarkRead = (id: string) => {
        setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
        startTransition(async () => {
            await markAsRead(id);
        });
    };

    const handleMarkAllRead = () => {
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
        startTransition(async () => {
            await markAllAsRead();
        });
    };

    const unreadCount = items.filter((n) => !n.is_read).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const todayItems = items.filter((n) => new Date(n.created_at) >= today);
    const weekItems = items.filter((n) => {
        const d = new Date(n.created_at);
        return d < today && d >= weekAgo;
    });
    const olderItems = items.filter((n) => new Date(n.created_at) < weekAgo);

    const renderGroup = (title: string, groupItems: Notification[]) => {
        if (groupItems.length === 0) return null;
        return (
            <div key={title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {title}
                </h3>
                <div className="space-y-1">
                    {groupItems.map((n) => {
                        const inner = (
                            <div
                                key={n.id}
                                className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                                    n.is_read ? "hover:bg-accent/50" : "bg-[#800000]/5 hover:bg-[#800000]/10"
                                }`}
                                onClick={() => !n.is_read && handleMarkRead(n.id)}
                            >
                                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0 text-lg">
                                    {getTypeIcon(n.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className={`text-sm leading-tight ${n.is_read ? "font-normal" : "font-semibold"}`}>
                                            {n.title}
                                        </p>
                                        {!n.is_read && (
                                            <span className="w-2 h-2 rounded-full bg-[#800000] shrink-0" />
                                        )}
                                    </div>
                                    {n.message && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.message}</p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {getTimeAgo(n.created_at)}
                                    </p>
                                </div>
                            </div>
                        );

                        return n.link ? (
                            <Link key={n.id} href={n.link} onClick={() => !n.is_read && handleMarkRead(n.id)}>
                                {inner}
                            </Link>
                        ) : (
                            <div key={n.id}>{inner}</div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div>
            {unreadCount > 0 && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleMarkAllRead}
                        disabled={isPending}
                        className="text-xs text-[#800000] font-medium hover:underline disabled:opacity-50"
                    >
                        Mark all as read ({unreadCount})
                    </button>
                </div>
            )}

            {items.length === 0 ? (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                    <div className="text-center py-16 px-6">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-accent flex items-center justify-center mb-4">
                            <span className="text-3xl">🔔</span>
                        </div>
                        <p className="font-bold text-lg">No Notifications</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            You&apos;re all caught up! Follow organizations to receive updates.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="rounded-xl border bg-card p-4 space-y-4">
                    {renderGroup("Today", todayItems)}
                    {renderGroup("This Week", weekItems)}
                    {renderGroup("Earlier", olderItems)}
                </div>
            )}
        </div>
    );
}
