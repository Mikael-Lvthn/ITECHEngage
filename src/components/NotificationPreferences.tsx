"use client";

import { useState, useEffect, useCallback } from "react";
import { Vote, Users, CalendarDays, Megaphone, ShieldCheck, type LucideIcon } from "lucide-react";
import {
    getNotificationPreferences,
    updateNotificationPreferences,
} from "@/lib/actions/notification-preferences";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

interface PrefConfig {
    key: string;
    label: string;
    description: string;
    icon: LucideIcon;
}

const PREF_OPTIONS: PrefConfig[] = [
    {
        key: "election_started",
        label: "Election Notifications",
        description: "When elections start, open for voting, or results are published",
        icon: Vote,
    },
    {
        key: "membership_updates",
        label: "Membership Updates",
        description: "When your membership is approved, rejected, or role changes",
        icon: Users,
    },
    {
        key: "event_reminders",
        label: "Event Reminders",
        description: "When new events are submitted or event status changes",
        icon: CalendarDays,
    },
    {
        key: "org_announcements",
        label: "Organization Announcements",
        description: "Announcements from organizations you belong to",
        icon: Megaphone,
    },
    {
        key: "admin_announcements",
        label: "Admin Announcements",
        description: "System-wide announcements and accreditation updates",
        icon: ShieldCheck,
    },
];

export default function NotificationPreferences() {
    const [prefs, setPrefs] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { showToast } = useToast();

    const loadPrefs = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const data = await getNotificationPreferences(user.id);
            setPrefs({
                election_started: data.election_started,
                membership_updates: data.membership_updates,
                event_reminders: data.event_reminders,
                org_announcements: data.org_announcements,
                admin_announcements: data.admin_announcements,
            });
        } catch (error) {
            console.error("Failed to load preferences:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPrefs();
    }, [loadPrefs]);

    const handleToggle = async (key: string) => {
        const newValue = !prefs[key];
        setPrefs((prev) => ({ ...prev, [key]: newValue }));
        setSaving(true);

        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            await updateNotificationPreferences(user.id, { [key]: newValue });
            showToast("Preferences updated", "success");
        } catch (error) {
            setPrefs((prev) => ({ ...prev, [key]: !newValue }));
            showToast(error instanceof Error ? error.message : "Failed to update", "error");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-3 animate-pulse">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-16 bg-muted rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {PREF_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                <div
                    key={option.key}
                    className="flex items-center justify-between gap-4 rounded-lg border border-border p-4 hover:bg-accent/50 transition-colors"
                >
                    <div className="flex items-start gap-3 min-w-0">
                        <Icon className="w-5 h-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <div className="min-w-0">
                            <p className="text-sm font-medium">{option.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleToggle(option.key)}
                        disabled={saving}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                            prefs[option.key] ? "bg-primary" : "bg-muted"
                        }`}
                        role="switch"
                        aria-checked={prefs[option.key]}
                    >
                        <span
                            className={`pointer-events-none block h-5 w-5 rounded-full bg-card shadow-lg ring-0 transition-transform ${
                                prefs[option.key] ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                    </button>
                </div>
                );
            })}
        </div>
    );
}
