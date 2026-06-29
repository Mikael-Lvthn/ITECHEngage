"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCertificateDownloadUrl } from "@/lib/actions/certificates";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils/error";

interface CertRow {
    id: string;
    verification_code: string;
    issued_at: string;
    organizations: { name: string } | null;
}

export default function MyCertificates() {
    const [certs, setCerts] = useState<CertRow[]>([]);
    const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
    const [downloadingId, setDownloadingId] = useState<string>("");
    const supabase = createClient();
    const { showToast } = useToast();

    const load = useCallback(async () => {
        setStatus("loading");
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            // Session not ready / signed out — distinct from "genuinely none".
            setStatus("error");
            return;
        }
        // RLS (certificates_owner_read) scopes this to the current user.
        const { data, error } = await supabase
            .from("certificates")
            .select("id, verification_code, issued_at, organizations(name)")
            .eq("user_id", user.id)
            .order("issued_at", { ascending: false });
        if (error) {
            // Don't blow away a previously-good list or imply the cert is gone.
            setStatus("error");
            return;
        }
        setCerts((data as unknown as CertRow[]) ?? []);
        setStatus("ready");
    }, [supabase]);

    useEffect(() => {
        load();
    }, [load]);

    async function handleDownload(id: string) {
        setDownloadingId(id);
        try {
            const url = await getCertificateDownloadUrl(id);
            window.open(url, "_blank", "noopener,noreferrer");
        } catch (error) {
            showToast(getErrorMessage(error) || "Could not download certificate", "error");
        } finally {
            setDownloadingId("");
        }
    }

    if (status === "loading") {
        return (
            <div className="bg-card rounded-xl shadow-sm border p-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-40 mb-4" />
                <div className="h-16 bg-muted rounded" />
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-bold mb-1">My Certificates</h2>
            <p className="text-sm text-muted-foreground mb-4">
                Membership certificates issued to you. Each download link is private and expires shortly.
            </p>
            {status === "error" ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                        Couldn&apos;t load your certificates just now. Your certificates are safe — this is only a loading issue.
                    </p>
                    <button
                        type="button"
                        onClick={() => load()}
                        className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            ) : certs.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        No certificates yet. Certificates appear here once your membership in an organization is approved.
                    </p>
                </div>
            ) : (
            <ul className="space-y-3">
                {certs.map((cert) => (
                    <li
                        key={cert.id}
                        className="flex items-center justify-between gap-3 flex-wrap rounded-xl border border-border bg-muted/30 p-4"
                    >
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {cert.organizations?.name ?? "Organization"}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Issued {new Date(cert.issued_at).toLocaleDateString()} · Verification code{" "}
                                <span className="font-mono font-semibold text-foreground">{cert.verification_code}</span>
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => handleDownload(cert.id)}
                            disabled={downloadingId === cert.id}
                            className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {downloadingId === cert.id ? "Preparing…" : "⬇ Download PDF"}
                        </button>
                    </li>
                ))}
            </ul>
            )}
        </div>
    );
}
