"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getAuthUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return { supabase, user };
}

async function canManageOrgRoles(supabase: SupabaseClient, userId: string, organizationId: string) {
    const { data: role } = await supabase.rpc("get_my_role");
    if (role === "admin") return true;

    const { data: managerRole } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("assigned_user_id", userId)
        .eq("can_manage_roles", true)
        .limit(1);

    return !!(managerRole && managerRole.length > 0);
}

export async function createOrgRole(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    const organizationId = formData.get("organization_id") as string;
    const title = formData.get("title") as string;
    const hierarchyLevel = parseInt(formData.get("hierarchy_level") as string) || 1;
    const canManageRoles = formData.get("can_manage_roles") === "true";
    const assignedUserId = formData.get("assigned_user_id") as string;
    const parentRoleId = formData.get("parent_role_id") as string;

    if (!organizationId || !title) {
        throw new Error("Organization ID and role title are required.");
    }

    const authorized = await canManageOrgRoles(supabase, user.id, organizationId);
    if (!authorized) {
        throw new Error("You are not authorized to manage roles for this organization.");
    }

    const { error } = await supabase.from("organization_roles").insert({
        organization_id: organizationId,
        title: title.trim(),
        hierarchy_level: hierarchyLevel,
        can_manage_roles: canManageRoles,
        assigned_user_id: assignedUserId || null,
        parent_role_id: parentRoleId || null,
    });

    if (error) {
        if (error.code === "23505") {
            throw new Error("A role with this title already exists in this organization.");
        }
        throw new Error(error.message);
    }

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/elections");
}

export async function updateOrgRole(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    const roleId = formData.get("role_id") as string;
    const organizationId = formData.get("organization_id") as string;
    const title = formData.get("title") as string;
    const hierarchyLevelRaw = formData.get("hierarchy_level");
    const canManageRoles = formData.get("can_manage_roles") === "true";
    const assignedUserId = formData.get("assigned_user_id");
    const parentRoleId = formData.get("parent_role_id");

    if (!roleId || !organizationId) {
        throw new Error("Role ID and Organization ID are required.");
    }

    const authorized = await canManageOrgRoles(supabase, user.id, organizationId);
    if (!authorized) {
        throw new Error("You are not authorized to manage roles for this organization.");
    }

    const updateData: Record<string, unknown> = {};
    if (title) updateData.title = title.trim();
    
    if (hierarchyLevelRaw !== null) {
        const val = parseInt(hierarchyLevelRaw as string);
        if (!isNaN(val)) {
            updateData.hierarchy_level = val;
        }
    }
    
    updateData.can_manage_roles = canManageRoles;
    
    if (assignedUserId !== null) {
        updateData.assigned_user_id = (assignedUserId as string) || null;
    }
    if (parentRoleId !== null) {
        updateData.parent_role_id = (parentRoleId as string) || null;
    }

    const { error } = await supabase
        .from("organization_roles")
        .update(updateData)
        .eq("id", roleId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/elections");
}

export async function deleteOrgRole(roleId: string, organizationId: string) {
    const { supabase, user } = await getAuthUser();

    const authorized = await canManageOrgRoles(supabase, user.id, organizationId);
    if (!authorized) {
        throw new Error("You are not authorized to manage roles for this organization.");
    }

    const { error } = await supabase
        .from("organization_roles")
        .delete()
        .eq("id", roleId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/elections");
}

export async function assignUserToRole(roleId: string, userId: string | null, organizationId: string) {
    const { supabase, user } = await getAuthUser();

    const authorized = await canManageOrgRoles(supabase, user.id, organizationId);
    if (!authorized) {
        throw new Error("You are not authorized to manage roles for this organization.");
    }

    // Validate: if assigning (not unassigning), the target user must be an approved member
    if (userId) {
        const { data: membership } = await supabase
            .from("memberships")
            .select("id")
            .eq("user_id", userId)
            .eq("organization_id", organizationId)
            .eq("status", "approved")
            .maybeSingle();

        if (!membership) {
            throw new Error("Cannot assign a role to someone who is not an approved member of this organization.");
        }
    }

    const { error } = await supabase
        .from("organization_roles")
        .update({ assigned_user_id: userId })
        .eq("id", roleId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
}
