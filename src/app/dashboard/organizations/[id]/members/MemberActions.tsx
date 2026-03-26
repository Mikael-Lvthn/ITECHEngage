"use client";

import { useState } from "react";
import { approveMember, rejectMember, setMemberRole } from "@/lib/actions/members";

interface MemberActionsProps {
    membershipId: string;
    orgId: string;
    currentStatus: string;
    currentRole: string;
}

export default function MemberActions({
    membershipId,
    orgId,
    currentStatus,
    currentRole,
}: MemberActionsProps) {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        try {
            await approveMember(membershipId, orgId);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleReject = async () => {
        setLoading(true);
        try {
            await rejectMember(membershipId, orgId);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleRole = async () => {
        setLoading(true);
        const newRole = currentRole === "officer" ? "member" : "officer";
        try {
            await setMemberRole(membershipId, newRole, orgId);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (currentStatus === "pending") {
        return (
            <div className="flex items-center gap-2">
                <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                    Approve
                </button>
                <button
                    onClick={handleReject}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                    Reject
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground capitalize px-2 py-0.5 rounded-full bg-muted">
                {currentRole}
            </span>
            <button
                onClick={handleToggleRole}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors disabled:opacity-50"
            >
                {currentRole === "officer" ? "Demote" : "Promote"}
            </button>
        </div>
    );
}
