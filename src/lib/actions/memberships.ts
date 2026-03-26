"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function approveMembership(membershipId: string) {
    const supabase = await createClient();

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") throw new Error("Unauthorized: Admin role required");

    const { data: membership } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("id", membershipId)
        .single();

    if (!membership) throw new Error("Membership not found");

    const { error } = await supabase
        .from("memberships")
        .update({ status: "approved" })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);

    await supabase
        .from("profiles")
        .update({ role: "officer" })
        .eq("id", membership.user_id)
        .eq("role", "student");

    revalidatePath("/dashboard", "layout");
}

export async function rejectMembership(membershipId: string) {
    const supabase = await createClient();

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") throw new Error("Unauthorized: Admin role required");

    const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", membershipId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard", "layout");
}
