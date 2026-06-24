"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type FeedbackCategory = "feedback" | "suggestion" | "bug" | "other";
export type FeedbackStatus = "new" | "reviewed";

export interface FeedbackItem {
    id: string;
    user_id: string | null;
    name: string | null;
    email: string | null;
    category: FeedbackCategory;
    message: string;
    status: FeedbackStatus;
    created_at: string;
}

const CATEGORIES: FeedbackCategory[] = ["feedback", "suggestion", "bug", "other"];

/** Public: anyone (logged-in or not) can submit feedback. */
export async function submitFeedback(formData: FormData) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const rawCategory = (formData.get("category") as string) || "feedback";
    const category: FeedbackCategory = CATEGORIES.includes(rawCategory as FeedbackCategory)
        ? (rawCategory as FeedbackCategory)
        : "feedback";
    const message = ((formData.get("message") as string) || "").trim();
    let name = ((formData.get("name") as string) || "").trim() || null;
    let email = ((formData.get("email") as string) || "").trim() || null;

    if (!message) throw new Error("Please enter your feedback message.");
    if (message.length > 5000) throw new Error("Message is too long (max 5000 characters).");

    // Attach identity for logged-in users.
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", user.id)
            .maybeSingle();
        name = profile?.full_name || name;
        email = profile?.email || email || user.email || null;
    }

    const { error } = await supabase.from("feedback").insert({
        user_id: user?.id ?? null,
        name,
        email,
        category,
        message,
    });
    if (error) throw new Error(error.message);
}

/** Admin only (enforced by RLS + the calling page's guard). */
export async function getFeedback(): Promise<FeedbackItem[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("feedback")
        .select("id, user_id, name, email, category, message, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
    return (data as FeedbackItem[]) || [];
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (profile?.role !== "admin") throw new Error("Unauthorized");

    const { error } = await supabase.from("feedback").update({ status }).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin/feedback");
}
