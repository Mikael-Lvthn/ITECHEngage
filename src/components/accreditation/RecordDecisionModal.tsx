"use client";

import { useState } from "react";

export type DecisionStatus = 'approved' | 'rejected' | 'revalidation_required';

interface RecordDecisionModalProps {
    accreditationId: string;
    organizationName: string;
    onClose: () => void;
    onSave: (status: DecisionStatus, notes: string, expiresAt: string | undefined) => Promise<void>;
}

export default function RecordDecisionModal({
    organizationName,
    onClose,
    onSave,
}: RecordDecisionModalProps) {
    const [status, setStatus] = useState<DecisionStatus>("approved");
    const [notes, setNotes] = useState("");
    
    // Default to 1 year from now for expiry
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    const defaultExpiry = nextYear.toISOString().split("T")[0];
    const [expiresAt, setExpiresAt] = useState<string>(defaultExpiry);
    
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");

    const handleSave = async () => {
        setIsSaving(true);
        setError("");
        try {
            await onSave(status, notes, status === "approved" ? expiresAt : undefined);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to record decision.");
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-background rounded-xl border shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b bg-muted/30">
                    <h2 className="text-lg font-semibold">Record Decision</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Commission review for <span className="font-medium text-foreground">{organizationName}</span>
                    </p>
                </div>
                
                <div className="p-6 space-y-5">
                    {error && (
                        <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-lg">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium mb-2">Decision <span className="text-destructive">*</span></label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as DecisionStatus)}
                            className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                        >
                            <option value="approved">Approved (Accredited)</option>
                            <option value="revalidation_required">Revalidation Required</option>
                            <option value="rejected">Rejected (Not Accredited)</option>
                        </select>
                    </div>

                    {status === "approved" && (
                        <div>
                            <label className="block text-sm font-medium mb-2">Expiry Date <span className="text-destructive">*</span></label>
                            <input
                                type="date"
                                required
                                value={expiresAt}
                                onChange={(e) => setExpiresAt(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium mb-2">Internal Notes & Justification</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Reason for decision, missing items, etc..."
                            className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        />
                    </div>
                </div>

                <div className="px-6 py-4 border-t bg-muted/30 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2 min-h-[44px] text-sm font-medium rounded-lg border hover:bg-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-6 py-2 min-h-[44px] text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {isSaving ? "Saving..." : "Record Decision"}
                    </button>
                </div>
            </div>
        </div>
    );
}
