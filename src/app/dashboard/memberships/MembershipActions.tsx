"use client";

import { useState } from "react";
import { approveMembership, rejectMembership } from "@/lib/actions/memberships";

interface MembershipActionProps {
    membershipId: string;
}

export function ApproveButton({ membershipId }: MembershipActionProps) {
    const [loading, setLoading] = useState(false);

    const handleApprove = async () => {
        setLoading(true);
        try {
            await approveMembership(membershipId);
        } catch {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleApprove}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
            {loading ? (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                "✓"
            )}
            {loading ? "Approving..." : "Approve"}
        </button>
    );
}

export function RejectButton({ membershipId }: MembershipActionProps) {
    const [loading, setLoading] = useState(false);

    const handleReject = async () => {
        if (!confirm("Are you sure you want to reject this request?")) return;
        setLoading(true);
        try {
            await rejectMembership(membershipId);
        } catch {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleReject}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
        >
            {loading ? (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            ) : (
                "✕"
            )}
            {loading ? "Rejecting..." : "Reject"}
        </button>
    );
}
