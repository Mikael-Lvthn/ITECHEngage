import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppearanceSettings from "@/components/AppearanceSettings";
import NotificationPreferences from "@/components/NotificationPreferences";

export default async function SettingsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Customize your ITECHEngage experience
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors card-hover"
                >
                    <span>🏠</span> Home
                </Link>
            </div>

            <AppearanceSettings />

            <div className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="mb-4">
                    <h2 className="font-semibold flex items-center gap-2">
                        🔔 Notification Preferences
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">
                        Control which notifications you receive
                    </p>
                </div>
                <NotificationPreferences />
            </div>
        </div>
    );
}
