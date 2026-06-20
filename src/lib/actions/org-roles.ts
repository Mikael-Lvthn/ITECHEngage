"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

function getAdminClient(): SupabaseClient | null {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing Supabase environment variables for organization update.");
        return null;
    }
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

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

/**
 * Lets an officer with a `can_manage_roles` role (or an admin) edit their
 * organization's profile. The organizations table and the organization-assets
 * bucket are admin-only at the RLS layer, so after authorizing the caller we
 * perform the upload and update with the service-role client. Visibility is
 * intentionally NOT editable here — it stays admin-only.
 */
export async function updateOrganizationProfile(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    const organizationId = formData.get("organization_id") as string;
    const name = formData.get("name") as string;

    if (!organizationId) throw new Error("Organization ID is required.");
    if (!name || name.trim().length === 0) throw new Error("Organization name is required.");

    const authorized = await canManageOrgRoles(supabase, user.id, organizationId);
    if (!authorized) {
        throw new Error("You are not authorized to edit this organization.");
    }

    const admin = getAdminClient();
    if (!admin) throw new Error("Server misconfiguration. Please contact support.");

    // Start from the current image URLs; replace only if a new file was picked.
    let logoUrl = (formData.get("logo_url") as string) || null;
    let coverUrl = (formData.get("cover_photo_url") as string) || null;

    const uploadImage = async (file: File, kind: "logo" | "cover") => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${kind}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { error: uploadError } = await admin.storage
            .from("organization-assets")
            .upload(fileName, file, { contentType: file.type, upsert: false });
        if (uploadError) {
            console.error(`Failed to upload ${kind}:`, uploadError.message);
            throw new Error(`Failed to upload ${kind} image.`);
        }
        return admin.storage.from("organization-assets").getPublicUrl(fileName).data.publicUrl;
    };

    const logoFile = formData.get("logoFile") as File | null;
    if (logoFile && logoFile.size > 0) logoUrl = await uploadImage(logoFile, "logo");

    const coverFile = formData.get("coverFile") as File | null;
    if (coverFile && coverFile.size > 0) coverUrl = await uploadImage(coverFile, "cover");

    const description = formData.get("description") as string | null;
    const mission = formData.get("mission") as string | null;
    const vision = formData.get("vision") as string | null;
    const core_values = formData.get("core_values") as string | null;
    const category_id = formData.get("category_id") as string | null;

    // Note: `visibility` is deliberately omitted — admin-only.
    const updateData: Record<string, unknown> = {
        name: name.trim(),
        description: description?.trim() || null,
        category_id: category_id ? category_id.trim() || null : null,
    };
    if (mission !== null) updateData.mission = mission.trim();
    if (vision !== null) updateData.vision = vision.trim();
    if (core_values !== null) updateData.core_values = core_values.trim();
    if (logoUrl) updateData.logo_url = logoUrl;
    if (coverUrl) updateData.cover_photo_url = coverUrl;

    const { error } = await admin
        .from("organizations")
        .update(updateData)
        .eq("id", organizationId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/organizations");
}
