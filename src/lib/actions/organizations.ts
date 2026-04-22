"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function joinOrganization(organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: existing } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (existing) throw new Error("Already a member or request pending");

    const { error } = await supabase.from("memberships").insert({
        user_id: user.id,
        organization_id: organizationId,
        role: "member",
        status: "pending",
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${organizationId}`);
}

export async function requestLeave(organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    // Verify user has an approved membership
    const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .eq("status", "approved")
        .maybeSingle();

    if (!membership) throw new Error("You are not an active member of this organization.");

    // Check for existing pending leave request
    const { data: existingRequest } = await supabase
        .from("leave_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", organizationId)
        .eq("status", "pending")
        .maybeSingle();

    if (existingRequest) throw new Error("You already have a pending leave request for this organization.");

    // Find the approver using hierarchy self-skip logic
    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("assigned_user_id, title, hierarchy_level")
        .eq("organization_id", organizationId)
        .order("hierarchy_level", { ascending: true });

    // Find highest-ranked officer who is NOT the requester
    let approverId: string | null = null;
    for (const role of orgRoles || []) {
        if (role.assigned_user_id && role.assigned_user_id !== user.id) {
            approverId = role.assigned_user_id;
            break;
        }
    }

    // If no officer found (e.g., President is the only officer), escalate to admin
    if (!approverId) {
        const { data: admins } = await supabase
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .limit(1);

        if (admins && admins.length > 0) {
            approverId = admins[0].id;
        }
    }

    // Create the leave request
    const { error } = await supabase.from("leave_requests").insert({
        user_id: user.id,
        organization_id: organizationId,
        status: "pending",
        designated_approver_id: approverId,
    });

    if (error) throw new Error(error.message);

    // Notify the approver
    if (approverId) {
        const { data: org } = await supabase
            .from("organizations")
            .select("name")
            .eq("id", organizationId)
            .single();

        const { data: requesterProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .single();

        await supabase.from("notifications").insert({
            user_id: approverId,
            type: "leave_request",
            title: "Leave Request",
            message: `${requesterProfile?.full_name || "A member"} has requested to leave ${org?.name || "an organization"}. Please review.`,
            link: `/dashboard/organizations/${organizationId}`,
            status: "unread",
        });
    }

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/organizations");
}

export async function approveLeaveRequest(requestId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: request } = await supabase
        .from("leave_requests")
        .select("user_id, organization_id, designated_approver_id, status")
        .eq("id", requestId)
        .single();

    if (!request) throw new Error("Leave request not found.");
    if (request.status !== "pending") throw new Error("This request has already been processed.");

    const { data: role } = await supabase.rpc("get_my_role");
    const isAdmin = role === "admin";
    if (request.designated_approver_id !== user.id && !isAdmin) {
        throw new Error("You are not authorized to approve this request.");
    }

    // Update request status
    await supabase
        .from("leave_requests")
        .update({
            status: "approved",
            actioned_by_id: user.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    // Delete the membership — DB trigger (handle_membership_delete) handles cleanup,
    // but we also do explicit app-level cleanup as a safety net.
    const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("user_id", request.user_id)
        .eq("organization_id", request.organization_id);

    if (error) throw new Error(error.message);

    // App-level cleanup: clear org role assignments for this user in this org
    await supabase
        .from("organization_roles")
        .update({ assigned_user_id: null })
        .eq("organization_id", request.organization_id)
        .eq("assigned_user_id", request.user_id);

    // App-level cleanup: revert profile role to 'student' if no remaining memberships
    const { data: remainingMemberships } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", request.user_id)
        .eq("status", "approved")
        .limit(1);

    if (!remainingMemberships || remainingMemberships.length === 0) {
        await supabase
            .from("profiles")
            .update({ role: "student" })
            .eq("id", request.user_id)
            .neq("role", "admin"); // never demote admins
    }

    // Notify the requester
    const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", request.organization_id)
        .single();

    await supabase.from("notifications").insert({
        user_id: request.user_id,
        type: "leave_approved",
        title: "Leave Approved",
        message: `Your request to leave ${org?.name || "the organization"} has been approved.`,
        link: "/dashboard/organizations",
        status: "unread",
    });

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${request.organization_id}`);
    revalidatePath("/dashboard/memberships");
    revalidatePath("/dashboard/news-and-events");
    revalidatePath("/dashboard/admin");
}

export async function rejectLeaveRequest(requestId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: request } = await supabase
        .from("leave_requests")
        .select("user_id, organization_id, designated_approver_id, status")
        .eq("id", requestId)
        .single();

    if (!request) throw new Error("Leave request not found.");
    if (request.status !== "pending") throw new Error("This request has already been processed.");

    // Check authorization
    const { data: role } = await supabase.rpc("get_my_role");
    const isAdmin = role === "admin";
    if (request.designated_approver_id !== user.id && !isAdmin) {
        throw new Error("You are not authorized to reject this request.");
    }

    await supabase
        .from("leave_requests")
        .update({
            status: "rejected",
            actioned_by_id: user.id,
            reviewed_at: new Date().toISOString(),
        })
        .eq("id", requestId);

    // Notify the requester
    const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", request.organization_id)
        .single();

    await supabase.from("notifications").insert({
        user_id: request.user_id,
        type: "leave_rejected",
        title: "Leave Request Declined",
        message: `Your request to leave ${org?.name || "the organization"} was not approved.`,
        link: `/dashboard/organizations/${request.organization_id}`,
        status: "unread",
    });

    revalidatePath(`/dashboard/organizations/${request.organization_id}`);
    revalidatePath("/dashboard/admin");
}
