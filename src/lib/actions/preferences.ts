"use server";

import { createClient } from "@/lib/supabase/server";

export async function getPreferences() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

    return data;
}

export async function updatePreferences(prefs: {
    font_family?: string;
    font_size?: string;
    brightness?: number;
    dark_mode?: boolean;
}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("user_preferences")
        .upsert({
            user_id: user.id,
            ...prefs,
            updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

    if (error) throw new Error(error.message);
}
