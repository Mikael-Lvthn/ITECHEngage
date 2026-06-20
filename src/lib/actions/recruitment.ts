"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

async function requireOrgOfficer(supabase: SupabaseClient, userId: string, organizationId: string) {
    const { data: role } = await supabase.rpc("get_my_role");
    if (role === "admin") return;

    const { data: structuralRole } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("assigned_user_id", userId)
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

    if (!structuralRole) {
        throw new Error("Unauthorized: Officer or Admin role required");
    }
}

async function requireAccreditedOrg(supabase: SupabaseClient, organizationId: string) {
    const { data: org } = await supabase
        .from("organizations")
        .select("accreditation_status")
        .eq("id", organizationId)
        .single();

    if (org?.accreditation_status !== "approved") {
        throw new Error(
            `Action is only available to accredited organizations. Your status is: ${org?.accreditation_status || "unknown"}.`
        );
    }
}

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

    await requireAccreditedOrg(supabase, organizationId);

    const { error } = await supabase.from("recruitment_requests").insert({
        organization_id: organizationId,
        title: title.trim(),
        description: description?.trim() || null,
        created_by: user.id,
        is_active: true,
    });

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/officer-panel");
}

export async function closeRecruitment(recruitmentId: string, organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    await requireOrgOfficer(supabase, user.id, organizationId);

    const { error } = await supabase
        .from("recruitment_requests")
        .update({ is_active: false })
        .eq("id", recruitmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/officer-panel");
}

export async function reopenRecruitment(recruitmentId: string, organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    await requireOrgOfficer(supabase, user.id, organizationId);

    const { error } = await supabase
        .from("recruitment_requests")
        .update({ is_active: true })
        .eq("id", recruitmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/officer-panel");
}

export async function updateRecruitment(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const recruitmentId = formData.get("recruitment_id") as string;
    const organizationId = formData.get("organization_id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;

    if (!recruitmentId || !organizationId || !title?.trim()) {
        throw new Error("Recruitment ID, organization ID, and title are required");
    }

    await requireOrgOfficer(supabase, user.id, organizationId);

    const { error } = await supabase
        .from("recruitment_requests")
        .update({ title: title.trim(), description: description?.trim() || null })
        .eq("id", recruitmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/officer-panel");
}

export async function deleteRecruitment(recruitmentId: string, organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    await requireOrgOfficer(supabase, user.id, organizationId);

    const { error } = await supabase
        .from("recruitment_requests")
        .delete()
        .eq("id", recruitmentId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/officer-panel");
}
