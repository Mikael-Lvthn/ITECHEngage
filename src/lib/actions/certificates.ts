"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderCertificatePdf, issueMembershipCertificate } from "@/lib/pdf/certificate";
import { revalidatePath } from "next/cache";

/**
 * Admins manage any org's template; an officer holding a position in the org
 * (organization_roles.assigned_user_id) manages their own. Mirrors the
 * requireOfficerOrAdmin pattern used by news.ts / announcements.ts.
 */
async function requireOfficerOrAdminOfOrg(organizationId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: role } = await supabase.rpc("get_my_role");
    if (role === "admin") return { supabase, user };

    const { data: structuralRole } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("assigned_user_id", user.id)
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();
    if (structuralRole) return { supabase, user };

    throw new Error("Unauthorized: Officer or Admin role required");
}

const SAMPLE_NAME = "Juan Dela Cruz";

// Formal date format used across the app (verify page, attendance export).
function formatCertDate(d: Date): string {
    return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function readConfig(formData: FormData) {
    return {
        name_x: Number(formData.get("name_x") ?? 300),
        name_y: Number(formData.get("name_y") ?? 400),
        font_size: Number(formData.get("font_size") ?? 28),
        color: (formData.get("color") as string) || "#800000",
        align: (formData.get("align") as string) || "center",
        date_x: Number(formData.get("date_x") ?? 300),
        date_y: Number(formData.get("date_y") ?? 300),
        date_font_size: Number(formData.get("date_font_size") ?? 16),
        show_date: formData.get("show_date") !== "false",
    };
}

/**
 * Admin: upload (optional) a blank template PDF and upsert the per-org name
 * placement config. The cert-templates bucket is private, so the upload runs
 * through the service-role client here rather than from the browser.
 */
export async function upsertCertificateTemplate(formData: FormData) {
    const organizationId = formData.get("organization_id") as string;
    if (!organizationId) throw new Error("Organization ID is required");
    await requireOfficerOrAdminOfOrg(organizationId);
    const admin = createAdminClient();

    const config = readConfig(formData);
    const file = formData.get("template") as File | null;

    // Resolve the template path: a freshly uploaded file, or the existing one.
    let templatePath: string;
    if (file && file.size > 0) {
        if (file.type !== "application/pdf") throw new Error("Template must be a PDF.");
        templatePath = `${organizationId}/template.pdf`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error: uploadError } = await admin.storage
            .from("cert-templates")
            .upload(templatePath, bytes, { contentType: "application/pdf", upsert: true });
        if (uploadError) throw new Error(uploadError.message);
    } else {
        const { data: existing } = await admin
            .from("certificate_templates")
            .select("template_path")
            .eq("organization_id", organizationId)
            .maybeSingle();
        if (!existing?.template_path) throw new Error("Please upload a template PDF.");
        templatePath = existing.template_path;
    }

    const { error: upsertError } = await admin
        .from("certificate_templates")
        .upsert({
            organization_id: organizationId,
            template_path: templatePath,
            ...config,
            updated_at: new Date().toISOString(),
        });
    if (upsertError) throw new Error(upsertError.message);

    revalidatePath("/dashboard/organizations");
    revalidatePath(`/dashboard/organizations/${organizationId}`);
}

/**
 * Admin: render a preview PDF with a sample name so coordinates can be tuned
 * without guessing. Uses the just-picked file if provided, else the stored
 * template. Returns a base64 data URL (no DB writes, nothing persisted).
 */
export async function previewCertificateTemplate(formData: FormData): Promise<string> {
    const organizationId = formData.get("organization_id") as string;
    if (!organizationId) throw new Error("Organization ID is required");
    await requireOfficerOrAdminOfOrg(organizationId);
    const admin = createAdminClient();

    const config = readConfig(formData);
    const file = formData.get("template") as File | null;

    let templateBytes: Uint8Array;
    if (file && file.size > 0) {
        if (file.type !== "application/pdf") throw new Error("Template must be a PDF.");
        templateBytes = new Uint8Array(await file.arrayBuffer());
    } else {
        const { data: tpl } = await admin
            .from("certificate_templates")
            .select("template_path")
            .eq("organization_id", organizationId)
            .maybeSingle();
        if (!tpl?.template_path) throw new Error("Upload a template first to preview it.");
        const { data: stored } = await admin.storage.from("cert-templates").download(tpl.template_path);
        if (!stored) throw new Error("Stored template could not be loaded.");
        templateBytes = new Uint8Array(await stored.arrayBuffer());
    }

    const out = await renderCertificatePdf(
        templateBytes,
        { fullName: SAMPLE_NAME, dateText: formatCertDate(new Date()) },
        config,
    );
    const base64 = Buffer.from(out).toString("base64");
    return `data:application/pdf;base64,${base64}`;
}

/**
 * Officer/admin: mint a short-lived signed URL for the org's stored template
 * PDF so the in-browser drag editor can rasterize it. Private bucket -> signed
 * URL via the service-role client.
 */
export async function getTemplateForEditing(organizationId: string): Promise<string | null> {
    await requireOfficerOrAdminOfOrg(organizationId);
    const admin = createAdminClient();

    const { data: tpl } = await admin
        .from("certificate_templates")
        .select("template_path")
        .eq("organization_id", organizationId)
        .maybeSingle();
    if (!tpl?.template_path) return null; // no saved template yet

    const { data: signed, error } = await admin.storage
        .from("cert-templates")
        .createSignedUrl(tpl.template_path, 120);
    if (error || !signed) throw new Error("Could not load the template.");
    return signed.signedUrl;
}

/**
 * Officer/admin: backfill certificates for every already-approved member of the
 * org who doesn't have one yet (e.g. members approved before a template existed,
 * or before the issuing trigger covered every approval path). Idempotent —
 * issueMembershipCertificate skips anyone who already has a certificate.
 */
export async function issueCertificatesForOrg(
    organizationId: string,
): Promise<{ issued: number; total: number }> {
    await requireOfficerOrAdminOfOrg(organizationId);
    const admin = createAdminClient();

    const { data: tpl } = await admin
        .from("certificate_templates")
        .select("organization_id")
        .eq("organization_id", organizationId)
        .maybeSingle();
    if (!tpl) throw new Error("Set up a certificate template first.");

    const { data: members } = await admin
        .from("memberships")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("status", "approved");

    const total = members?.length ?? 0;
    let issued = 0;
    for (const m of members ?? []) {
        const { data: existing } = await admin
            .from("certificates")
            .select("id")
            .eq("membership_id", m.id)
            .maybeSingle();
        if (existing) continue;
        try {
            await issueMembershipCertificate(m.id);
            issued++;
        } catch (err) {
            console.error("Backfill certificate failed for membership", m.id, err);
        }
    }

    revalidatePath(`/dashboard/organizations/${organizationId}`);
    revalidatePath("/dashboard/co-curricular");
    return { issued, total };
}

/**
 * Owner/admin: mint a short-lived signed URL to download a certificate PDF.
 * The RLS-bound select enforces ownership (or admin); the signed URL itself is
 * minted with the service-role client because the bucket is private.
 */
export async function getCertificateDownloadUrl(certificateId: string): Promise<string> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // RLS lets the caller see only their own cert (or any, if admin).
    const { data: cert } = await supabase
        .from("certificates")
        .select("cert_path")
        .eq("id", certificateId)
        .maybeSingle();
    if (!cert) throw new Error("Certificate not found.");

    const admin = createAdminClient();
    const { data: signed, error } = await admin.storage
        .from("certificates")
        .createSignedUrl(cert.cert_path, 60);
    if (error || !signed) throw new Error("Could not generate download link.");
    return signed.signedUrl;
}
