"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { updateSiteContent, type LegalSlug } from "@/lib/actions/legal";
import { useToast } from "@/components/Toast";
import { LoadingButton } from "@/components/loading/LoadingButton";
import { getErrorMessage } from "@/lib/utils/error";

interface Doc {
    title: string;
    content: string;
}

function DocEditor({ slug, initial, viewHref }: { slug: LegalSlug; initial: Doc; viewHref: string }) {
    const [title, setTitle] = useState(initial.title);
    const [content, setContent] = useState(initial.content);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    async function save() {
        setSaving(true);
        try {
            await updateSiteContent(slug, title, content);
            showToast("Saved. Public page updated.", "success");
        } catch (err) {
            showToast(getErrorMessage(err) || "Failed to save", "error");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold capitalize">{slug}</h2>
                <Link
                    href={viewHref}
                    target="_blank"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                    View page <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
            </div>

            <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Content <span className="font-normal">(plain text — blank lines separate paragraphs)</span>
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={16}
                    className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                />
            </div>

            <div className="flex justify-end">
                <LoadingButton
                    type="button"
                    onClick={save}
                    isLoading={saving}
                    loadingText="Saving…"
                    className="inline-flex items-center justify-center px-5 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
                >
                    Save {slug}
                </LoadingButton>
            </div>
        </div>
    );
}

export default function LegalEditor({ terms, privacy }: { terms: Doc; privacy: Doc }) {
    return (
        <div className="space-y-6">
            <DocEditor slug="terms" initial={terms} viewHref="/terms" />
            <DocEditor slug="privacy" initial={privacy} viewHref="/privacy" />
        </div>
    );
}
