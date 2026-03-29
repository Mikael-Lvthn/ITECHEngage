"use client";

import { useTransition } from "react";
import Link from "next/link";
import { markAsRead } from "@/lib/actions/notifications";
import { Loader2 } from "lucide-react";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

export default function NotificationItem({ notification }: { notification: Notification }) {
    const [isPending, startTransition] = useTransition();

    const handleMarkAsRead = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (notification.is_read || isPending) return;
        
        startTransition(() => {
            markAsRead(notification.id).catch(console.error);
        });
    };

    const iconMap: Record<string, string> = {
        election_started: "🗳️",
        event_created: "📅",
        news_published: "📰",
        membership_approved: "✅",
        membership_rejected: "❌",
        system: "🔔"
    };

    const icon = iconMap[notification.type] || "🔔";
    
    const Wrapper = ({ children, className }: { children: React.ReactNode, className: string }) => {
        if (notification.link) {
            return (
                <Link href={notification.link} className={className} onClick={() => {
                    if (!notification.is_read) startTransition(() => { markAsRead(notification.id).catch(console.error); });
                }}>
                    {children}
                </Link>
            );
        }
        return <div className={className}>{children}</div>;
    };

    return (
        <Wrapper className={`flex items-start gap-4 p-4 rounded-xl border transition-all ${
            !notification.is_read 
                ? "bg-[#C9A227]/5 border-[#C9A227]/30 hover:bg-[#C9A227]/10" 
                : "bg-white border-gray-100 hover:bg-gray-50"
        } ${notification.link ? "cursor-pointer" : ""}`}>
            
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg ${
                !notification.is_read ? "bg-[#C9A227] text-[#2B2B2B]" : "bg-gray-100 text-gray-500"
            }`}>
                {icon}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-semibold truncate ${!notification.is_read ? "text-[#800000]" : "text-gray-900"}`}>
                        {notification.title}
                    </h3>
                    <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                        {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                </div>
                
                {notification.message && (
                    <p className={`text-sm mt-1 line-clamp-2 ${!notification.is_read ? "text-gray-700" : "text-gray-500"}`}>
                        {notification.message}
                    </p>
                )}
            </div>

            {!notification.is_read && (
                <button 
                    onClick={handleMarkAsRead}
                    disabled={isPending}
                    className="shrink-0 p-1.5 rounded-full text-[#C9A227] hover:bg-[#C9A227]/10 hover:text-[#B8911E] transition-colors tooltip-trigger"
                    title="Mark as read"
                >
                    <span className="sr-only">Mark as read</span>
                    {isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" aria-hidden="true" />
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    )}
                </button>
            )}
        </Wrapper>
    );
}
