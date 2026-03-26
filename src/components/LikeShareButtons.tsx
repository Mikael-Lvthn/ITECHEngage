"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface LikeShareButtonsProps {
    itemId: string;
    itemType: "news" | "event";
    initialLikeCount: number;
    initialLiked: boolean;
    title: string;
}

export default function LikeShareButtons({
    itemId,
    itemType,
    initialLikeCount,
    initialLiked,
    title,
}: LikeShareButtonsProps) {
    const [liked, setLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [loading, setLoading] = useState(false);
    const [shared, setShared] = useState(false);

    const handleLike = async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                window.location.href = "/login";
                return;
            }

            const table = itemType === "news" ? "news_likes" : "event_likes";
            const idCol = itemType === "news" ? "news_id" : "event_id";

            if (liked) {
                await supabase
                    .from(table)
                    .delete()
                    .eq(idCol, itemId)
                    .eq("user_id", user.id);

                setLiked(false);
                setLikeCount((c) => Math.max(0, c - 1));
            } else {
                await supabase
                    .from(table)
                    .insert({ [idCol]: itemId, user_id: user.id });

                setLiked(true);
                setLikeCount((c) => c + 1);
            }
        } catch (err) {
            console.error("Like failed:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({ title, url });
            } catch { }
        } else {
            await navigator.clipboard.writeText(url);
            setShared(true);
            setTimeout(() => setShared(false), 2000);
        }
    };

    return (
        <div className="flex items-center gap-3">
            <button
                onClick={handleLike}
                disabled={loading}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${liked
                    ? "bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                    : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-500"
                    } disabled:opacity-50`}
            >
                <svg
                    className={`w-4 h-4 transition-transform ${liked ? "scale-110" : ""}`}
                    fill={liked ? "currentColor" : "none"}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                </svg>
                {likeCount > 0 ? likeCount : "Like"}
            </button>

            <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 hover:text-gray-900 transition-all"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                </svg>
                {shared ? "Copied!" : "Share"}
            </button>
        </div>
    );
}
