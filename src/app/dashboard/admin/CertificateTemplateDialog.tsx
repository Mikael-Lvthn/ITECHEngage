"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import {
    upsertCertificateTemplate,
    previewCertificateTemplate,
    issueCertificatesForOrg,
} from "@/lib/actions/certificates";
import CertificatePlacementEditor from "@/components/certificates/CertificatePlacementEditor";

interface CertificateTemplateDialogProps {
    organizationId: string;
    organizationName: string;
}

interface Config {
    name_x: number;
    name_y: number;
    font_size: number;
    color: string;
    align: string;
    date_x: number;
    date_y: number;
    date_font_size: number;
    show_date: boolean;
}

const DEFAULT_CONFIG: Config = {
    name_x: 300,
    name_y: 400,
    font_size: 28,
    color: "#800000",
    align: "center",
    date_x: 300,
    date_y: 300,
    date_font_size: 16,
    show_date: true,
};

export default function CertificateTemplateDialog({
    organizationId,
    organizationName,
}: CertificateTemplateDialogProps) {
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [error, setError] = useState("");
    const [hasTemplate, setHasTemplate] = useState(false);
    const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>("");
    const [backfilling, setBackfilling] = useState(false);
    const [backfillMsg, setBackfillMsg] = useState("");

    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!open) return;
        setError("");
        setPreviewUrl("");
        setSelectedFile(null);
        // Officer/admin RLS permits reading the org's template config.
        (async () => {
            const { data } = await supabase
                .from("certificate_templates")
                .select("template_path, name_x, name_y, font_size, color, align, date_x, date_y, date_font_size, show_date")
                .eq("organization_id", organizationId)
                .maybeSingle();
            if (data) {
                setHasTemplate(!!data.template_path);
                setConfig({
                    name_x: data.name_x,
                    name_y: data.name_y,
                    font_size: data.font_size,
                    color: data.color,
                    align: data.align,
                    date_x: data.date_x,
                    date_y: data.date_y,
                    date_font_size: data.date_font_size,
                    show_date: data.show_date,
                });
            } else {
                setHasTemplate(false);
                setConfig(DEFAULT_CONFIG);
            }
        })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, organizationId]);

    function buildFormData(): FormData {
        const fd = new FormData();
        fd.set("organization_id", organizationId);
        fd.set("name_x", String(config.name_x));
        fd.set("name_y", String(config.name_y));
        fd.set("font_size", String(config.font_size));
        fd.set("color", config.color);
        fd.set("align", config.align);
        fd.set("date_x", String(config.date_x));
        fd.set("date_y", String(config.date_y));
        fd.set("date_font_size", String(config.date_font_size));
        fd.set("show_date", config.show_date ? "true" : "false");
        if (selectedFile) fd.set("template", selectedFile);
        return fd;
    }

    async function handlePreview() {
        setPreviewing(true);
        setError("");
        try {
            const url = await previewCertificateTemplate(buildFormData());
            setPreviewUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate preview");
        } finally {
            setPreviewing(false);
        }
    }

    async function handleSave() {
        setLoading(true);
        setError("");
        try {
            await upsertCertificateTemplate(buildFormData());
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to save template");
        } finally {
            setLoading(false);
        }
    }

    async function handleBackfill() {
        setBackfilling(true);
        setBackfillMsg("");
        setError("");
        try {
            const { issued, total } = await issueCertificatesForOrg(organizationId);
            setBackfillMsg(
                issued === 0
                    ? `All ${total} current member${total === 1 ? "" : "s"} already have a certificate.`
                    : `Issued ${issued} new certificate${issued === 1 ? "" : "s"} (of ${total} members).`,
            );
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to issue certificates");
        } finally {
            setBackfilling(false);
        }
    }

    const num = (v: string, fallback: number) => (v === "" ? fallback : Number(v));
    const patchConfig = (patch: Partial<Config>) => setConfig((c) => ({ ...c, ...patch }));

    const inputClass =
        "w-full px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-foreground text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors";

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors flex items-center gap-1.5 cursor-pointer"
            >
                📜 Certificate
            </button>

            {open && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <div className="relative bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227] rounded-t-2xl" />
                        <div className="p-6 sm:p-8">
                            <h2 className="text-2xl font-bold mb-1 text-foreground">Certificate Template</h2>
                            <p className="text-sm text-muted-foreground mb-6 pb-4 border-b border-border">
                                Configure the membership certificate for <span className="font-semibold text-foreground">{organizationName}</span>.
                                When a membership is approved, the member&apos;s name and the membership date are stamped onto this template.
                            </p>

                            <div className="space-y-6">
                                <div>
                                    <label htmlFor="cert-template-file" className="block text-sm font-semibold text-foreground mb-2">
                                        Template PDF {hasTemplate && <span className="text-xs font-normal text-muted-foreground">(a template is already saved — upload to replace)</span>}
                                    </label>
                                    <input
                                        id="cert-template-file"
                                        type="file"
                                        accept="application/pdf"
                                        onChange={(e) => {
                                            setSelectedFile(e.target.files?.[0] ?? null);
                                            setPreviewUrl("");
                                        }}
                                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-primary dark:file:text-gold hover:file:bg-gold/20 transition-all cursor-pointer"
                                    />
                                </div>

                                {/* Drag editor */}
                                <CertificatePlacementEditor
                                    organizationId={organizationId}
                                    file={selectedFile}
                                    config={config}
                                    onChange={patchConfig}
                                />

                                {/* Name placement */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div>
                                        <label htmlFor="cert-name-x" className="block text-sm font-semibold text-foreground mb-2">Name X</label>
                                        <input id="cert-name-x" type="number" value={config.name_x} onChange={(e) => patchConfig({ name_x: num(e.target.value, 0) })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="cert-name-y" className="block text-sm font-semibold text-foreground mb-2">Name Y</label>
                                        <input id="cert-name-y" type="number" value={config.name_y} onChange={(e) => patchConfig({ name_y: num(e.target.value, 0) })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="cert-font-size" className="block text-sm font-semibold text-foreground mb-2">Name size</label>
                                        <input id="cert-font-size" type="number" value={config.font_size} onChange={(e) => patchConfig({ font_size: num(e.target.value, 1) })} className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="cert-align" className="block text-sm font-semibold text-foreground mb-2">Align</label>
                                        <select id="cert-align" value={config.align} onChange={(e) => patchConfig({ align: e.target.value })} className={`${inputClass} cursor-pointer`}>
                                            <option value="center">Center</option>
                                            <option value="left">Left</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Date placement */}
                                <div>
                                    <label htmlFor="cert-show-date" className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3 cursor-pointer w-fit">
                                        <input
                                            id="cert-show-date"
                                            type="checkbox"
                                            checked={config.show_date}
                                            onChange={(e) => patchConfig({ show_date: e.target.checked })}
                                            className="h-4 w-4 accent-[#800000] cursor-pointer"
                                        />
                                        Stamp the membership date
                                    </label>
                                    {config.show_date && (
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label htmlFor="cert-date-x" className="block text-sm font-semibold text-foreground mb-2">Date X</label>
                                                <input id="cert-date-x" type="number" value={config.date_x} onChange={(e) => patchConfig({ date_x: num(e.target.value, 0) })} className={inputClass} />
                                            </div>
                                            <div>
                                                <label htmlFor="cert-date-y" className="block text-sm font-semibold text-foreground mb-2">Date Y</label>
                                                <input id="cert-date-y" type="number" value={config.date_y} onChange={(e) => patchConfig({ date_y: num(e.target.value, 0) })} className={inputClass} />
                                            </div>
                                            <div>
                                                <label htmlFor="cert-date-size" className="block text-sm font-semibold text-foreground mb-2">Date size</label>
                                                <input id="cert-date-size" type="number" value={config.date_font_size} onChange={(e) => patchConfig({ date_font_size: num(e.target.value, 1) })} className={inputClass} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-end gap-4">
                                    <div>
                                        <label htmlFor="cert-color" className="block text-sm font-semibold text-foreground mb-2">Text color</label>
                                        <input id="cert-color" type="color" value={config.color} onChange={(e) => patchConfig({ color: e.target.value })} className="h-11 w-20 rounded-xl border border-border bg-muted/50 cursor-pointer" />
                                    </div>
                                    <p className="text-xs text-muted-foreground pb-3">
                                        Coordinates use PDF points with the origin at the <span className="font-semibold">bottom-left</span> of the page.
                                        Drag the labels above, or fine-tune with the numbers; both the name and date share this color and alignment.
                                    </p>
                                </div>

                                {previewUrl && (
                                    <div className="rounded-xl border border-border overflow-hidden">
                                        <iframe title="Certificate preview" src={previewUrl} className="w-full h-96 bg-white" />
                                    </div>
                                )}

                                {hasTemplate && (
                                    <div className="rounded-xl border border-border bg-muted/30 p-4 flex items-center justify-between gap-3 flex-wrap">
                                        <div>
                                            <p className="text-sm font-semibold text-foreground">Issue for current members</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                Generate certificates for already-approved members who don&apos;t have one yet.
                                            </p>
                                            {backfillMsg && <p className="text-xs text-primary dark:text-gold mt-1">{backfillMsg}</p>}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleBackfill}
                                            disabled={backfilling || loading || previewing}
                                            className="px-4 py-2 rounded-lg border border-border text-sm font-semibold hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                                        >
                                            {backfilling ? "Issuing…" : "Issue now"}
                                        </button>
                                    </div>
                                )}

                                {error && (
                                    <div className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2">
                                        <span className="text-lg">⚠️</span> {error}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-6 border-t border-border">
                                    <button
                                        type="button"
                                        onClick={handlePreview}
                                        disabled={previewing || loading}
                                        className="px-5 py-3 rounded-xl border-2 border-border text-foreground text-sm font-bold hover:bg-accent transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {previewing ? "Generating…" : "Generate preview"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={loading || previewing}
                                        className="flex-1 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-50 cursor-pointer"
                                    >
                                        {loading ? "Saving…" : "Save Template"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-6 py-3 rounded-xl border-2 border-border text-foreground text-sm font-bold hover:bg-accent transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
}
