"use client";

import { useState } from "react";
import { approveMembership, rejectMembership } from "@/lib/actions/memberships";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";

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
                <><LoadingSpinner size="sm" className="text-white" /> Approving…</>
            ) : (
                <>✓ Approve</>
            )}
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
                <><LoadingSpinner size="sm" className="text-red-700" /> Rejecting…</>
            ) : (
                <>✕ Reject</>
            )}
        </button>
    );
}
