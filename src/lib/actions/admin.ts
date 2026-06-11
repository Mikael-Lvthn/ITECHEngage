"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: role, error } = await supabase.rpc("get_my_role");

    if (error || role !== "admin") {
        throw new Error("Unauthorized: Admin role required");
    }

    return { supabase, user };
}

export async function createOrganization(formData: FormData) {
    const { supabase } = await requireAdmin();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const visibility = (formData.get("visibility") as string) || "public";

    const logo_url = formData.get("logo_url") as string;
    const cover_photo_url = formData.get("cover_photo_url") as string;
    const mission = formData.get("mission") as string;
    const vision = formData.get("vision") as string;
    const core_values = formData.get("core_values") as string;
    const initial_student_id = formData.get("initial_student_id") as string;

    if (!name || name.trim().length === 0) {
        throw new Error("Organization name is required");
    }
    if (!logo_url || !cover_photo_url || !mission || !vision || !core_values) {
        throw new Error("Logo, cover photo, mission, vision, and core values are required.");
    }

    const { data: orgData, error: orgError } = await supabase.from("organizations").insert({
        name: name.trim(),
        description: description?.trim() || null,
        visibility,
        accreditation_status: "approved",
        logo_url,
        cover_photo_url,
        mission: mission.trim(),
        vision: vision.trim(),
        core_values: core_values.trim()
    }).select().single();

    if (orgError) throw new Error(orgError.message);

    // Only create membership + President role if an initial student was selected
    if (initial_student_id) {
        const { error: membershipError } = await supabase.from("memberships").insert({
            user_id: initial_student_id,
            organization_id: orgData.id,
            role: "officer",
            status: "approved"
        });

        if (membershipError) {
            await supabase.from("organizations").delete().eq("id", orgData.id);
            throw new Error("Failed to assign initial student. Organization creation rolled back.");
        }

        // Create initial President role and assign to initial student
        const { error: roleError } = await supabase.from("organization_roles").insert({
            organization_id: orgData.id,
            title: "President",
            hierarchy_level: 1,
            can_manage_roles: true,
            assigned_user_id: initial_student_id,
        });

        if (roleError) {
            console.error("Failed to create initial President role:", roleError);
        }
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/organizations");
    revalidatePath("/");
}

export async function updateOrganization(formData: FormData) {
    const { supabase } = await requireAdmin();

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const visibility = (formData.get("visibility") as string) || "public";

    const logo_url = formData.get("logo_url");
    const cover_photo_url = formData.get("cover_photo_url");
    const mission = formData.get("mission");
    const vision = formData.get("vision");
    const core_values = formData.get("core_values");

    if (!id) throw new Error("Organization ID is required");
    if (!name || name.trim().length === 0) {
        throw new Error("Organization name is required");
    }

    const updateData: {
        name: string;
        description: string | null;
        visibility: string;
        logo_url?: string;
        cover_photo_url?: string;
        mission?: string;
        vision?: string;
        core_values?: string;
    } = {
        name: name.trim(),
        description: description?.trim() || null,
        visibility,
    };

    if (logo_url !== null && (logo_url as string).trim().length > 0) updateData.logo_url = (logo_url as string).trim();
    if (cover_photo_url !== null && (cover_photo_url as string).trim().length > 0) updateData.cover_photo_url = (cover_photo_url as string).trim();
    if (mission !== null) updateData.mission = (mission as string).trim();
    if (vision !== null) updateData.vision = (vision as string).trim();
    if (core_values !== null) updateData.core_values = (core_values as string).trim();

    const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${id}`);
    revalidatePath("/");
}

export async function deleteOrganization(organizationId: string) {
    const { supabase } = await requireAdmin();

    if (!organizationId) throw new Error("Organization ID is required");

    const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", organizationId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/organizations");
    revalidatePath("/");
}

/* ========== Communication: Mass Announcements ========== */

const BATCH_SIZE = 100;

export async function sendAnnouncement(formData: FormData) {
    const { supabase, user } = await requireAdmin();

    const target = formData.get("target") as string; // "all" | org_id
    const title = formData.get("title") as string;
    const message = formData.get("message") as string;

    if (!title?.trim() || !message?.trim()) {
        throw new Error("Title and message are required.");
    }

    let userIds: string[] = [];

    if (target === "all") {
        const { data: allUsers } = await supabase
            .from("profiles")
            .select("id");
        userIds = (allUsers || []).map((u) => u.id);
    } else {
        // Fetch members + followers of specific org
        const { data: members } = await supabase
            .from("memberships")
            .select("user_id")
            .eq("organization_id", target)
            .eq("status", "approved");

        const { data: followers } = await supabase
            .from("organization_follows")
            .select("user_id")
            .eq("organization_id", target);

        const idSet = new Set<string>();
        (members || []).forEach((m) => idSet.add(m.user_id));
        (followers || []).forEach((f) => idSet.add(f.user_id));
        userIds = Array.from(idSet);
    }

    // Exclude admin's own ID
    userIds = userIds.filter((id) => id !== user.id);

    if (userIds.length === 0) {
        throw new Error("No users found for the selected target.");
    }

    // Batch insert to avoid payload limits
    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
        const batch = userIds.slice(i, i + BATCH_SIZE);
        const notifications = batch.map((userId) => ({
            user_id: userId,
            type: "announcement",
            title: title.trim(),
            message: message.trim(),
            link: "/dashboard/notifications",
            status: "unread",
        }));

        const { error } = await supabase.from("notifications").insert(notifications);
        if (error) throw new Error(error.message);
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/notifications");

    return { count: userIds.length };
}

/* ========== Configuration: Category CRUD ========== */

export async function createCategory(formData: FormData) {
    const { supabase } = await requireAdmin();

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!name?.trim()) {
        throw new Error("Category name is required.");
    }

    const { data: existing } = await supabase
        .from("organization_categories")
        .select("id")
        .ilike("name", name.trim())
        .maybeSingle();

    if (existing) {
        throw new Error("A category with this name already exists.");
    }

    const { error } = await supabase.from("organization_categories").insert({
        name: name.trim(),
        description: description?.trim() || null,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
}

export async function deleteCategory(categoryId: string) {
    const { supabase } = await requireAdmin();

    const { count } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true })
        .eq("category_id", categoryId);

    if (count && count > 0) {
        throw new Error(
            `Cannot delete: ${count} organization(s) use this category. Reassign them first.`
        );
    }

    const { error } = await supabase
        .from("organization_categories")
        .delete()
        .eq("id", categoryId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
}

