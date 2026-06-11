"use server";

import { createClient } from "@/lib/supabase/server";
import type { NotificationPreferences } from "@/lib/types";

export async function getNotificationPreferences(
    userId: string
): Promise<NotificationPreferences> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) throw new Error("Unauthorized");

    const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (data) return data as NotificationPreferences;

    return {
        user_id: userId,
        election_started: true,
        membership_updates: true,
        event_reminders: true,
        org_announcements: true,
        admin_announcements: true,
        updated_at: null,
    };
}

export async function updateNotificationPreferences(
    userId: string,
    prefs: Partial<Omit<NotificationPreferences, "user_id" | "updated_at">>
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("notification_preferences")
        .upsert(
            {
                user_id: userId,
                ...prefs,
                updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
        );

    if (error) throw new Error(error.message);
}
