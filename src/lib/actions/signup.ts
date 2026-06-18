"use server";

import { createClient } from "@supabase/supabase-js";

export async function customSignUpAndSendEmail(
    email: string,
    password: string,
    origin: string,
    metaData: Record<string, unknown>
) {
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing Supabase environment variables!");
            return { success: false, error: "Server misconfiguration. Please contact support." };
        }

        // Create a server-only Supabase client with the Service Role key
        // This allows us to bypass regular client limitations.
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        // 1. Create the user using the admin API
        // We set email_confirm: true so Supabase knows they are active,
        // but our database trigger still sets them to 'pending_verification' for the Admin to approve.
        const { error: userError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metaData
        });

        if (userError) {
            console.error("[Custom Auth] Error creating user:", userError);
            return { success: false, error: userError.message };
        }

        // We successfully created the user. No email is sent.
        return { success: true };

    } catch (err: unknown) {
        console.error("[Custom Auth] Exception:", err);
        return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred." };
    }
}
