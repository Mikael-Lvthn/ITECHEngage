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
        .update({ is_read: true })
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
        .update({ is_read: true })
        .eq("is_read", false)
        .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard", "layout");
}
