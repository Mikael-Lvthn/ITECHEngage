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
            <div className="px-5 py-2.5 rounded-xl border border-[#C9A227] bg-[#C9A227]/10 text-xs font-semibold text-[#800000] flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C9A227]"></span> Following
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
                    ? "border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100"
                    : "bg-[#800000] text-primary-foreground shadow-md hover:bg-[#800000]/90"
            } disabled:opacity-50`}
        >
            {isPending ? (
                <LoadingSpinner size="sm" />
            ) : isFollowing ? (
                <>
                    <span className="text-[#C9A227]">★</span> Following
                </>
            ) : (
                <>
                    <span>+</span> Follow
                </>
            )}
        </button>
    );
}
