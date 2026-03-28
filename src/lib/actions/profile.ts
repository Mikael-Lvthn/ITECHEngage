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

    const isStudent = formData.get("is_student") === "true";
    if (isStudent) {
        const school_email = formData.get("school_email") as string;
        const personal_email = formData.get("personal_email") as string;
        const contact_number = formData.get("contact_number") as string;
        const lrn = formData.get("lrn") as string;
        const student_number = formData.get("student_number") as string;
        const program = formData.get("program") as string;

        const { error: studentError } = await supabase
            .from("students")
            .update({
                school_email: school_email?.trim() || null,
                personal_email: personal_email?.trim() || null,
                contact_number: contact_number?.trim() || null,
                lrn: lrn?.trim() || null,
                student_number: student_number?.trim() || "",
                program: program?.trim() || "",
            })
            .eq("id", user.id);

        if (studentError) {
            throw new Error(studentError.message);
        }
    }

    revalidatePath("/dashboard/profile");
    revalidatePath("/");
}
