"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type LegalSlug = "terms" | "privacy";

export interface SiteContent {
    slug: string;
    title: string;
    content: string;
    updated_at: string;
}

export async function getSiteContent(slug: LegalSlug): Promise<SiteContent | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("site_content")
        .select("slug, title, content, updated_at")
        .eq("slug", slug)
        .maybeSingle();
    return (data as SiteContent) ?? null;
}

export async function updateSiteContent(slug: LegalSlug, title: string, content: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (profile?.role !== "admin") throw new Error("Unauthorized");

    const { error } = await supabase
        .from("site_content")
        .update({
            title: title.trim(),
            content,
            updated_at: new Date().toISOString(),
            updated_by: user.id,
        })
        .eq("slug", slug);
    if (error) throw new Error(error.message);

    revalidatePath(slug === "terms" ? "/terms" : "/privacy");
    revalidatePath("/dashboard/admin/legal");
}
