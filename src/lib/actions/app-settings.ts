"use server";

// TEMPORARY auto-approve feature — owner-controlled global toggles.
// Remove this module (and the related branches in signup.ts, organizations.ts,
// and admin/page.tsx) along with the app_settings table when no longer needed.

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { OWNER_UID, type AppSettings } from "@/lib/app-config";

const DEFAULTS: AppSettings = {
    auto_verify_students: false,
    auto_approve_memberships: false,
};

export async function getAppSettings(): Promise<AppSettings> {
    try {
        const supabase = await createClient();
        const { data } = await supabase
            .from("app_settings")
            .select("auto_verify_students, auto_approve_memberships")
            .eq("id", "global")
            .maybeSingle();
        if (!data) return DEFAULTS;
        return {
            auto_verify_students: !!data.auto_verify_students,
            auto_approve_memberships: !!data.auto_approve_memberships,
        };
    } catch {
        return DEFAULTS;
    }
}

export async function setAppSetting(
    key: "auto_verify_students" | "auto_approve_memberships",
    value: boolean
) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    if (user.id !== OWNER_UID) throw new Error("Unauthorized");

    const { error } = await supabase
        .from("app_settings")
        .update({ [key]: value, updated_at: new Date().toISOString() })
        .eq("id", "global");

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/admin");
}
