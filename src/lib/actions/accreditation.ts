"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateEngagementRecord } from "@/lib/actions/engagement-internal";
import { checkNotificationPreference } from "@/lib/utils/notifications";

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
    const cycleType = formData.get("cycle_type") as string;
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

    const { data: accreditation, error } = await supabase.from("accreditations").insert({
        organization_id: organizationId,
        academic_year: academicYear.trim(),
        cycle_type: cycleType || "initial",
        status: "pending",
        notes: notes?.trim() || null,
        submitted_by: user.id,
    }).select().single();

    if (error || !accreditation) throw new Error(error?.message || "Failed to create accreditation row");

    // Upload files
    for (const [key, value] of formData.entries()) {
        if (key.startsWith("file_") && value instanceof File) {
            const requirementId = key.split("_")[1];
            const file = value;
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${accreditation.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("accreditation-documents")
                .upload(filePath, file);

            if (uploadError) throw new Error(`Upload failed for ${file.name}: ${uploadError.message}`);

            const { error: dbError } = await supabase
                .from("accreditation_documents")
                .insert({
                    accreditation_id: accreditation.id,
                    requirement_id: requirementId,
                    storage_path: filePath,
                    file_name: file.name,
                    file_size: file.size,
                    uploaded_by: user.id
                });

            if (dbError) throw new Error(`Failed to record ${file.name}: ${dbError.message}`);
        }
    }

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

export async function updateAccreditationStatus(
    accreditationId: string,
    status: 'pending' | 'forwarded' | 'deliberating' | 'decision_received' | 'approved' | 'rejected' | 'revalidation_required',
    notes?: string,
    expiresAt?: string
) {
    const { supabase, user } = await requireAdmin();

    const { data: accreditation } = await supabase
        .from("accreditations")
        .select("organization_id, status, submitted_by")
        .eq("id", accreditationId)
        .single();

    if (!accreditation) throw new Error("Accreditation not found.");
    
    const isFinalDecision = status === "approved" || status === "rejected" || status === "revalidation_required";

    // Update accreditation status
    const updateData: Record<string, string | null> = {
        status: status,
        notes: notes?.trim() || null,
    };

    if (isFinalDecision) {
        updateData.reviewed_at = new Date().toISOString();
        updateData.reviewed_by = user.id;
    }

    const { error } = await supabase
        .from("accreditations")
        .update(updateData)
        .eq("id", accreditationId);

    if (error) throw new Error(error.message);

    if (isFinalDecision) {
        // Update organization accreditation_status and expiry
        const orgUpdate: Record<string, unknown> = {
            accreditation_status: status === "approved" ? "approved" : (status === "rejected" ? "rejected" : "pending")
        };
        
        if (expiresAt && status === "approved") {
            orgUpdate.accreditation_expires_at = expiresAt;
        }

        await supabase
            .from("organizations")
            .update(orgUpdate)
            .eq("id", accreditation.organization_id);

        // Notify all officers of the organization
        const { data: officers } = await supabase
            .from("memberships")
            .select("user_id")
            .eq("organization_id", accreditation.organization_id)
            .eq("role", "officer")
            .eq("status", "approved");

        const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", accreditation.organization_id)
            .single();

        const officerIds = officers?.map(o => o.user_id) || [];
        // Also include submitter if not already in list
        if (accreditation.submitted_by && !officerIds.includes(accreditation.submitted_by)) {
            officerIds.push(accreditation.submitted_by);
        }

        if (officerIds.length > 0) {
            const notificationsToInsert = [];
            for (const officerId of officerIds) {
                const shouldNotify = await checkNotificationPreference(officerId, "admin_announcements");
                if (shouldNotify) {
                    notificationsToInsert.push({
                        user_id: officerId,
                        type: "accreditation_decision",
                        title: "Accreditation Decision Received",
                        message: `The commission has reached a decision on ${org?.name || "your organization"}'s accreditation application. Status: ${status}.`,
                        link: "/dashboard/accreditation",
                        status: "unread",
                    });
                }
            }

            if (notificationsToInsert.length > 0) {
                await supabase.from("notifications").insert(notificationsToInsert);
            }

            try {
                await generateEngagementRecord({
                    userId: accreditation.submitted_by || officerIds[0],
                    organizationId: accreditation.organization_id,
                    recordType: "accreditation",
                    title: `Accreditation ${status}: ${org?.name || "Organization"}`,
                    organizationName: org?.name || null,
                });
            } catch (err) {
                console.error("Failed to generate accreditation engagement record:", err);
            }
        }
    }

    revalidatePath("/dashboard/accreditation");
    revalidatePath(`/dashboard/organizations/${accreditation.organization_id}`);
    revalidatePath("/dashboard/admin");
}

export async function uploadAccreditationDocument(formData: FormData) {
    const file = formData.get("file") as File;
    const accreditationId = formData.get("accreditationId") as string;
    const requirementId = formData.get("requirementId") as string;

    if (!file || !accreditationId || !requirementId) {
        throw new Error("File, accreditationId, and requirementId are required.");
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${accreditationId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("accreditation-documents")
        .upload(filePath, file);

    if (uploadError) throw new Error(uploadError.message);

    // Insert into accreditation_documents
    const { error: dbError } = await supabase
        .from("accreditation_documents")
        .insert({
            accreditation_id: accreditationId,
            requirement_id: requirementId,
            storage_path: filePath,
            file_name: file.name,
            file_size: file.size,
            uploaded_by: user.id
        });

    if (dbError) throw new Error(dbError.message);

    revalidatePath("/dashboard/accreditation");
}

export async function getAccreditationFileUrl(path: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase.storage
        .from("accreditation-documents")
        .createSignedUrl(path, 3600);

    if (error) throw new Error(error.message);
    return data.signedUrl;
}

export async function deleteAccreditationFile(path: string, documentId: string) {
    const { supabase } = await requireAdmin();

    const { error: storageError } = await supabase.storage
        .from("accreditation-documents")
        .remove([path]);

    if (storageError) throw new Error(storageError.message);

    const { error: dbError } = await supabase
        .from("accreditation_documents")
        .delete()
        .eq("id", documentId);

    if (dbError) throw new Error(dbError.message);

    revalidatePath("/dashboard/accreditation");
}

/**
 * Admin-only: permanently remove an accreditation history entry.
 * Deletes the accreditation row; DB cascade removes accreditation_documents rows.
 * Officers' history view also clears because it reads the same table.
 */
export async function deleteAccreditationHistory(accreditationId: string) {
    const { supabase } = await requireAdmin();

    // Verify the entry is in a terminal state (safety check)
    const { data: acc } = await supabase
        .from("accreditations")
        .select("id, status")
        .eq("id", accreditationId)
        .single();

    if (!acc) throw new Error("Accreditation record not found.");
    if (!["approved", "rejected", "revalidation_required"].includes(acc.status)) {
        throw new Error("Only completed accreditation records can be deleted.");
    }

    const { error } = await supabase
        .from("accreditations")
        .delete()
        .eq("id", accreditationId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/accreditation");
    revalidatePath("/dashboard/admin");
}
