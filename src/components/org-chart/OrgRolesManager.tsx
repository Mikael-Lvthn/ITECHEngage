"use client";

import { useState, useTransition } from "react";
import { createOrgRole, deleteOrgRole, assignUserToRole } from "@/lib/actions/org-roles";

interface Member {
    user_id: string;
    full_name: string;
}

interface Role {
    id: string;
    title: string;
    hierarchy_level: number;
    can_manage_roles: boolean;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
}

interface OrgRolesManagerProps {
    organizationId: string;
    roles: Role[];
    members: Member[];
}

export default function OrgRolesManager({ organizationId, roles, members }: OrgRolesManagerProps) {
    const [showCreate, setShowCreate] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleCreateRole = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        const formData = new FormData(e.currentTarget);
        formData.set("organization_id", organizationId);

        startTransition(async () => {
            try {
                await createOrgRole(formData);
                setSuccess("Role created successfully!");
                setShowCreate(false);
            } catch (err: any) {
                setError(err.message || "Failed to create role.");
            }
        });
    };

    const handleDeleteRole = (roleId: string, title: string) => {
        if (!confirm(`Are you sure you want to delete the "${title}" role?`)) return;
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            try {
                await deleteOrgRole(roleId, organizationId);
                setSuccess(`Role "${title}" deleted.`);
            } catch (err: any) {
                setError(err.message || "Failed to delete role.");
            }
        });
    };

    const handleAssignUser = (roleId: string, userId: string | null) => {
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            try {
                await assignUserToRole(roleId, userId, organizationId);
                setSuccess("Role assignment updated.");
            } catch (err: any) {
                setError(err.message || "Failed to assign user.");
            }
        });
    };

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold">Manage Roles</h2>
                    <p className="text-sm text-muted-foreground">Create and assign organizational roles</p>
                </div>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                    <span>+</span> Add Role
                </button>
            </div>

            {success && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                    <span>✅</span> {success}
                </div>
            )}

            {error && (
                <div className="mx-6 mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2">
                    <span>❌</span> {error}
                </div>
            )}

            {showCreate && (
                <form onSubmit={handleCreateRole} className="mx-6 mt-4 p-4 rounded-lg border bg-muted/30 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">Role Title *</label>
                            <input
                                name="title"
                                required
                                placeholder="e.g. President"
                                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-1">Hierarchy Level *</label>
                            <input
                                name="hierarchy_level"
                                type="number"
                                min="1"
                                max="10"
                                defaultValue="1"
                                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">1 = Highest (e.g. President)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-medium mb-1">Assign To (optional)</label>
                            <select
                                name="assigned_user_id"
                                className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="">Leave vacant</option>
                                {members.map((m) => (
                                    <option key={m.user_id} value={m.user_id}>
                                        {m.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-end pb-0.5">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="can_manage_roles"
                                    value="true"
                                    className="rounded border-gray-300"
                                />
                                <span className="text-xs font-medium">Can manage roles & elections</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-1">
                        <button
                            type="button"
                            onClick={() => setShowCreate(false)}
                            className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Creating..." : "Create Role"}
                        </button>
                    </div>
                </form>
            )}

            <div className="p-6">
                {roles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <span className="text-3xl block mb-2">🏗️</span>
                        <p className="text-sm">No roles created yet. Add a role to get started.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {[...roles].sort((a, b) => a.hierarchy_level - b.hierarchy_level).map((role) => (
                            <div key={role.id} className="flex items-center gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-1 shrink-0 w-8 text-center">
                                    <span className="text-xs font-bold text-muted-foreground">L{role.hierarchy_level}</span>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-sm">{role.title}</p>
                                        {role.can_manage_roles && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#C9A227]/10 text-[#C9A227] font-semibold">
                                                ⭐ Manager
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {role.assigned_user_name || "Vacant"}
                                    </p>
                                </div>

                                <select
                                    value={role.assigned_user_id || ""}
                                    onChange={(e) => handleAssignUser(role.id, e.target.value || null)}
                                    disabled={isPending}
                                    className="px-2 py-1 rounded border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 max-w-[150px]"
                                >
                                    <option value="">Vacant</option>
                                    {members.map((m) => (
                                        <option key={m.user_id} value={m.user_id}>
                                            {m.full_name}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    onClick={() => handleDeleteRole(role.id, role.title)}
                                    disabled={isPending}
                                    className="shrink-0 p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                                    title="Delete Role"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
