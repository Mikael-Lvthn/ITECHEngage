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
    if (!initial_student_id) {
        throw new Error("An initial student must be selected.");
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

    const logo_url = formData.get("logo_url") as string;
    const cover_photo_url = formData.get("cover_photo_url") as string;
    const mission = formData.get("mission") as string;
    const vision = formData.get("vision") as string;
    const core_values = formData.get("core_values") as string;

    if (!id) throw new Error("Organization ID is required");
    if (!name || name.trim().length === 0) {
        throw new Error("Organization name is required");
    }

    const updateData: any = {
        name: name.trim(),
        description: description?.trim() || null,
        visibility,
    };

    if (logo_url && logo_url.trim().length > 0) updateData.logo_url = logo_url;
    if (cover_photo_url && cover_photo_url.trim().length > 0) updateData.cover_photo_url = cover_photo_url;
    if (mission !== null && mission !== undefined) updateData.mission = mission.trim();
    if (vision !== null && vision !== undefined) updateData.vision = vision.trim();
    if (core_values !== null && core_values !== undefined) updateData.core_values = core_values.trim();

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
