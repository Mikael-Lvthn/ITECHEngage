import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";


export default async function AdminPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        redirect("/dashboard");
    }



    const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

    const { count: totalOrgs } = await supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

    const { count: pendingMemberships } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage organizations, users, and platform settings.
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors card-hover"
                >
                    <span>🏠</span> Home
                </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#800000]/10 flex items-center justify-center">
                            <span className="text-lg">👤</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Users</p>
                            <p className="text-2xl font-bold mt-0.5">{totalUsers ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 flex items-center justify-center">
                            <span className="text-lg">🏢</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Organizations</p>
                            <p className="text-2xl font-bold mt-0.5">{totalOrgs ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                            <span className="text-lg">⏳</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Pending Requests</p>
                            <p className="text-2xl font-bold mt-0.5">{pendingMemberships ?? 0}</p>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );
}
