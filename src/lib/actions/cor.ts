"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const COR_BUCKET = "student-cors";
const ALLOWED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const EXT_BY_TYPE: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png",
};

/**
 * Returns a short-lived signed URL for a student's Certificate of Registration.
 * Access is restricted to the COR owner and admins — this is the single
 * authorization chokepoint, independent of storage RLS.
 */
export async function getCorSignedUrl(targetUserId: string): Promise<string> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (user.id !== targetUserId) {
        const { data: role } = await supabase.rpc("get_my_role");
        if (role !== "admin") {
            throw new Error("Unauthorized: only the owner or an admin can view this COR.");
        }
    }

    const { data: student, error: studentError } = await supabase
        .from("students")
        .select("cor_url")
        .eq("id", targetUserId)
        .maybeSingle();
    if (studentError) throw new Error(studentError.message);

    const path = student?.cor_url;
    if (!path) throw new Error("No Certificate of Registration on file.");

    const { data, error } = await supabase.storage
        .from(COR_BUCKET)
        .createSignedUrl(path, 3600);
    if (error) throw new Error(error.message);

    return data.signedUrl;
}

/**
 * Owner-only: upload/replace the caller's own Certificate of Registration.
 */
export async function updateStudentCor(formData: FormData): Promise<void> {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) throw new Error("A file is required.");
    if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Invalid file type. Upload a PDF, JPG, or PNG.");
    }
    if (file.size > MAX_SIZE) {
        throw new Error("File is too large. Maximum size is 5MB.");
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Must be a student (have a students row).
    const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
    if (studentError) throw new Error(studentError.message);
    if (!student) throw new Error("Only students can upload a Certificate of Registration.");

    const ext = EXT_BY_TYPE[file.type] ?? "pdf";
    const path = `${user.id}/cor_${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
        .from(COR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
    if (uploadError) throw new Error(uploadError.message);

    const { error: dbError } = await supabase
        .from("students")
        .update({ cor_url: path })
        .eq("id", user.id);
    if (dbError) throw new Error(dbError.message);

    revalidatePath("/dashboard/profile");
    revalidatePath(`/dashboard/profile/${user.id}`);
}
