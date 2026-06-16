"use client";

import { useTransition } from "react";
import { deleteBulletinPost } from "@/lib/actions/admin";
import { getErrorMessage } from "@/lib/utils/error";

export function DeleteBulletinButton({ postId }: { postId: string }) {
    const [isPending, startTransition] = useTransition();

    function handleDelete(e: React.MouseEvent) {
        e.preventDefault();
        if (!confirm("Are you sure you want to delete this bulletin post?")) return;

        startTransition(async () => {
            try {
                await deleteBulletinPost(postId);
            } catch (err) {
                alert(getErrorMessage(err));
            }
        });
    }

    return (
        <button
            onClick={handleDelete}
            disabled={isPending}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 hover:bg-red-100 text-gray-400 hover:text-red-600 transition-colors z-20 shadow-sm"
            title="Delete post"
        >
            {isPending ? "..." : "✕"}
        </button>
    );
}
