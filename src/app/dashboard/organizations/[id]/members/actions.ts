"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return { supabase, user };
}

async function canManageMembership(supabase: any, userId: string, orgId: string) {
    // Admin can manage any organization
    const { data: userRole } = await supabase.rpc("get_my_role");
    if (userRole === "admin") return true;

    // Check if user is an officer of the organization
    const { data: officer } = await supabase
        .from("memberships")
        .select("id")
        .eq("organization_id", orgId)
        .eq("user_id", userId)
        .eq("role", "officer")
        .eq("status", "approved")
        .limit(1);

    return !!(officer && officer.length > 0);
}

export async function approveMember(membershipId: string, orgId: string) {
    const { supabase, user } = await getAuthUser();

    const authorized = await canManageMembership(supabase, user.id, orgId);
    if (!authorized) {
        throw new Error("Unauthorized: Only officers and admins can approve members");
    }

    const { error } = await supabase
        .from("memberships")
        .update({ status: "approved" })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
}

export async function rejectMember(membershipId: string, orgId: string) {
    const { supabase, user } = await getAuthUser();

    const authorized = await canManageMembership(supabase, user.id, orgId);
    if (!authorized) {
        throw new Error("Unauthorized: Only officers and admins can reject members");
    }

    const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
}

export async function setMemberRole(
    membershipId: string,
    role: "member" | "officer",
    orgId: string
) {
    const { supabase, user } = await getAuthUser();

    const authorized = await canManageMembership(supabase, user.id, orgId);
    if (!authorized) {
        throw new Error("Unauthorized: Only officers and admins can change member roles");
    }

    const { error } = await supabase
        .from("memberships")
        .update({ role })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
}
