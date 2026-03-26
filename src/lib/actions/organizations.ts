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

export async function leaveOrganization(organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("user_id", user.id)
        .eq("organization_id", organizationId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/memberships");
    revalidatePath("/dashboard/news-and-events");
}
