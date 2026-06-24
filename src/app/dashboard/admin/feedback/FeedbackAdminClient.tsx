"use client";

import { useState } from "react";
import { Mail, Check, RotateCcw, Inbox } from "lucide-react";
import { updateFeedbackStatus, type FeedbackItem, type FeedbackStatus } from "@/lib/actions/feedback";
import { useToast } from "@/components/Toast";
import { getErrorMessage } from "@/lib/utils/error";

const CATEGORY_STYLES: Record<string, string> = {
    feedback: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
    suggestion: "bg-gold/15 text-gold",
    bug: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
    other: "bg-muted text-muted-foreground",
};

type Filter = "all" | "new" | "reviewed";

export default function FeedbackAdminClient({ items }: { items: FeedbackItem[] }) {
    const [feedback, setFeedback] = useState(items);
    const [filter, setFilter] = useState<Filter>("all");
    const [busyId, setBusyId] = useState<string | null>(null);
    const { showToast } = useToast();

    const newCount = feedback.filter((f) => f.status === "new").length;
    const visible = feedback.filter((f) => filter === "all" || f.status === filter);

    async function setStatus(id: string, status: FeedbackStatus) {
        setBusyId(id);
        const prev = feedback;
        setFeedback((list) => list.map((f) => (f.id === id ? { ...f, status } : f)));
        try {
            await updateFeedbackStatus(id, status);
        } catch (err) {
            setFeedback(prev);
            showToast(getErrorMessage(err) || "Failed to update", "error");
        } finally {
            setBusyId(null);
        }
    }

    const filters: { key: Filter; label: string }[] = [
        { key: "all", label: `All (${feedback.length})` },
        { key: "new", label: `New (${newCount})` },
        { key: "reviewed", label: `Reviewed (${feedback.length - newCount})` },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {filters.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                            filter === f.key
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border hover:bg-accent"
                        }`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {visible.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-12 text-center">
                    <Inbox className="w-10 h-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm text-muted-foreground">No feedback in this view yet.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {visible.map((f) => (
                        <div
                            key={f.id}
                            className={`rounded-xl border bg-card p-4 transition-colors ${
                                f.status === "new" ? "border-primary/30" : "border-border"
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider capitalize ${CATEGORY_STYLES[f.category] || CATEGORY_STYLES.other}`}>
                                        {f.category}
                                    </span>
                                    {f.status === "new" && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary">
                                            New
                                        </span>
                                    )}
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(f.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {f.email && (
                                        <a
                                            href={`mailto:${f.email}?subject=Re: Your ITECHEngage feedback`}
                                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                        >
                                            <Mail className="w-3.5 h-3.5" aria-hidden="true" /> Reply
                                        </a>
                                    )}
                                    {f.status === "new" ? (
                                        <button
                                            onClick={() => setStatus(f.id, "reviewed")}
                                            disabled={busyId === f.id}
                                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            <Check className="w-3.5 h-3.5" aria-hidden="true" /> Mark reviewed
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setStatus(f.id, "new")}
                                            disabled={busyId === f.id}
                                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-border hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" /> Reopen
                                        </button>
                                    )}
                                </div>
                            </div>

                            <p className="text-sm text-foreground mt-3 whitespace-pre-wrap">{f.message}</p>

                            <p className="text-xs text-muted-foreground mt-3">
                                {f.name || "Anonymous"}
                                {f.email ? ` · ${f.email}` : ""}
                                {f.user_id ? " · registered user" : " · guest"}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
