import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MembershipsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: memberships } = await supabase
        .from("memberships")
        .select("id, role, status, organizations(id, name, description, accreditation_status)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const approved = (memberships || []).filter((m) => m.status === "approved");
    const pending = (memberships || []).filter((m) => m.status === "pending");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">My Memberships</h1>
                    <p className="text-muted-foreground mt-1">
                        Organizations you&apos;ve joined or requested to join.
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors card-hover"
                >
                    <span>🏠</span> Home
                </Link>
            </div>

            {pending.length > 0 && (
                <div className="animate-slide-up delay-1">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        Pending ({pending.length})
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {pending.map((m) => {
                            const org = m.organizations as unknown as {
                                id: string;
                                name: string;
                                description: string | null;
                            };
                            return (
                                <div key={m.id} className="rounded-xl border bg-card overflow-hidden opacity-80 card-hover">
                                    <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                                    <div className="p-5">
                                        <h3 className="font-semibold">{org?.name || "Unknown"}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {org?.description || "No description"}
                                        </p>
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800 mt-3">
                                            ⏳ Awaiting Approval
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="animate-slide-up delay-2">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Active Memberships ({approved.length})
                </h2>
                {approved.length === 0 ? (
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-[#C9A227] to-[#E6C84D]" />
                        <div className="text-center py-16 px-6">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C9A227]/10 flex items-center justify-center mb-4">
                                <span className="text-3xl animate-float">👥</span>
                            </div>
                            <p className="font-semibold">No active memberships</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                <Link href="/dashboard/organizations" className="text-primary hover:underline font-medium">
                                    Browse organizations
                                </Link>{" "}
                                to get started.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {approved.map((m, i) => {
                            const org = m.organizations as unknown as {
                                id: string;
                                name: string;
                                description: string | null;
                                accreditation_status: string;
                            };
                            return (
                                <Link
                                    key={m.id}
                                    href={`/dashboard/organizations/${org?.id}`}
                                    className="rounded-xl border bg-card overflow-hidden card-hover"
                                    style={{ animationDelay: `${i * 80}ms` }}
                                >
                                    <div className="h-1.5 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                                    <div className="p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-[#800000]/10 flex items-center justify-center text-lg shrink-0">
                                                🏢
                                            </div>
                                            <div>
                                                <h3 className="font-semibold">{org?.name}</h3>
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                                    {org?.description || "No description"}
                                                </p>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#800000]/10 text-[#800000] capitalize mt-2">
                                                    {m.role}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
