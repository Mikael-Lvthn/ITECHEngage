import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Props {
    params: Promise<{ userId: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
    const { userId } = await params;
    const supabase = await createClient();

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, role")
        .eq("id", userId)
        .single();

    if (!profile) notFound();

    // Get user's approved memberships with org info
    const { data: memberships } = await supabase
        .from("memberships")
        .select("organization_id, role, organizations(id, name, logo_url)")
        .eq("user_id", userId)
        .eq("status", "approved");

    // Get organization roles (structural positions)
    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("title, hierarchy_level, organization_id, organizations:organization_id(name)")
        .eq("assigned_user_id", userId);

    const initials = profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <Link
                href="/dashboard/organizations"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                ← Back to Organizations
            </Link>

            {/* Profile Card */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {/* Banner */}
                <div className="h-32 bg-gradient-to-r from-[#800000] to-[#C9A227] opacity-80" />

                <div className="px-6 pb-6 relative">
                    <div className="flex items-end -mt-12 mb-4">
                        <div className="relative w-24 h-24 rounded-full border-4 border-card bg-card shrink-0 overflow-hidden shadow-lg z-10">
                            {profile.avatar_url ? (
                                <Image src={profile.avatar_url} alt={profile.full_name} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#800000]/10 flex items-center justify-center text-2xl font-bold text-[#800000]">
                                    {initials}
                                </div>
                            )}
                        </div>
                    </div>

                    <h1 className="text-2xl font-bold text-foreground">{profile.full_name}</h1>
                    <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#800000]/10 text-[#800000] capitalize">
                        {profile.role}
                    </span>

                    {profile.bio && (
                        <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{profile.bio}</p>
                    )}
                </div>
            </div>

            {/* Organizations */}
            {memberships && memberships.length > 0 && (
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <h2 className="text-lg font-bold mb-4">Organizations</h2>
                    <div className="space-y-3">
                        {memberships.map((m) => {
                            const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
                            if (!org) return null;
                            const orgRole = orgRoles?.find(r => {
                                const rOrg = Array.isArray(r.organizations) ? r.organizations[0] : r.organizations;
                                return rOrg && 'name' in rOrg && org && 'name' in org && rOrg.name === org.name;
                            });

                            return (
                                <Link
                                    key={m.organization_id}
                                    href={`/dashboard/organizations/${m.organization_id}`}
                                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                                >
                                    <div className="relative w-10 h-10 rounded-lg bg-muted overflow-hidden shrink-0">
                                        {org.logo_url ? (
                                            <Image src={org.logo_url} alt={org.name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-[#800000]/10 flex items-center justify-center text-lg">🏢</div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate">{org.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">
                                            {orgRole ? orgRole.title : m.role}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {(!memberships || memberships.length === 0) && (
                <div className="rounded-xl border bg-card p-6 shadow-sm text-center">
                    <p className="text-sm text-muted-foreground">This user is not a member of any organizations.</p>
                </div>
            )}
        </div>
    );
}
