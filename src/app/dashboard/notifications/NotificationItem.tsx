"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markAsRead, archiveNotification } from "@/lib/actions/notifications";
import { Loader2, Archive } from "lucide-react";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    status: "unread" | "read" | "archived";
    created_at: string;
}

export default function NotificationItem({ notification }: { notification: Notification }) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const isUnread = notification.status === "unread";

    const handleClick = () => {
        // Mark as read when clicking
        if (isUnread && !isPending) {
            startTransition(() => {
                markAsRead(notification.id).catch(console.error);
            });
        }
        // Navigate to linked content
        if (notification.link) {
            router.push(notification.link);
        }
    };

    const handleArchive = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isPending) return;
        
        startTransition(() => {
            archiveNotification(notification.id).catch(console.error);
        });
    };

    const iconMap: Record<string, string> = {
        election_started: "🗳️",
        election_results: "📊",
        event_created: "📅",
        news_published: "📰",
        membership_approved: "✅",
        membership_rejected: "❌",
        system: "🔔"
    };

    const icon = iconMap[notification.type] || "🔔";

    return (
        <div
            onClick={handleClick}
            className={`flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                isUnread
                    ? "bg-[#C9A227]/5 border-[#C9A227]/30 hover:bg-[#C9A227]/10"
                    : "bg-white border-gray-100 hover:bg-gray-50"
            }`}
        >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${
                isUnread ? "bg-[#C9A227] text-[#2B2B2B]" : "bg-gray-100 text-gray-500"
            }`}>
                {icon}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-semibold truncate ${isUnread ? "text-[#800000]" : "text-gray-900"}`}>
                        {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                </div>
                
                {notification.message && (
                    <p className={`text-sm mt-1 line-clamp-2 ${isUnread ? "text-gray-700" : "text-gray-500"}`}>
                        {notification.message}
                    </p>
                )}

                {notification.link && (
                    <p className="text-xs text-[#800000]/70 mt-2 flex items-center gap-1">
                        <span>→</span> Click to view
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
                {isUnread && (
                    <span className="w-2 h-2 rounded-full bg-[#C9A227]" title="Unread" />
                )}
                
                {notification.status !== "archived" && (
                    <button 
                        onClick={handleArchive}
                        disabled={isPending}
                        className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        title="Archive"
                    >
                        {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Archive className="w-4 h-4" aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
