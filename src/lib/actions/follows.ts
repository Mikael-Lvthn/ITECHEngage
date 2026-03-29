"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function followOrganization(organizationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("organization_follows")
        .insert({ user_id: user.id, organization_id: organizationId });

    if (error && error.code !== "23505") {
        throw new Error(error.message);
    }

    revalidatePath(`/dashboard/organizations/${organizationId}`);
}

export async function unfollowOrganization(organizationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("organization_follows")
        .delete()
        .eq("user_id", user.id)
        .eq("organization_id", organizationId);

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/organizations/${organizationId}`);
}
