"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveMember(membershipId: string, orgId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("memberships")
        .update({ status: "approved" })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
}

export async function rejectMember(membershipId: string, orgId: string) {
    const supabase = await createClient();
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
    const supabase = await createClient();
    const { error } = await supabase
        .from("memberships")
        .update({ role })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${orgId}/members`);
}
