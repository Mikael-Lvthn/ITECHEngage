"use client";

import { useState } from "react";
import { deleteOrganization } from "@/lib/actions/admin";

interface DeleteOrgButtonProps {
    organizationId: string;
    orgName: string;
}

export default function DeleteOrgButton({ organizationId, orgName }: DeleteOrgButtonProps) {
    const [confirming, setConfirming] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        setLoading(true);
        try {
            await deleteOrganization(organizationId);
        } catch (err) {
            console.error(err);
            setLoading(false);
            setConfirming(false);
        }
    };

    if (confirming) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">Delete &quot;{orgName}&quot;?</span>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
                >
                    {loading ? "..." : "Yes"}
                </button>
                <button
                    onClick={() => setConfirming(false)}
                    className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors"
                >
                    No
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={() => setConfirming(true)}
            className="px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors"
        >
            🗑️ Delete
        </button>
    );
}
