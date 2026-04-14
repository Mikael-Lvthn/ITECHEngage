"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function requireOfficerOrAdmin(orgId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    // Check if admin
    const { data: role } = await supabase.rpc("get_my_role");
    if (role === "admin") return { supabase, user };

    // Check if officer of this specific org
    const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", orgId)
        .eq("role", "officer")
        .eq("status", "approved")
        .maybeSingle();

    if (!membership) {
        throw new Error("Unauthorized: Officer or admin role required");
    }

    return { supabase, user };
}

export async function approveMember(membershipId: string, orgId: string) {
    const { supabase } = await requireOfficerOrAdmin(orgId);

    const { error } = await supabase
        .from("memberships")
        .update({ status: "approved" })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
    revalidatePath(`/dashboard/requests`);
}

export async function rejectMember(membershipId: string, orgId: string) {
    const { supabase } = await requireOfficerOrAdmin(orgId);

    const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
    revalidatePath(`/dashboard/requests`);
}

export async function setMemberRole(
    membershipId: string,
    role: "member" | "officer",
    orgId: string
) {
    const { supabase } = await requireOfficerOrAdmin(orgId);

    const { error } = await supabase
        .from("memberships")
        .update({ role })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
}
