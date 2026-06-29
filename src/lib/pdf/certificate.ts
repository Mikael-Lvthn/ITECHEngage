import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { createAdminClient } from "@/lib/supabase/admin";

// SERVER-SIDE ONLY. Unlike src/lib/pdf/cocurricular.ts (a "use client" jsPDF
// module), certificate generation loads an admin-uploaded template and stamps
// the member's name on top — that requires pdf-lib and the service-role client,
// so it must run inside a server action / route handler. No "use client" here.

export interface CertificateTemplateConfig {
    name_x: number;
    name_y: number;
    font_size: number;
    color: string;       // hex e.g. "#800000" — shared by name + date
    align: string;       // 'center' | 'left' — shared by name + date
    date_x: number;
    date_y: number;
    date_font_size: number;
    show_date: boolean;
}

export interface CertificateFields {
    fullName: string;
    dateText: string;
}

// hex "#800000" -> rgb(0.5, 0, 0)
export function hexToRgb(hex: string) {
    const h = hex.replace("#", "");
    return rgb(
        parseInt(h.slice(0, 2), 16) / 255,
        parseInt(h.slice(2, 4), 16) / 255,
        parseInt(h.slice(4, 6), 16) / 255,
    );
}

// Centered text starts half its width left of the anchor; left-aligned starts at it.
export function computeTextX(align: string, nameX: number, textWidth: number): number {
    return align === "center" ? nameX - textWidth / 2 : nameX;
}

// Short, uppercase, 8-char public verification code.
export function makeVerificationCode(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
}

/**
 * Stamp the member's name (and, if enabled, the membership date) onto a template
 * PDF and return the resulting bytes. Pure (no DB / storage) so it is reused by
 * both issuing and the admin preview. PDF coordinate origin is bottom-left.
 */
export async function renderCertificatePdf(
    templateBytes: Uint8Array,
    fields: CertificateFields,
    config: CertificateTemplateConfig,
): Promise<Uint8Array> {
    const pdf = await PDFDocument.load(templateBytes);
    const page = pdf.getPages()[0];
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const color = hexToRgb(config.color);

    const nameWidth = font.widthOfTextAtSize(fields.fullName, config.font_size);
    page.drawText(fields.fullName, {
        x: computeTextX(config.align, config.name_x, nameWidth),
        y: config.name_y,
        size: config.font_size,
        font,
        color,
    });

    if (config.show_date && fields.dateText) {
        const dateWidth = font.widthOfTextAtSize(fields.dateText, config.date_font_size);
        page.drawText(fields.dateText, {
            x: computeTextX(config.align, config.date_x, dateWidth),
            y: config.date_y,
            size: config.date_font_size,
            font,
            color,
        });
    }

    return pdf.save();
}

/**
 * Idempotently issue a membership certificate. Safe to call from every approval
 * path — it early-returns if a cert already exists (membership_id is UNIQUE) or
 * the org has no template configured. Never throws for the expected "skip"
 * cases; callers still wrap in try/catch so a failure can't block approval.
 */
export async function issueMembershipCertificate(membershipId: string): Promise<void> {
    const admin = createAdminClient();

    // 1. Skip if already issued (avoids a noisy unique-violation).
    const { data: existing } = await admin
        .from("certificates")
        .select("id")
        .eq("membership_id", membershipId)
        .maybeSingle();
    if (existing) return;

    // 2. Load membership -> student name + org + template config.
    const { data: m } = await admin
        .from("memberships")
        .select("user_id, organization_id, profiles(full_name), organizations(name)")
        .eq("id", membershipId)
        .single();
    if (!m) return;

    const { data: tpl } = await admin
        .from("certificate_templates")
        .select("*")
        .eq("organization_id", m.organization_id)
        .maybeSingle();
    if (!tpl) return; // org doesn't issue certs -> silently skip

    const fullName = (m.profiles as unknown as { full_name: string } | null)?.full_name ?? "Member";
    const orgName = (m.organizations as unknown as { name: string } | null)?.name ?? "your organization";

    // 3. Download template PDF.
    const { data: file } = await admin.storage.from("cert-templates").download(tpl.template_path);
    if (!file) return;
    const templateBytes = new Uint8Array(await file.arrayBuffer());

    // 4. Stamp the name + the approval/issue date (now = when they became a
    // member). Formatted to match the verify page / attendance export.
    const dateText = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const out = await renderCertificatePdf(templateBytes, { fullName, dateText }, tpl);

    // 5. Short public verification code.
    const code = makeVerificationCode();

    // 6. Upload + record.
    const certPath = `${m.organization_id}/${m.user_id}-${code}.pdf`;
    const { error: uploadError } = await admin.storage
        .from("certificates")
        .upload(certPath, out, { contentType: "application/pdf", upsert: true });
    if (uploadError) throw new Error(uploadError.message);

    const { error: insertError } = await admin.from("certificates").insert({
        membership_id: membershipId,
        user_id: m.user_id,
        organization_id: m.organization_id,
        cert_path: certPath,
        verification_code: code,
    });
    if (insertError) throw new Error(insertError.message);

    // 7. Notify the student (mirrors the notifications pattern).
    await admin.from("notifications").insert({
        user_id: m.user_id,
        type: "certificate_issued",
        title: "Certificate Ready",
        message: `Your membership certificate for ${orgName} is ready to download.`,
        link: "/dashboard/profile",
        status: "unread",
    });
}
