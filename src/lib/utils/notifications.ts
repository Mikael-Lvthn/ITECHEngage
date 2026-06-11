import { createClient } from "@/lib/supabase/server";

type NotificationType =
    | "election_started"
    | "membership_updates"
    | "event_reminders"
    | "org_announcements"
    | "admin_announcements";

export async function checkNotificationPreference(
    userId: string,
    type: NotificationType
): Promise<boolean> {
    const supabase = await createClient();

    const { data } = await supabase
        .from("notification_preferences")
        .select(type)
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) return true;

    return (data as Record<string, unknown>)[type] !== false;
}

export async function checkNotificationPreferencesBatch(
    userIds: string[],
    type: NotificationType
): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const supabase = await createClient();

    const { data } = await supabase
        .from("notification_preferences")
        .select(`user_id, ${type}`)
        .in("user_id", userIds);

    const disabledUsers = new Set<string>();
    if (data) {
        for (const row of data) {
            if ((row as Record<string, unknown>)[type] === false) {
                disabledUsers.add(row.user_id);
            }
        }
    }

    return new Set(userIds.filter((id) => !disabledUsers.has(id)));
}
