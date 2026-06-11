"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createRecruitment(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const organizationId = formData.get("organization_id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!organizationId || !title?.trim()) {
        throw new Error("Organization ID and title are required");
    }

    const { data: role } = await supabase.rpc("get_my_role");
    const isAdmin = role === "admin";

    if (!isAdmin) {
        const { data: structuralRole } = await supabase
            .from("organization_roles")
            .select("id")
            .eq("assigned_user_id", user.id)
            .eq("organization_id", organizationId)
            .limit(1)
            .maybeSingle();

        if (!structuralRole) {
            throw new Error("Unauthorized: Officer or Admin role required");
        }
    }

    const { error } = await supabase.from("recruitment_requests").insert({
        organization_id: organizationId,
        title: title.trim(),
        description: description?.trim() || null,
        created_by: user.id,
        is_active: true,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
}

export async function closeRecruitment(recruitmentId: string, organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: role } = await supabase.rpc("get_my_role");
    const isAdmin = role === "admin";

    if (!isAdmin) {
        const { data: structuralRole } = await supabase
            .from("organization_roles")
            .select("id")
            .eq("assigned_user_id", user.id)
            .eq("organization_id", organizationId)
            .limit(1)
            .maybeSingle();

        if (!structuralRole) {
            throw new Error("Unauthorized: Officer or Admin role required");
        }
    }

    const { error } = await supabase
        .from("recruitment_requests")
        .update({ is_active: false })
        .eq("id", recruitmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
}
