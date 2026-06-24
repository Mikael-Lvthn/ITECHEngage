"use client";

import { useTransition } from "react";
import { followOrganization, unfollowOrganization } from "@/lib/actions/follows";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";

interface FollowButtonProps {
    organizationId: string;
    isFollowing: boolean;
    isOfficer: boolean;
}

export default function FollowButton({ organizationId, isFollowing, isOfficer }: FollowButtonProps) {
    const [isPending, startTransition] = useTransition();

    if (isOfficer) {
        return (
            <div className="px-5 py-2.5 rounded-xl border border-gold bg-gold/10 text-xs font-semibold text-primary flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-gold"></span> Following
            </div>
        );
    }

    const toggleFollow = () => {
        startTransition(async () => {
            try {
                if (isFollowing) {
                    await unfollowOrganization(organizationId);
                } else {
                    await followOrganization(organizationId);
                }
            } catch (error) {
                console.error("Follow error:", error);
            }
        });
    };

    return (
        <button
            onClick={toggleFollow}
            disabled={isPending}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                isFollowing
                    ? "border border-border bg-muted text-muted-foreground hover:bg-muted"
                    : "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
            } disabled:opacity-50`}
        >
            {isPending ? (
                <LoadingSpinner size="sm" />
            ) : isFollowing ? (
                <>
                    <span className="text-gold">★</span> Following
                </>
            ) : (
                <>
                    <span>+</span> Follow
                </>
            )}
        </button>
    );
}
