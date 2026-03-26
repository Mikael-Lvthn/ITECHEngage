"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProfile(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Not authenticated");
    }

    const full_name = formData.get("full_name") as string;
    const bio = formData.get("bio") as string;
    const phone_number = formData.get("phone_number") as string;
    const website_url = formData.get("website_url") as string;
    const avatar_url = formData.get("avatar_url") as string;

    const socialLinksStr = formData.get("social_links") as string;
    let social_links = null;
    if (socialLinksStr) {
        try {
            social_links = JSON.parse(socialLinksStr);
        } catch (e) {
            console.error("Failed to parse social links");
        }
    }

    if (!full_name || full_name.trim() === "") {
        throw new Error("Full name is required");
    }

    const { error } = await supabase
        .from("profiles")
        .update({
            full_name: full_name.trim(),
            bio: bio?.trim() || null,
            phone_number: phone_number?.trim() || null,
            website_url: website_url?.trim() || null,
            avatar_url: avatar_url || null,
            social_links
        })
        .eq("id", user.id);

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/");
}
