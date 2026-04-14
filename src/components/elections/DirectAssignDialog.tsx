"use client";

import { useState, useTransition } from "react";
import { assignUserToRole } from "@/lib/actions/org-roles";
import { Loader2, UserPlus } from "lucide-react";

interface OrgRole {
    id: string;
    title: string;
    hierarchy_level: number;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
}

interface Member {
    user_id: string;
    full_name: string;
}

interface DirectAssignDialogProps {
    organizationId: string;
    roles: OrgRole[];
    members: Member[];
    trigger?: React.ReactNode;
}

export default function DirectAssignDialog({
    organizationId,
    roles,
    members,
    trigger,
}: DirectAssignDialogProps) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [selectedRole, setSelectedRole] = useState<string>("");
    const [selectedMember, setSelectedMember] = useState<string>("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!selectedRole || !selectedMember) {
            setError("Please select both a role and a member.");
            return;
        }

        startTransition(async () => {
            try {
                await assignUserToRole(selectedRole, selectedMember, organizationId);
                const role = roles.find(r => r.id === selectedRole);
                const member = members.find(m => m.user_id === selectedMember);
                setSuccess(`Successfully assigned ${member?.full_name} to ${role?.title}`);
                setSelectedRole("");
                setSelectedMember("");
            } catch (err: any) {
                setError(err.message || "Failed to assign role.");
            }
        });
    };

    const handleClearAssignment = (roleId: string) => {
        startTransition(async () => {
            try {
                await assignUserToRole(roleId, null, organizationId);
                setSuccess("Assignment cleared successfully.");
            } catch (err: any) {
                setError(err.message || "Failed to clear assignment.");
            }
        });
    };

    // Filter out roles that already have assignments for the dropdown
    const availableRoles = roles.filter(r => !r.assigned_user_id);
    const assignedRoles = roles.filter(r => r.assigned_user_id);

    return (
        <>
            {trigger ? (
                <div onClick={() => setOpen(true)}>{trigger}</div>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <UserPlus className="w-4 h-4" />
                    Direct Assign
                </button>
            )}

            {open && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border animate-scale-in overflow-hidden max-h-[90vh] flex flex-col">
                            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/10 to-transparent shrink-0">
                                <h2 className="text-lg font-bold">Direct Role Assignment</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Assign members directly to positions without an election
                                </p>
                            </div>

                            <div className="p-6 space-y-6 overflow-y-auto">
                                {/* Current assignments */}
                                {assignedRoles.length > 0 && (
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Current Assignments</h3>
                                        <div className="space-y-2">
                                            {assignedRoles.map((role) => (
                                                <div
                                                    key={role.id}
                                                    className="flex items-center justify-between p-3 rounded-lg border bg-gray-50"
                                                >
                                                    <div>
                                                        <p className="font-medium text-sm">{role.title}</p>
                                                        <p className="text-xs text-gray-500">{role.assigned_user_name}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleClearAssignment(role.id)}
                                                        disabled={isPending}
                                                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* New assignment form */}
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-700">New Assignment</h3>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Position *</label>
                                        <select
                                            value={selectedRole}
                                            onChange={(e) => setSelectedRole(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        >
                                            <option value="">Select a position...</option>
                                            {availableRoles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.title}
                                                </option>
                                            ))}
                                        </select>
                                        {availableRoles.length === 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                All positions are currently assigned.
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Member *</label>
                                        <select
                                            value={selectedMember}
                                            onChange={(e) => setSelectedMember(e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        >
                                            <option value="">Select a member...</option>
                                            {members.map((member) => (
                                                <option key={member.user_id} value={member.user_id}>
                                                    {member.full_name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {error && (
                                        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                            {error}
                                        </div>
                                    )}

                                    {success && (
                                        <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                                            {success}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isPending || availableRoles.length === 0}
                                        className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Assign to Position
                                    </button>
                                </form>

                                {/* Info */}
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                                    <p className="text-xs text-amber-800">
                                        <strong>Note:</strong> Direct assignments bypass the election process. Use this when you already know who should fill a position.
                                    </p>
                                </div>
                            </div>

                            <div className="px-6 py-4 border-t flex justify-end shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
