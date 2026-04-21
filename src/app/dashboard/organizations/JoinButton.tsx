"use client";

import { useState } from "react";
import { joinOrganization, requestLeave } from "@/lib/actions/organizations";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";

interface JoinButtonProps {
    organizationId: string;
    membershipStatus: "none" | "pending" | "approved";
    hasLeaveRequest?: boolean;
}

export default function JoinButton({ organizationId, membershipStatus, hasLeaveRequest = false }: JoinButtonProps) {
    const [status, setStatus] = useState(membershipStatus);
    const [loading, setLoading] = useState(false);
    const [leavePending, setLeavePending] = useState(hasLeaveRequest);

    const handleJoin = async () => {
        setLoading(true);
        try {
            await joinOrganization(organizationId);
            setStatus("pending");
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestLeave = async () => {
        setLoading(true);
        try {
            await requestLeave(organizationId);
            setLeavePending(true);
        } catch (err: any) {
            console.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (status === "approved") {
        if (leavePending) {
            return (
                <span className="inline-flex items-center px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-sm font-medium">
                    ⏳ Leave Pending Approval
                </span>
            );
        }

        return (
            <button
                onClick={handleRequestLeave}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <><LoadingSpinner size="sm" className="text-destructive" /> Requesting…</>
                ) : (
                    "Request to Leave"
                )}
            </button>
        );
    }

    if (status === "pending") {
        return (
            <span className="inline-flex items-center px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium">
                ⏳ Request Pending
            </span>
        );
    }

    return (
        <button
            onClick={handleJoin}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
            {loading ? (
                <><LoadingSpinner size="sm" className="text-primary-foreground" /> Joining…</>
            ) : (
                "Join Organization"
            )}
        </button>
    );
}
