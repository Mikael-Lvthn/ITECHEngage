import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function FollowedPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: follows } = await supabase
        .from("organization_follows")
        .select("organization_id, organizations(id, name, description, logo_url, accreditation_status, visibility)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const followedOrgs = (follows || []).map((f) => {
        const org = Array.isArray(f.organizations) ? f.organizations[0] : f.organizations;
        return org;
    }).filter(Boolean);

    // Get member counts for each followed org
    const memberCounts: Record<string, number> = {};
    if (followedOrgs.length > 0) {
        const orgIds = followedOrgs.map((o) => o!.id);
        const { data: memberships } = await supabase
            .from("memberships")
            .select("organization_id")
            .in("organization_id", orgIds)
            .eq("status", "approved");

        if (memberships) {
            memberships.forEach((m) => {
                memberCounts[m.organization_id] = (memberCounts[m.organization_id] || 0) + 1;
            });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Followed Organizations</h1>
                    <p className="text-muted-foreground mt-1">
                        Organizations you&apos;re following to stay updated.
                    </p>
                </div>
                <Link
                    href="/dashboard/organizations"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors card-hover"
                >
                    <span>🏢</span> Browse Orgs
                </Link>
            </div>

            {followedOrgs.length === 0 ? (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                    <div className="text-center py-16 px-6">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#800000]/10 flex items-center justify-center mb-4">
                            <span className="text-3xl animate-float">⭐</span>
                        </div>
                        <p className="font-semibold">No followed organizations</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            <Link href="/dashboard/organizations" className="text-primary hover:underline font-medium">
                                Discover organizations
                            </Link>{" "}
                            and follow them to stay updated with their news, events, and elections.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {followedOrgs.map((org, i) => (
                        <Link
                            key={org!.id}
                            href={`/dashboard/organizations/${org!.id}`}
                            className="group rounded-xl border bg-card overflow-hidden card-hover"
                            style={{ animationDelay: `${i * 80}ms` }}
                        >
                            <div className="h-1.5 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                            <div className="p-5">
                                <div className="flex items-start gap-3">
                                    <div className="relative w-12 h-12 rounded-xl bg-[#800000]/10 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                                        {org!.logo_url ? (
                                            <Image src={org!.logo_url} alt={org!.name} fill className="object-cover" />
                                        ) : (
                                            "🏢"
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="font-semibold group-hover:text-primary transition-colors truncate">
                                            {org!.name}
                                        </h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {org!.description || "No description"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                                    <span className="text-xs text-muted-foreground">
                                        <span className="font-semibold text-foreground">{memberCounts[org!.id] || 0}</span> members
                                    </span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider ${
                                        org!.accreditation_status === "approved"
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                    }`}>
                                        {org!.accreditation_status}
                                    </span>
                                    <div className="ml-auto flex items-center gap-1 text-xs text-[#C9A227] font-medium">
                                        <span>★</span> Following
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
