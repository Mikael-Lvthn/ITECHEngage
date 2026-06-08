"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireOfficerOfOrg(organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    // Check structural roles
    const { data: structuralRole } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("assigned_user_id", user.id)
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

    if (!structuralRole) {
        // Fallback: check membership role
        const { data: membership } = await supabase
            .from("memberships")
            .select("id")
            .eq("user_id", user.id)
            .eq("organization_id", organizationId)
            .eq("role", "officer")
            .eq("status", "approved")
            .maybeSingle();

        if (!membership) {
            throw new Error("Unauthorized: Officer role required");
        }
    }

    return { supabase, user };
}

async function requireAdmin() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") {
        throw new Error("Unauthorized: Admin role required");
    }

    return { supabase, user };
}

export async function submitAccreditation(formData: FormData) {
    const organizationId = formData.get("organization_id") as string;
    const academicYear = formData.get("academic_year") as string;
    const documentsUrl = formData.get("documents_url") as string;
    const notes = formData.get("notes") as string;

    if (!organizationId || !academicYear?.trim()) {
        throw new Error("Organization and academic year are required.");
    }

    const { supabase, user } = await requireOfficerOfOrg(organizationId);

    // Check for existing pending accreditation
    const { data: existing } = await supabase
        .from("accreditations")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .maybeSingle();

    if (existing) {
        throw new Error("This organization already has a pending accreditation application.");
    }

    const { error } = await supabase.from("accreditations").insert({
        organization_id: organizationId,
        academic_year: academicYear.trim(),
        status: "pending",
        documents_url: documentsUrl?.trim() || null,
        notes: notes?.trim() || null,
        submitted_by: user.id,
    });

    if (error) throw new Error(error.message);

    // Notify admins
    const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

    const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", organizationId)
        .single();

    if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
            admins.map((admin) => ({
                user_id: admin.id,
                type: "accreditation_submission",
                title: "New Accreditation Application",
                message: `${org?.name || "An organization"} has submitted an accreditation application for ${academicYear}.`,
                link: "/dashboard/accreditation",
                status: "unread",
            }))
        );
    }

    revalidatePath("/dashboard/accreditation");
    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/admin");
}

export async function approveAccreditation(accreditationId: string) {
    const { supabase, user } = await requireAdmin();

    const { data: accreditation } = await supabase
        .from("accreditations")
        .select("organization_id, status, submitted_by")
        .eq("id", accreditationId)
        .single();

    if (!accreditation) throw new Error("Accreditation not found.");
    if (accreditation.status !== "pending") {
        throw new Error("This accreditation has already been reviewed.");
    }

    // Update accreditation status
    const { error } = await supabase
        .from("accreditations")
        .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
        })
        .eq("id", accreditationId);

    if (error) throw new Error(error.message);

    // Update organization accreditation_status
    await supabase
        .from("organizations")
        .update({ accreditation_status: "approved" })
        .eq("id", accreditation.organization_id);

    // Notify the submitter
    if (accreditation.submitted_by) {
        const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", accreditation.organization_id)
            .single();

        await supabase.from("notifications").insert({
            user_id: accreditation.submitted_by,
            type: "accreditation_approved",
            title: "Accreditation Approved",
            message: `Your accreditation application for ${org?.name || "your organization"} has been approved.`,
            link: "/dashboard/accreditation",
            status: "unread",
        });
    }

    revalidatePath("/dashboard/accreditation");
    revalidatePath("/dashboard/admin");
    revalidatePath(`/dashboard/organizations/${accreditation.organization_id}`);
    revalidatePath("/");
}

export async function rejectAccreditation(accreditationId: string, rejectionNotes?: string) {
    const { supabase, user } = await requireAdmin();

    const { data: accreditation } = await supabase
        .from("accreditations")
        .select("organization_id, status, submitted_by")
        .eq("id", accreditationId)
        .single();

    if (!accreditation) throw new Error("Accreditation not found.");
    if (accreditation.status !== "pending") {
        throw new Error("This accreditation has already been reviewed.");
    }

    const { error } = await supabase
        .from("accreditations")
        .update({
            status: "rejected",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user.id,
            notes: rejectionNotes?.trim() || null,
        })
        .eq("id", accreditationId);

    if (error) throw new Error(error.message);

    // Update organization accreditation_status
    await supabase
        .from("organizations")
        .update({ accreditation_status: "rejected" })
        .eq("id", accreditation.organization_id);

    // Notify the submitter
    if (accreditation.submitted_by) {
        const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", accreditation.organization_id)
            .single();

        await supabase.from("notifications").insert({
            user_id: accreditation.submitted_by,
            type: "accreditation_rejected",
            title: "Accreditation Rejected",
            message: `Your accreditation application for ${org?.name || "your organization"} was not approved.${rejectionNotes ? ` Reason: ${rejectionNotes}` : ""}`,
            link: "/dashboard/accreditation",
            status: "unread",
        });
    }

    revalidatePath("/dashboard/accreditation");
    revalidatePath("/dashboard/admin");
    revalidatePath(`/dashboard/organizations/${accreditation.organization_id}`);
}
