import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface Props {
    params: Promise<{ userId: string }>;
}

const typeLabels: Record<string, string> = {
    membership: "Membership",
    officer_role: "Officer Role",
    event_attended: "Event Attended",
    election_winner: "Election Winner",
    accreditation: "Accreditation",
};

const typeEmoji: Record<string, string> = {
    membership: "👥",
    officer_role: "🎖️",
    event_attended: "📅",
    election_winner: "🏆",
    accreditation: "📋",
};

export default async function PublicProfilePage({ params }: Props) {
    const { userId } = await params;
    const supabase = await createClient();

    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, role, track_record")
        .eq("id", userId)
        .single();

    if (!profile) notFound();

    // Fetch in parallel: memberships, org roles, public engagement records
    const [membershipsResult, orgRolesResult, recordsResult] = await Promise.all([
        supabase
            .from("memberships")
            .select("organization_id, role, organizations(id, name, logo_url)")
            .eq("user_id", userId)
            .eq("status", "approved"),
        supabase
            .from("organization_roles")
            .select("title, hierarchy_level, organization_id, organizations:organization_id(name)")
            .eq("assigned_user_id", userId),
        supabase
            .from("engagement_records")
            .select("id, record_type, title, description, date_earned, hours_credit, organization_name, is_public")
            .eq("user_id", userId)
            .eq("is_public", true)
            .order("date_earned", { ascending: false })
            .limit(50),
    ]);

    const memberships = membershipsResult.data;
    const orgRoles = orgRolesResult.data;
    const records = recordsResult.data || [];

    const initials = profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    // Aggregate record stats
    const totalHours = records.reduce((sum, r) => sum + (r.hours_credit || 0), 0);
    const byType = records.reduce<Record<string, number>>((acc, r) => {
        acc[r.record_type] = (acc[r.record_type] || 0) + 1;
        return acc;
    }, {});

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

                    {profile.track_record && (
                        <div className="mt-4 pt-4 border-t">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Track Record</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profile.track_record}</p>
                        </div>
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

            {/* Co-Curricular Records (records the student marked public) */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                    <h2 className="text-lg font-bold">🎓 Co-Curricular Record</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Activities and engagements</p>
                </div>

                {records.length === 0 ? (
                    <div className="p-8 text-center">
                        <p className="text-3xl mb-2">📋</p>
                        <p className="text-sm text-muted-foreground">No public records yet.</p>
                    </div>
                ) : (
                    <div className="p-4 space-y-4">
                        {/* Summary stats */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-lg border bg-muted/30 p-3 text-center">
                                <p className="text-2xl font-bold text-[#800000]">{records.length}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Total Records</p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 p-3 text-center">
                                <p className="text-2xl font-bold text-[#C9A227]">{totalHours.toFixed(1)}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Total Hours</p>
                            </div>
                            <div className="rounded-lg border bg-muted/30 p-3 text-center">
                                <p className="text-2xl font-bold text-green-600">{Object.keys(byType).length}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Activity Types</p>
                            </div>
                        </div>

                        {/* Type badges */}
                        {Object.entries(byType).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(byType).map(([type, count]) => (
                                    <span key={type} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-muted border">
                                        {typeEmoji[type] || "📌"} {typeLabels[type] || type} <span className="font-bold text-[#800000]">{count}</span>
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Records table */}
                        <div className="rounded-lg border overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Type</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Activity</th>
                                            <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Org</th>
                                            <th className="text-center px-4 py-2.5 text-xs font-medium text-muted-foreground">Hrs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {records.map((record) => (
                                            <tr key={record.id} className="hover:bg-accent/30 transition-colors">
                                                <td className="px-4 py-2.5 whitespace-nowrap text-xs text-muted-foreground">
                                                    {new Date(record.date_earned).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted">
                                                        {typeEmoji[record.record_type]} {typeLabels[record.record_type] || record.record_type}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <p className="font-medium text-sm leading-tight">{record.title}</p>
                                                    {record.description && (
                                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{record.description}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-muted-foreground">{record.organization_name || "—"}</td>
                                                <td className="px-4 py-2.5 text-center text-xs font-semibold">{record.hours_credit}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
