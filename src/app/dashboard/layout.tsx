import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import type { UserRole } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const [profileResult, prefsResult, officerResult] = await Promise.all([
        supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single(),
        supabase
            .from("user_preferences")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("memberships")
            .select("id")
            .eq("user_id", user.id)
            .eq("role", "officer")
            .eq("status", "approved")
            .limit(1),
    ]);

    const profile = profileResult.data;
    const prefs = prefsResult.data;
    const officerships = officerResult.data;

    let userRole: UserRole = (profile?.role as UserRole) || "student";
    const userName: string = profile?.full_name || "User";

    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) {
            userRole = rpcRole as UserRole;
        }
    }

    if (userRole !== "admin") {
        if (officerships && officerships.length > 0) {
            userRole = "officer";
        } else {
            userRole = "student";
        }
    }

    const userEmail: string = user.email || "";

    return (
        <ThemeProvider initialPrefs={prefs}>
            <div className="min-h-screen bg-background">
                <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />

                <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm sticky top-0 z-30">
                    <MobileNav userRole={userRole} userName={userName} userEmail={userEmail} />
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-primary">iE</span>
                        <span className="text-sm font-semibold">ITECHEngage</span>
                    </div>
                    <div className="w-10" />
                </div>

                <main className="lg:pl-64">
                    <div className="max-w-6xl mx-auto p-6 lg:p-8">{children}</div>
                </main>
            </div>
        </ThemeProvider>
    );
}
