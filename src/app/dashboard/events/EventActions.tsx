"use client";

import { useState } from "react";
import { approveEvent, rejectEvent } from "@/lib/actions/events";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";

export function ApproveEventButton({ eventId }: { eventId: string }) {
    const [loading, setLoading] = useState(false);

    const handle = async () => {
        setLoading(true);
        try {
            await approveEvent(eventId);
        } catch {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handle}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
        >
            {loading ? (
                <><LoadingSpinner size="sm" className="text-white" /> Approving…</>
            ) : (
                "✓ Approve"
            )}
        </button>
    );
}

export function RejectEventButton({ eventId }: { eventId: string }) {
    const [loading, setLoading] = useState(false);

    const handle = async () => {
        if (!confirm("Reject this event?")) return;
        setLoading(true);
        try {
            await rejectEvent(eventId);
        } catch {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handle}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition-colors disabled:opacity-50"
        >
            {loading ? (
                <><LoadingSpinner size="sm" className="text-red-700" /> Rejecting…</>
            ) : (
                "✕ Reject"
            )}
        </button>
    );
}
