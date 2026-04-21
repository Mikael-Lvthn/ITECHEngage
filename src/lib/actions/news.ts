"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { NewsStatus } from "@/lib/types";

async function requireOfficerOrAdmin(organizationId?: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: role } = await supabase.rpc("get_my_role");

    if (role === "admin") return { supabase, user, role: "admin" };

    if (organizationId) {
        // Check structural roles (organization_roles) instead of memberships.role
        const { data: structuralRole } = await supabase
            .from("organization_roles")
            .select("id")
            .eq("assigned_user_id", user.id)
            .eq("organization_id", organizationId)
            .limit(1)
            .maybeSingle();

        if (structuralRole) {
            return { supabase, user, role: "officer" };
        }
    }

    throw new Error("Unauthorized: Officer or Admin role required");
}

export async function createNews(formData: FormData) {
    const organization_id = formData.get("organization_id") as string;

    const { supabase, user } = await requireOfficerOrAdmin(organization_id);

    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const image_url = formData.get("image_url") as string;

    const status: NewsStatus = "pending";

    if (!organization_id || !title || !content) {
        throw new Error("Organization ID, title, and content are required.");
    }

    const { error } = await supabase.from("news").insert({
        organization_id,
        title: title.trim(),
        content: content.trim(),
        image_url: image_url || null,
        status,
        created_by: user.id
    });

    if (error) throw new Error(error.message);

    // Notify admins about new submission
    const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

    if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
            admins.map((admin) => ({
                user_id: admin.id,
                type: "content_submission",
                title: "New News Submission",
                message: `A new article "${title.trim()}" has been submitted for review.`,
                link: "/dashboard/news-and-events",
                status: "unread",
            }))
        );
    }

    revalidatePath("/dashboard/news");
    revalidatePath("/dashboard/news-and-events");
    revalidatePath(`/dashboard/organizations/${organization_id}`);
}

export async function updateNewsStatus(news_id: string, status: NewsStatus) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") {
        throw new Error("Unauthorized: Admin role required to update status");
    }

    const updateData: any = { status };
    if (status === "published") {
        updateData.published_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from("news")
        .update(updateData)
        .eq("id", news_id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/news");
    revalidatePath("/dashboard/news-and-events");
    revalidatePath("/");
}

export async function deleteNews(news_id: string) {
    const supabase = await createClient();

    const { data: newsItem, error: fetchError } = await supabase
        .from("news")
        .select("organization_id")
        .eq("id", news_id)
        .single();

    if (fetchError || !newsItem) throw new Error("News not found");

    await requireOfficerOrAdmin(newsItem.organization_id);

    const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", news_id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/news");
    revalidatePath("/dashboard/news-and-events");
}
