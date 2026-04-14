"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function markAsRead(notificationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("notifications")
        .update({ status: "read" })
        .eq("id", notificationId)
        .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard", "layout");
}

export async function markAllAsRead() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("notifications")
        .update({ status: "read" })
        .eq("status", "unread")
        .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard", "layout");
}

export async function archiveNotification(notificationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("notifications")
        .update({ status: "archived" })
        .eq("id", notificationId)
        .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard", "layout");
}

export async function archiveAllRead() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("notifications")
        .update({ status: "archived" })
        .eq("status", "read")
        .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard", "layout");
}

export async function deleteNotification(notificationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId)
        .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard", "layout");
}

export async function getNotificationsByStatus(status?: "unread" | "read" | "archived") {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (status) {
        query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return data || [];
}
