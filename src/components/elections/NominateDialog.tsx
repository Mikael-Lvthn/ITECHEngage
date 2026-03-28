"use client";

import { useState, useTransition } from "react";
import { nominateCandidate } from "@/lib/actions/elections";

interface NominateDialogProps {
    electionId: string;
    roles: { id: string; title: string }[];
    alreadyNominated: string[];
}

export default function NominateDialog({ electionId, roles, alreadyNominated }: NominateDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState("");
    const [platform, setPlatform] = useState("");
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const availableRoles = roles.filter((r) => !alreadyNominated.includes(r.id));

    const handleSubmit = () => {
        if (!selectedRoleId) return;
        setError(null);

        const formData = new FormData();
        formData.set("election_id", electionId);
        formData.set("organization_role_id", selectedRoleId);
        formData.set("platform", platform);

        startTransition(async () => {
            try {
                await nominateCandidate(formData);
                setSuccess(true);
                setOpen(false);
                setSelectedRoleId("");
                setPlatform("");
            } catch (err: any) {
                setError(err.message || "Failed to submit nomination.");
            }
        });
    };

    if (availableRoles.length === 0 && !success) {
        return null;
    }

    return (
        <>
            {success && (
                <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                    <span>✅</span> Your nomination has been submitted successfully!
                </div>
            )}

            {!success && (
                <button
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#C9A227] text-[#2B2B2B] text-sm font-semibold hover:bg-[#B8911E] transition-colors shadow-sm"
                >
                    <span>✋</span> Nominate Myself
                </button>
            )}

            {open && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border animate-scale-in overflow-hidden">
                            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#C9A227]/10 to-transparent">
                                <h2 className="text-lg font-bold">Nominate Yourself</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">Choose the role you want to run for</p>
                            </div>

                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Role *</label>
                                    <select
                                        value={selectedRoleId}
                                        onChange={(e) => setSelectedRoleId(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    >
                                        <option value="">Select a role...</option>
                                        {availableRoles.map((role) => (
                                            <option key={role.id} value={role.id}>
                                                {role.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Platform / Statement (optional)</label>
                                    <textarea
                                        value={platform}
                                        onChange={(e) => setPlatform(e.target.value)}
                                        placeholder="Share your vision for this role..."
                                        rows={3}
                                        className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                        {error}
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-4 border-t flex justify-end gap-2">
                                <button
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedRoleId || isPending}
                                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isPending ? "Submitting..." : "Submit Nomination"}
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
