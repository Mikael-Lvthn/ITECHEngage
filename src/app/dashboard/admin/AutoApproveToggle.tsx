"use client";

// TEMPORARY auto-approve feature — owner-only control card.
// Remove this component along with the app_settings table when no longer needed.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAppSetting } from "@/lib/actions/app-settings";
import { type AppSettings } from "@/lib/app-config";

export default function AutoApproveToggle({ settings }: { settings: AppSettings }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [pendingKey, setPendingKey] = useState<string | null>(null);
    const [error, setError] = useState("");

    const toggle = (key: "auto_verify_students" | "auto_approve_memberships", value: boolean) => {
        setPendingKey(key);
        setError("");
        startTransition(async () => {
            try {
                await setAppSetting(key, value);
                router.refresh();
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to update setting");
            } finally {
                setPendingKey(null);
            }
        });
    };

    return (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🧪</span>
                <h2 className="font-bold text-amber-900 dark:text-amber-200">Temporary — Auto-Approval</h2>
            </div>
            <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mb-4">
                Only you can see and change these. While ON, the chosen steps are approved automatically.
            </p>

            <div className="space-y-3">
                <ToggleRow
                    label="Auto-verify student registrations"
                    description="New student sign-ups are verified immediately instead of waiting for approval."
                    checked={settings.auto_verify_students}
                    busy={isPending && pendingKey === "auto_verify_students"}
                    onChange={(v) => toggle("auto_verify_students", v)}
                />
                <ToggleRow
                    label="Auto-approve organization joins"
                    description="Students who request to join an organization are approved immediately."
                    checked={settings.auto_approve_memberships}
                    busy={isPending && pendingKey === "auto_approve_memberships"}
                    onChange={(v) => toggle("auto_approve_memberships", v)}
                />
            </div>

            {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
        </div>
    );
}

function ToggleRow({
    label,
    description,
    checked,
    busy,
    onChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    busy: boolean;
    onChange: (value: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-lg border bg-card px-4 py-3">
            <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                disabled={busy}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                    checked ? "bg-green-600" : "bg-muted dark:bg-gray-600"
                }`}
            >
                <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-card shadow transition-transform ${
                        checked ? "translate-x-5" : "translate-x-0.5"
                    }`}
                />
            </button>
        </div>
    );
}
