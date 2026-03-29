"use client";

import { useState } from "react";
import { joinOrganization, leaveOrganization } from "@/lib/actions/organizations";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";

interface JoinButtonProps {
    organizationId: string;
    membershipStatus: "none" | "pending" | "approved";
}

export default function JoinButton({ organizationId, membershipStatus }: JoinButtonProps) {
    const [status, setStatus] = useState(membershipStatus);
    const [loading, setLoading] = useState(false);

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

    const handleLeave = async () => {
        setLoading(true);
        try {
            await leaveOrganization(organizationId);
            setStatus("none");
            window.location.reload();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (status === "approved") {
        return (
            <button
                onClick={handleLeave}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-destructive/30 text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
                {loading ? (
                    <><LoadingSpinner size="sm" className="text-destructive" /> Leaving…</>
                ) : (
                    "Leave Organization"
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
