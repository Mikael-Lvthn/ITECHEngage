import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JoinButton from "../JoinButton";
import RecruitmentSection from "./RecruitmentSection";
import OrgChart from "@/components/org-chart/OrgChart";
import OrgRolesManager from "@/components/org-chart/OrgRolesManager";
import OrgDetailTabs from "./OrgDetailTabs";
import FollowButton from "@/components/organizations/FollowButton";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function OrganizationDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

    if (!org) notFound();

    const { data: membership } = await supabase
        .from("memberships")
        .select("status, role")
        .eq("user_id", user!.id)
        .eq("organization_id", id)
        .maybeSingle();

    const membershipStatus = membership?.status || "none";
    const isOfficer = membership?.role === "officer";

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();

    let userRole = profile?.role || "student";
    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) userRole = rpcRole;
    }
    const isAdmin = userRole === "admin";

    const { count: memberCount } = await supabase
        .from("memberships")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id)
        .eq("status", "approved");

    const { data: followData } = await supabase
        .from("organization_follows")
        .select("id")
        .eq("user_id", user!.id)
        .eq("organization_id", id)
        .maybeSingle();

    const isFollowing = !!followData;

    const { count: followerCount } = await supabase
        .from("organization_follows")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", id);

    const { data: recruitments } = await supabase
        .from("recruitment_requests")
        .select("*")
        .eq("organization_id", id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

    const { data: events } = await supabase
        .from("events")
        .select("*")
        .eq("organization_id", id)
        .eq("status", "published")
        .order("start_datetime", { ascending: true });

    const { data: news } = await supabase
        .from("news")
        .select("*")
        .eq("organization_id", id)
        .eq("status", "published")
        .order("published_at", { ascending: false });

    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("*, profiles(full_name, avatar_url)")
        .eq("organization_id", id)
        .order("hierarchy_level");

    const chartRoles = (orgRoles || []).map((r) => ({
        id: r.id,
        title: r.title,
        hierarchy_level: r.hierarchy_level,
        can_manage_roles: r.can_manage_roles,
        assigned_user_id: r.assigned_user_id,
        assigned_user_name: r.profiles?.full_name || null,
        assigned_user_avatar: r.profiles?.avatar_url || null,
        parent_role_id: r.parent_role_id || null,
    }));

    let canManageRoles = isAdmin;
    if (!isAdmin) {
        const hasManagerRole = (orgRoles || []).some(
            (r) => r.assigned_user_id === user!.id && r.can_manage_roles
        );
        canManageRoles = hasManagerRole;
    }

    let orgMembers: { user_id: string; full_name: string }[] = [];
    if (canManageRoles) {
        const { data: membersData } = await supabase
            .from("memberships")
            .select("user_id, profiles(full_name)")
            .eq("organization_id", id)
            .eq("status", "approved");

        orgMembers = (membersData || []).map((m) => ({
            user_id: m.user_id,
            full_name: (m.profiles as any)?.full_name || "Unknown",
        }));
    }

    const managerRoles = (orgRoles || []).map((r) => ({
        id: r.id,
        title: r.title,
        hierarchy_level: r.hierarchy_level,
        can_manage_roles: r.can_manage_roles,
        assigned_user_id: r.assigned_user_id,
        assigned_user_name: r.profiles?.full_name || null,
        parent_role_id: r.parent_role_id || null,
    }));

    return (
        <div className="space-y-6 pb-12">
            <Link
                href="/dashboard/organizations"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                ← Back to Organizations
            </Link>

            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="h-44 md:h-56 bg-gray-200 relative">
                    {org.cover_photo_url ? (
                        <img src={org.cover_photo_url} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-r from-[#800000] to-[#C9A227] opacity-80" />
                    )}
                </div>

                <div className="px-6 pb-6 relative">
                    <div className="flex items-end -mt-14 mb-4">
                        <div className="w-28 h-28 rounded-2xl border-4 border-white bg-white shrink-0 overflow-hidden shadow-lg z-10">
                            {org.logo_url ? (
                                <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#800000]/10 flex items-center justify-center text-4xl">🏢</div>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">{org.name}</h1>
                            {org.description && (
                                <p className="text-gray-500 mt-1.5 text-sm md:text-base max-w-2xl line-clamp-2">{org.description}</p>
                            )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            {!isAdmin && <FollowButton organizationId={id} isFollowing={isFollowing} isOfficer={isOfficer} />}
                            {isOfficer && (
                                <Link
                                    href={`/dashboard/organizations/${id}/members`}
                                    className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50 transition-colors bg-white shadow-sm"
                                >
                                    Manage Members
                                </Link>
                            )}
                            {isAdmin ? (
                                <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg text-sm font-semibold border border-gray-200">
                                    Admin View
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm">
                                    <JoinButton
                                        organizationId={org.id}
                                        membershipStatus={membershipStatus as "none" | "pending" | "approved"}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm mt-5 border-t pt-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <span className="font-semibold text-gray-900">{memberCount ?? 0}</span> member{memberCount !== 1 ? "s" : ""}
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <span className="font-semibold text-gray-900">{followerCount ?? 0}</span> follower{followerCount !== 1 ? "s" : ""}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider ${org.accreditation_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {org.accreditation_status}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500 capitalize">
                            {org.visibility}
                        </div>
                    </div>
                </div>
            </div>

            <OrgDetailTabs
                aboutContent={
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="space-y-6">
                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                <h2 className="text-lg font-bold mb-4">About</h2>

                                <div className="space-y-4">
                                    {org.mission && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900">Mission</h3>
                                            <p className="text-sm text-gray-600 mt-1">{org.mission}</p>
                                        </div>
                                    )}
                                    {org.vision && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900">Vision</h3>
                                            <p className="text-sm text-gray-600 mt-1">{org.vision}</p>
                                        </div>
                                    )}
                                    {org.core_values && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-900">Core Values</h3>
                                            <p className="text-sm text-gray-600 mt-1">{org.core_values}</p>
                                        </div>
                                    )}
                                    {(!org.mission && !org.vision && !org.core_values) && (
                                        <p className="text-sm text-gray-400 italic">No detailed about information provided.</p>
                                    )}
                                </div>
                            </div>

                            <RecruitmentSection
                                organizationId={id}
                                recruitments={recruitments || []}
                                isOfficer={isOfficer}
                                membershipStatus={membershipStatus}
                            />
                        </div>

                        <div className="lg:col-span-2 space-y-6">
                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold">Upcoming Events</h2>
                                </div>

                                {events && events.length > 0 ? (
                                    <div className="space-y-3">
                                        {events.map(ev => (
                                            <div key={ev.id} className="flex gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                                                <div className="w-12 h-12 bg-red-50 text-red-700 rounded-lg flex flex-col items-center justify-center shrink-0">
                                                    <span className="text-xs font-bold uppercase">{new Date(ev.start_datetime).toLocaleString('default', { month: 'short' })}</span>
                                                    <span className="text-lg font-bold leading-none">{new Date(ev.start_datetime).getDate()}</span>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold">{ev.title}</h3>
                                                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{ev.description}</p>
                                                    <p className="text-xs text-gray-400 mt-1">📍 {ev.location}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border rounded-lg bg-gray-50">
                                        <p className="text-sm text-gray-500">No upcoming events.</p>
                                    </div>
                                )}
                            </div>

                            <div className="rounded-xl border bg-white p-6 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-bold">Latest News</h2>
                                </div>

                                {news && news.length > 0 ? (
                                    <div className="space-y-4">
                                        {news.map(item => (
                                            <div key={item.id} className="p-4 rounded-lg border hover:shadow-sm transition-shadow">
                                                <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
                                                    <span className="font-medium text-[#C9A227]">News</span>
                                                    <span>•</span>
                                                    <span>{new Date(item.published_at || item.created_at).toLocaleDateString()}</span>
                                                </div>
                                                <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                                                <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{item.content}</p>

                                                {item.image_url && (
                                                    <img src={item.image_url} alt={item.title} className="mt-3 w-full h-48 object-cover rounded-lg border" />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 border rounded-lg bg-gray-50">
                                        <p className="text-sm text-gray-500">No news articles published yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                }
                structureContent={
                    <div className="space-y-6">
                        <div className="rounded-xl border bg-white p-6 shadow-sm">
                            <h2 className="text-lg font-bold mb-6">Organizational Structure</h2>
                            <OrgChart roles={chartRoles} orgName={org.name} />
                        </div>

                        {canManageRoles && (
                            <OrgRolesManager
                                organizationId={id}
                                roles={managerRoles}
                                members={orgMembers}
                            />
                        )}
                    </div>
                }
            />
        </div>
    );
}
