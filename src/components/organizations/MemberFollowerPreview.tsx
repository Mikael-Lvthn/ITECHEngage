"use client";

import { useState } from "react";
import Image from "next/image";
import UserListModal from "./UserListModal";

interface PreviewUser {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

interface MemberFollowerPreviewProps {
    organizationId: string;
    memberCount: number;
    followerCount: number;
    memberPreviews: PreviewUser[];
    followerPreviews: PreviewUser[];
    totalMembers: number;
    totalFollowers: number;
}

export default function MemberFollowerPreview({
    organizationId,
    memberCount,
    followerCount,
    memberPreviews,
    followerPreviews,
    totalMembers,
    totalFollowers,
}: MemberFollowerPreviewProps) {
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showFollowersModal, setShowFollowersModal] = useState(false);

    return (
        <div className="flex items-center gap-4 text-sm">
            {/* Members */}
            <button
                type="button"
                onClick={() => setShowMembersModal(true)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group text-left"
            >
                {memberPreviews.length > 0 && (
                    <div className="flex -space-x-1.5 mr-1">
                        {memberPreviews.slice(0, 3).map((u) => (
                            <div
                                key={u.id}
                                className="relative w-5 h-5 rounded-full border border-card bg-muted overflow-hidden"
                            >
                                {u.avatar_url ? (
                                    <Image src={u.avatar_url} alt="" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#800000]/20 flex items-center justify-center text-[7px] font-bold text-[#800000]">
                                        {u.full_name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <span>
                    <span className="font-semibold text-foreground group-hover:underline">{memberCount}</span> member{memberCount !== 1 ? "s" : ""}
                </span>
            </button>

            {/* Followers */}
            <button
                type="button"
                onClick={() => setShowFollowersModal(true)}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors group text-left"
            >
                {followerPreviews.length > 0 && (
                    <div className="flex -space-x-1.5 mr-1">
                        {followerPreviews.slice(0, 3).map((u) => (
                            <div
                                key={u.id}
                                className="relative w-5 h-5 rounded-full border border-card bg-muted overflow-hidden"
                            >
                                {u.avatar_url ? (
                                    <Image src={u.avatar_url} alt="" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#800000]/20 flex items-center justify-center text-[7px] font-bold text-[#800000]">
                                        {u.full_name?.[0]?.toUpperCase()}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <span>
                    <span className="font-semibold text-foreground group-hover:underline">{followerCount}</span> follower{followerCount !== 1 ? "s" : ""}
                </span>
            </button>

            {/* Modals */}
            <UserListModal
                isOpen={showMembersModal}
                onClose={() => setShowMembersModal(false)}
                title="Organization Members"
                users={memberPreviews}
                total={totalMembers}
                organizationId={organizationId}
                type="members"
            />

            <UserListModal
                isOpen={showFollowersModal}
                onClose={() => setShowFollowersModal(false)}
                title="Organization Followers"
                users={followerPreviews}
                total={totalFollowers}
                organizationId={organizationId}
                type="followers"
            />
        </div>
    );
}
