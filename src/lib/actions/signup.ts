"use server";

import { createClient } from "@supabase/supabase-js";
import { sendSchoolEmail } from "@/lib/actions/send-school-email";

const COR_BUCKET = "student-cors";
const COR_EXT_BY_TYPE: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
};

export async function customSignUpAndSendEmail(
    email: string,
    password: string,
    origin: string,
    metaData: Record<string, unknown>,
    corFile?: File
) {
    try {
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("Missing Supabase environment variables!");
            console.error("NEXT_PUBLIC_SUPABASE_URL is:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "set" : "missing");
            console.error("SUPABASE_SERVICE_ROLE_KEY is:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "missing");
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
        const { data: created, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metaData
        });

        if (userError) {
            console.error("[Custom Auth] Error creating user:", userError);
            return { success: false, error: userError.message };
        }

        // Upload the Certificate of Registration (required for students).
        // The handle_new_user trigger has already created the students row with
        // cor_url=''; here we store the actual file and update the path.
        if (created?.user?.id && metaData.registration_type === "student") {
            if (!corFile || corFile.size === 0) {
                // Roll back the half-created account so a student never exists
                // without a COR on file.
                await supabaseAdmin.auth.admin.deleteUser(created.user.id);
                return { success: false, error: "A Certificate of Registration is required." };
            }

            const ext = COR_EXT_BY_TYPE[corFile.type] ?? "pdf";
            const corPath = `${created.user.id}/cor_${Date.now()}.${ext}`;

            const { error: uploadError } = await supabaseAdmin.storage
                .from(COR_BUCKET)
                .upload(corPath, corFile, { upsert: true, contentType: corFile.type });

            if (uploadError) {
                await supabaseAdmin.auth.admin.deleteUser(created.user.id);
                console.error("[Custom Auth] COR upload failed:", uploadError);
                return { success: false, error: "Failed to upload your Certificate of Registration. Please try again." };
            }

            const { error: corUpdateError } = await supabaseAdmin
                .from("students")
                .update({ cor_url: corPath })
                .eq("id", created.user.id);

            if (corUpdateError) {
                await supabaseAdmin.storage.from(COR_BUCKET).remove([corPath]);
                await supabaseAdmin.auth.admin.deleteUser(created.user.id);
                console.error("[Custom Auth] COR record update failed:", corUpdateError);
                return { success: false, error: "Failed to save your Certificate of Registration. Please try again." };
            }
        }

        // TEMPORARY auto-approve feature: auto-verify new student registrations
        // while the owner has the toggle enabled. Mirrors verifyUserAccount:
        // flips to verified, notifies the user, and sends the welcome email.
        if (created?.user?.id && metaData.registration_type === "student") {
            const { data: settings } = await supabaseAdmin
                .from("app_settings")
                .select("auto_verify_students")
                .eq("id", "global")
                .maybeSingle();
            if (settings?.auto_verify_students) {
                await supabaseAdmin
                    .from("profiles")
                    .update({ account_status: "verified" })
                    .eq("id", created.user.id);

                await supabaseAdmin.from("notifications").insert({
                    user_id: created.user.id,
                    type: "account_verified",
                    title: "Account Verified",
                    message: "Your account has been verified. You now have full access to the platform.",
                    status: "unread",
                });

                const fullName = (metaData.full_name as string) || "";
                const emailToSend = (metaData.school_email as string) || email;
                if (emailToSend) {
                    sendSchoolEmail(emailToSend, fullName, "student").catch((err) => {
                        console.error("Failed to send welcome email for auto-verified user:", created.user!.id, err);
                    });
                }
            }
        }

        // We successfully created the user. No email is sent.
        return { success: true };

    } catch (err: unknown) {
        console.error("[Custom Auth] Exception:", err);
        return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred." };
    }
}
