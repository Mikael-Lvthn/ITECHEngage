"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sendSchoolEmail } from "@/lib/actions/send-school-email";
import { recordMembershipEngagement } from "@/lib/actions/engagement-internal";

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
    const category_id = formData.get("category_id") as string;

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
        core_values: core_values.trim(),
        category_id: category_id || null
    }).select().single();

    if (orgError) throw new Error(orgError.message);

    // Program restrictions: no rows = open to all. If any are selected and the
    // insert fails, roll back the org (mirrors the initial-student rollback).
    const allowedPrograms = formData.getAll("allowed_programs") as string[];
    if (allowedPrograms.length > 0) {
        const { error: progError } = await supabase
            .from("organization_allowed_programs")
            .insert(allowedPrograms.map((program) => ({ organization_id: orgData.id, program })));
        if (progError) {
            await supabase.from("organizations").delete().eq("id", orgData.id);
            throw new Error("Failed to set program restrictions. Organization creation rolled back.");
        }
    }

    // Only create membership + President role if an initial student was selected
    if (initial_student_id) {
        const { data: newMembership, error: membershipError } = await supabase.from("memberships").insert({
            user_id: initial_student_id,
            organization_id: orgData.id,
            role: "officer",
            status: "approved"
        }).select("id").single();

        if (membershipError) {
            await supabase.from("organizations").delete().eq("id", orgData.id);
            throw new Error("Failed to assign initial student. Organization creation rolled back.");
        }

        // Record the membership on the initial student's resume.
        try {
            await recordMembershipEngagement(newMembership.id);
        } catch (err) {
            console.error("Failed to record membership engagement:", err);
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
    const category_id = formData.get("category_id");

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
        category_id?: string | null;
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
    if (category_id !== null) {
        updateData.category_id = (category_id as string).trim() || null;
    }

    const { error } = await supabase
        .from("organizations")
        .update(updateData)
        .eq("id", id);

    if (error) throw new Error(error.message);

    // Program restrictions: delete-all-then-reinsert for this org. No rows = open to all.
    const allowedPrograms = formData.getAll("allowed_programs") as string[];
    const { error: delError } = await supabase
        .from("organization_allowed_programs")
        .delete()
        .eq("organization_id", id);
    if (delError) throw new Error(delError.message);
    if (allowedPrograms.length > 0) {
        const { error: progError } = await supabase
            .from("organization_allowed_programs")
            .insert(allowedPrograms.map((program) => ({ organization_id: id, program })));
        if (progError) throw new Error(progError.message);
    }

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

export async function verifyUserAccount(userId: string, promoteToAdmin: boolean = false) {
    const { supabase } = await requireAdmin();

    // Fetch user details first to get their role and school email if they are a student
    const { data: userProfile } = await supabase
        .from("profiles")
        .select("email, full_name, role, students(school_email)")
        .eq("id", userId)
        .single();

    const updateData: { account_status: string; role?: string } = {
        account_status: "verified"
    };

    if (promoteToAdmin) {
        updateData.role = "admin";
    }

    const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", userId);

    if (error) throw new Error(error.message);

    await supabase.from("notifications").insert({
        user_id: userId,
        type: "account_verified",
        title: "Account Verified",
        message: "Your account has been verified by an administrator. You now have full access to the platform.",
        status: "unread",
    });

    // Send welcome email to the newly verified user
    if (userProfile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const student = userProfile.students as any;
        const emailToSend = student?.school_email || userProfile.email;
        const roleToSend = promoteToAdmin ? "admin" : userProfile.role;
        if (emailToSend) {
            sendSchoolEmail(emailToSend, userProfile.full_name, roleToSend).catch((err) => {
                console.error("Failed to send welcome email for verified user:", userId, err);
            });
        }
    }

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard");
}

export async function rejectUserAccount(userId: string) {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
        .from("profiles")
        .update({ account_status: "rejected" })
        .eq("id", userId);

    if (error) throw new Error(error.message);

    await supabase.from("notifications").insert({
        user_id: userId,
        type: "account_rejected",
        title: "Account Not Approved",
        message: "Your account registration was not approved. Please contact administration for more information.",
        status: "unread",
    });

    revalidatePath("/dashboard/admin");
}

export async function createBulletinPost(formData: FormData) {
    const { supabase, user } = await requireAdmin();

    const type = formData.get("bulletin_type") as string;
    const title = formData.get("bulletin_title") as string;
    const body = formData.get("bulletin_body") as string;
    const expires_at = formData.get("bulletin_expires_at") as string;
    const pinned = formData.get("bulletin_pinned") === "on";

    if (!type || !title?.trim()) {
        throw new Error("Type and title are required.");
    }

    const { error } = await supabase.from("bulletin_board_posts").insert({
        type,
        title: title.trim(),
        body: body?.trim() || null,
        expires_at: expires_at || null,
        pinned,
        created_by: user.id,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/bulletin");
    revalidatePath("/");
}

export async function deleteBulletinPost(postId: string) {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
        .from("bulletin_board_posts")
        .delete()
        .eq("id", postId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
    revalidatePath("/dashboard/bulletin");
    revalidatePath("/");
}

// ─── User Management Actions (Task 17e) ────────────────────────────────────

import { createAdminClient } from "@/lib/supabase/admin";

export async function deleteUser(userId: string) {
    await requireAdmin();
    const adminClient = createAdminClient();

    // Nullify storage ownership so deletion isn't blocked
    await adminClient
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", userId);

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
}

export async function bulkDeleteUsers(userIds: string[]) {
    await requireAdmin();
    if (!userIds.length) return;

    const adminClient = createAdminClient();

    const errors: string[] = [];
    for (const id of userIds) {
        const { error } = await adminClient.auth.admin.deleteUser(id);
        if (error) errors.push(`${id}: ${error.message}`);
    }

    if (errors.length) throw new Error(`Some deletions failed:\n${errors.join("\n")}`);

    revalidatePath("/dashboard/admin");
}

export async function bulkVerifyUsers(userIds: string[], promoteToAdmin: boolean = false) {
    const { supabase } = await requireAdmin();
    if (!userIds.length) return;

    // Fetch user details first to get their role and school email if they are a student
    const { data: userProfiles } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, students(school_email)")
        .in("id", userIds);

    const updateData: { account_status: string; role?: string } = {
        account_status: "verified"
    };

    if (promoteToAdmin) {
        updateData.role = "admin";
    }

    const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .in("id", userIds);

    if (error) throw new Error(error.message);

    // Send notifications and welcome emails
    if (userProfiles && userProfiles.length > 0) {
        const notifications = userProfiles.map((userProfile) => ({
            user_id: userProfile.id,
            type: "account_verified",
            title: "Account Verified",
            message: "Your account has been verified by an administrator. You now have full access to the platform.",
            status: "unread",
        }));

        await supabase.from("notifications").insert(notifications);

        for (const userProfile of userProfiles) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const student = userProfile.students as any;
            const emailToSend = student?.school_email || userProfile.email;
            const roleToSend = promoteToAdmin ? "admin" : userProfile.role;
            if (emailToSend) {
                sendSchoolEmail(emailToSend, userProfile.full_name, roleToSend).catch((err) => {
                    console.error("Failed to send welcome email for verified user in bulk:", userProfile.id, err);
                });
            }
        }
    }

    revalidatePath("/dashboard/admin");
}

export async function bulkPromoteUsers(userIds: string[], targetRole: "student" | "officer" | "admin") {
    const { supabase } = await requireAdmin();
    if (!userIds.length) return;

    const { error } = await supabase
        .from("profiles")
        .update({ role: targetRole })
        .in("id", userIds);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/admin");
}

export async function updateUserRole(userId: string, role: "student" | "officer" | "admin") {
    const { supabase } = await requireAdmin();

    const { error } = await supabase
        .from("profiles")
        .update({ role })
        .eq("id", userId);

    if (error) throw new Error(error.message);
    revalidatePath("/dashboard/admin");
}

export async function fetchAllUsers(offset: number = 0, limit: number = 200) {
    const { supabase } = await requireAdmin();

    const { data, error, count } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, account_status, created_at, students(student_number, course, section, year_level)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw new Error(error.message);
    return { users: data || [], total: count ?? 0 };
}

