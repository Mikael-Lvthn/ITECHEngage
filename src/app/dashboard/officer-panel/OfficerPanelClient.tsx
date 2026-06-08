"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { approveMember, rejectMember } from "@/lib/actions/members";
import { approveLeaveRequest, rejectLeaveRequest } from "@/lib/actions/organizations";
import { getErrorMessage } from "@/lib/utils/error";

interface MembershipRequest {
    id: string;
    user_id: string;
    organization_id: string;
    status: string;
    created_at: string;
    profiles: { full_name: string; email: string } | null;
    organizations: { name: string } | null;
}

interface LeaveRequest {
    id: string;
    user_id: string;
    organization_id: string;
    status: string;
    created_at: string;
    profiles: { full_name: string; email: string } | null;
    organizations: { name: string } | null;
}

interface PendingEvent {
    id: string;
    title: string;
    description: string | null;
    start_datetime: string;
    location: string;
    status: string;
    organization_id: string;
    organizations: { name: string } | null;
}

interface PendingNews {
    id: string;
    title: string;
    content: string | null;
    status: string;
    organization_id: string;
    created_at: string;
    organizations: { name: string } | null;
}

interface ApprovedMember {
    id: string;
    user_id: string;
    organization_id: string;
    role: string;
    created_at: string;
    profiles: { full_name: string; email: string; avatar_url: string | null } | null;
    organizations: { name: string } | null;
}

interface Organization {
    id: string;
    name: string;
}

interface OfficerPanelClientProps {
    pendingMemberships: MembershipRequest[];
    pendingLeaveRequests: LeaveRequest[];
    pendingEvents: PendingEvent[];
    pendingNews: PendingNews[];
    approvedMembers: ApprovedMember[];
    organizations: Organization[];
}

type Tab = "members" | "leave" | "content" | "roster";

const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "members", label: "Pending Members", icon: "📋" },
    { key: "leave", label: "Leave Requests", icon: "🚪" },
    { key: "content", label: "News & Events", icon: "📰" },
    { key: "roster", label: "Member Overview", icon: "👥" },
];

export default function OfficerPanelClient({
    pendingMemberships,
    pendingLeaveRequests,
    pendingEvents,
    pendingNews,
    approvedMembers,
    organizations,
}: OfficerPanelClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>("members");

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon="📋" label="Pending Members" value={pendingMemberships.length} color="bg-yellow-500/10" />
                <StatCard icon="🚪" label="Leave Requests" value={pendingLeaveRequests.length} color="bg-orange-500/10" />
                <StatCard icon="📰" label="Pending Content" value={pendingEvents.length + pendingNews.length} color="bg-blue-500/10" />
                <StatCard icon="👥" label="Total Members" value={approvedMembers.length} color="bg-[#800000]/10" />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-border">
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? "border-primary text-primary"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                            }`}
                        >
                            <span>{tab.icon}</span>
                            {tab.label}
                            {tab.key === "members" && pendingMemberships.length > 0 && (
                                <span className="bg-[#C9A227] text-[#2B2B2B] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {pendingMemberships.length}
                                </span>
                            )}
                            {tab.key === "leave" && pendingLeaveRequests.length > 0 && (
                                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {pendingLeaveRequests.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-scale-in">
                {activeTab === "members" && <PendingMembersTab requests={pendingMemberships} />}
                {activeTab === "leave" && <LeaveRequestsTab requests={pendingLeaveRequests} />}
                {activeTab === "content" && <ContentTab events={pendingEvents} news={pendingNews} />}
                {activeTab === "roster" && <MemberRosterTab members={approvedMembers} organizations={organizations} />}
            </div>
        </div>
    );
}

/* ---------- Stat Card ---------- */
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
    return (
        <div className="rounded-xl border bg-card p-5 card-hover">
            <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <span className="text-lg">{icon}</span>
                </div>
                <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold mt-0.5">{value}</p>
                </div>
            </div>
        </div>
    );
}

/* ---------- Empty State ---------- */
function EmptyState({ icon, message }: { icon: string; message: string }) {
    return (
        <div className="text-center py-8">
            <span className="text-3xl">{icon}</span>
            <p className="text-sm text-muted-foreground mt-2">{message}</p>
        </div>
    );
}

/* ---------- Tab 1: Pending Members ---------- */
function PendingMembersTab({ requests }: { requests: MembershipRequest[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);

    function handleApprove(req: MembershipRequest) {
        setActioningId(req.id);
        startTransition(async () => {
            try {
                await approveMember(req.id, req.organization_id);
                router.refresh();
            } catch (err) {
                console.error("Approve failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    function handleReject(req: MembershipRequest) {
        setActioningId(req.id);
        startTransition(async () => {
            try {
                await rejectMember(req.id, req.organization_id);
                router.refresh();
            } catch (err) {
                console.error("Reject failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    return (
        <section className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#C9A227]/5 to-transparent">
                <h3 className="font-semibold text-foreground">📋 Pending Membership Requests</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Approve or reject members wanting to join your organization</p>
            </div>
            <div className="p-4">
                {requests.length === 0 ? (
                    <EmptyState icon="✅" message="No pending membership requests." />
                ) : (
                    <div className="space-y-2">
                        {requests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{req.profiles?.full_name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {req.profiles?.email} · <span className="font-medium">{req.organizations?.name}</span>
                                        {" · "}{new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0 ml-3">
                                    <button
                                        onClick={() => handleApprove(req)}
                                        disabled={isPending && actioningId === req.id}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {isPending && actioningId === req.id ? "..." : "Approve"}
                                    </button>
                                    <button
                                        onClick={() => handleReject(req)}
                                        disabled={isPending && actioningId === req.id}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        {isPending && actioningId === req.id ? "..." : "Reject"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ---------- Tab 2: Leave Requests ---------- */
function LeaveRequestsTab({ requests }: { requests: LeaveRequest[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);

    function handleApprove(requestId: string) {
        setActioningId(requestId);
        startTransition(async () => {
            try {
                await approveLeaveRequest(requestId);
                router.refresh();
            } catch (err) {
                console.error("Approve failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    function handleReject(requestId: string) {
        setActioningId(requestId);
        startTransition(async () => {
            try {
                await rejectLeaveRequest(requestId);
                router.refresh();
            } catch (err) {
                console.error("Reject failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    return (
        <section className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-500/5 to-transparent">
                <h3 className="font-semibold text-foreground">🚪 Leave Requests</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Review member leave requests for your organization</p>
            </div>
            <div className="p-4">
                {requests.length === 0 ? (
                    <EmptyState icon="✅" message="No pending leave requests." />
                ) : (
                    <div className="space-y-2">
                        {requests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{req.profiles?.full_name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Wants to leave <span className="font-medium">{req.organizations?.name}</span>
                                        {" · "}{new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0 ml-3">
                                    <button
                                        onClick={() => handleApprove(req.id)}
                                        disabled={isPending && actioningId === req.id}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                    >
                                        {isPending && actioningId === req.id ? "..." : "Approve"}
                                    </button>
                                    <button
                                        onClick={() => handleReject(req.id)}
                                        disabled={isPending && actioningId === req.id}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        {isPending && actioningId === req.id ? "..." : "Reject"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ---------- Tab 3: News & Events ---------- */
function ContentTab({ events, news }: { events: PendingEvent[]; news: PendingNews[] }) {
    return (
        <div className="space-y-6">
            {/* Pending Events */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-500/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📅 Pending Events</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Draft and pending event submissions from your organization</p>
                </div>
                <div className="p-4">
                    {events.length === 0 ? (
                        <EmptyState icon="🎉" message="No pending events." />
                    ) : (
                        <div className="space-y-2">
                            {events.map((ev) => (
                                <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{ev.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {ev.organizations?.name} · {ev.location}
                                            {" · "}{new Date(ev.start_datetime).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                        ev.status === "draft"
                                            ? "bg-gray-100 text-gray-600"
                                            : "bg-yellow-100 text-yellow-700"
                                    }`}>
                                        {ev.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Pending News */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-500/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📰 Pending News Articles</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Draft and pending news from your organization</p>
                </div>
                <div className="p-4">
                    {news.length === 0 ? (
                        <EmptyState icon="📰" message="No pending news articles." />
                    ) : (
                        <div className="space-y-2">
                            {news.map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{item.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.organizations?.name}
                                            {" · "}{new Date(item.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                        item.status === "draft"
                                            ? "bg-gray-100 text-gray-600"
                                            : "bg-yellow-100 text-yellow-700"
                                    }`}>
                                        {item.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

/* ---------- Tab 4: Member Roster ---------- */
function MemberRosterTab({ members, organizations }: { members: ApprovedMember[]; organizations: Organization[] }) {
    const [orgFilter, setOrgFilter] = useState<string>("all");
    const [search, setSearch] = useState("");

    const filtered = members.filter((m) => {
        if (orgFilter !== "all" && m.organization_id !== orgFilter) return false;
        if (search && !m.profiles?.full_name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    return (
        <section className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                <h3 className="font-semibold text-foreground">👥 Member Overview</h3>
                <p className="text-xs text-muted-foreground mt-0.5">All approved members in your organization{organizations.length > 1 ? "s" : ""}</p>
            </div>
            <div className="p-4 space-y-4">
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search members..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pl-8"
                        />
                        <span className="absolute left-2.5 top-2.5 text-muted-foreground text-sm">🔍</span>
                    </div>
                    {organizations.length > 1 && (
                        <select
                            value={orgFilter}
                            onChange={(e) => setOrgFilter(e.target.value)}
                            className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
                        >
                            <option value="all">All Organizations</option>
                            {organizations.map((org) => (
                                <option key={org.id} value={org.id}>{org.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <p className="text-xs text-muted-foreground">{filtered.length} member{filtered.length !== 1 ? "s" : ""}</p>

                {filtered.length === 0 ? (
                    <EmptyState icon="👥" message="No members found." />
                ) : (
                    <div className="space-y-1">
                        {filtered.map((m) => (
                            <Link
                                key={m.id}
                                href={`/dashboard/profile/${m.user_id}`}
                                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                            >
                                <div className="relative w-9 h-9 rounded-full bg-muted overflow-hidden shrink-0">
                                    {m.profiles?.avatar_url ? (
                                        <Image src={m.profiles.avatar_url} alt="" fill className="object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-[#800000]/20 flex items-center justify-center text-[10px] font-bold text-[#800000]">
                                            {m.profiles?.full_name
                                                ?.split(" ")
                                                .map((n) => n[0])
                                                .join("")
                                                .toUpperCase()
                                                .slice(0, 2) || "?"}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{m.profiles?.full_name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">{m.profiles?.email} · {m.organizations?.name}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 capitalize ${
                                    m.role === "officer"
                                        ? "bg-[#C9A227]/20 text-[#C9A227]"
                                        : "bg-muted text-muted-foreground"
                                }`}>
                                    {m.role}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
