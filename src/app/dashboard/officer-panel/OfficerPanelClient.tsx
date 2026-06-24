"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { approveMember, rejectMember } from "@/lib/actions/members";
import { approveLeaveRequest, rejectLeaveRequest } from "@/lib/actions/organizations";
import { createRecruitment, closeRecruitment, reopenRecruitment, updateRecruitment, deleteRecruitment } from "@/lib/actions/recruitment";
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

interface RecruitmentPost {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    organizations: { name: string } | null;
}

interface OfficerPanelClientProps {
    pendingMemberships: MembershipRequest[];
    pendingLeaveRequests: LeaveRequest[];
    pendingEvents: PendingEvent[];
    pendingNews: PendingNews[];
    approvedMembers: ApprovedMember[];
    recruitments: RecruitmentPost[];
    pendingApplicantsByOrg: Record<string, number>;
    organizations: Organization[];
}

type Tab = "members" | "leave" | "content" | "roster" | "recruitment";

const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "members", label: "Pending Members", icon: "📋" },
    { key: "leave", label: "Leave Requests", icon: "🚪" },
    { key: "content", label: "News & Events", icon: "📰" },
    { key: "roster", label: "Member Overview", icon: "👥" },
    { key: "recruitment", label: "Recruitment", icon: "📢" },
];

export default function OfficerPanelClient({
    pendingMemberships,
    pendingLeaveRequests,
    pendingEvents,
    pendingNews,
    approvedMembers,
    recruitments,
    pendingApplicantsByOrg,
    organizations,
}: OfficerPanelClientProps) {
    const [activeTab, setActiveTab] = useState<Tab>("members");
    const openRecruitments = recruitments.filter((r) => r.is_active).length;

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon="📋" label="Pending Members" value={pendingMemberships.length} color="bg-yellow-500/10" />
                <StatCard icon="🚪" label="Leave Requests" value={pendingLeaveRequests.length} color="bg-orange-500/10" />
                <StatCard icon="📰" label="Pending Content" value={pendingEvents.length + pendingNews.length} color="bg-blue-500/10" />
                <StatCard icon="👥" label="Total Members" value={approvedMembers.length} color="bg-primary/10" />
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
                                <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                                    {pendingMemberships.length > 99 ? "99+" : pendingMemberships.length}
                                </span>
                            )}
                            {tab.key === "leave" && pendingLeaveRequests.length > 0 && (
                                <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                                    {pendingLeaveRequests.length > 99 ? "99+" : pendingLeaveRequests.length}
                                </span>
                            )}
                            {tab.key === "content" && (pendingEvents.length + pendingNews.length) > 0 && (
                                <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                                    {(pendingEvents.length + pendingNews.length) > 99 ? "99+" : (pendingEvents.length + pendingNews.length)}
                                </span>
                            )}
                            {tab.key === "recruitment" && openRecruitments > 0 && (
                                <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-bold text-white shadow-sm">
                                    {openRecruitments > 99 ? "99+" : openRecruitments}
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
                {activeTab === "recruitment" && (
                    <RecruitmentTab
                        recruitments={recruitments}
                        organizations={organizations}
                        pendingApplicantsByOrg={pendingApplicantsByOrg}
                        onViewApplicants={() => setActiveTab("members")}
                    />
                )}
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
                                            ? "bg-muted text-muted-foreground"
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
                                            ? "bg-muted text-muted-foreground"
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
                                        <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
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
                                        ? "bg-gold/20 text-gold"
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

/* ---------- Tab 5: Recruitment ---------- */
function RecruitmentTab({
    recruitments,
    organizations,
    pendingApplicantsByOrg,
    onViewApplicants,
}: {
    recruitments: RecruitmentPost[];
    organizations: Organization[];
    pendingApplicantsByOrg: Record<string, number>;
    onViewApplicants: () => void;
}) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [error, setError] = useState("");

    const openCount = recruitments.filter((r) => r.is_active).length;
    const totalApplicants = Object.values(pendingApplicantsByOrg).reduce((a, b) => a + b, 0);

    const runAction = (id: string, fn: () => Promise<void>) => {
        setActioningId(id);
        startTransition(async () => {
            try {
                await fn();
                router.refresh();
            } catch (err) {
                console.error("Recruitment action failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    };

    const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setCreating(true);
        setError("");
        try {
            const formData = new FormData(e.currentTarget);
            await createRecruitment(formData);
            setShowForm(false);
            router.refresh();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setCreating(false);
        }
    };

    const handleEdit = async (e: React.FormEvent<HTMLFormElement>, post: RecruitmentPost) => {
        e.preventDefault();
        setActioningId(post.id);
        setError("");
        try {
            const formData = new FormData(e.currentTarget);
            formData.set("recruitment_id", post.id);
            formData.set("organization_id", post.organization_id);
            await updateRecruitment(formData);
            setEditingId(null);
            router.refresh();
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setActioningId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <StatCard icon="📢" label="Open Posts" value={openCount} color="bg-green-500/10" />
                <StatCard icon="🗂️" label="Total Posts" value={recruitments.length} color="bg-blue-500/10" />
                <StatCard icon="🙋" label="Pending Applicants" value={totalApplicants} color="bg-yellow-500/10" />
            </div>

            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#C9A227]/5 to-transparent flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">📢 Recruitment Posts</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Post and manage recruitment across your organizations</p>
                    </div>
                    <button
                        onClick={() => { setShowForm((v) => !v); setError(""); }}
                        className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                    >
                        {showForm ? "Cancel" : "+ Post Recruitment"}
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {totalApplicants > 0 && (
                        <button
                            onClick={onViewApplicants}
                            className="w-full text-left text-xs px-3 py-2 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 transition-colors"
                        >
                            🙋 {totalApplicants} pending applicant{totalApplicants !== 1 ? "s" : ""} across your organizations — view in Pending Members →
                        </button>
                    )}

                    {/* Create form */}
                    {showForm && (
                        <form onSubmit={handleCreate} className="p-4 rounded-lg border bg-background space-y-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Organization <span className="text-destructive">*</span></label>
                                <select
                                    name="organization_id"
                                    required
                                    defaultValue={organizations.length === 1 ? organizations[0].id : ""}
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="" disabled>Select organization…</option>
                                    {organizations.map((o) => (
                                        <option key={o.id} value={o.id}>{o.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Title <span className="text-destructive">*</span></label>
                                <input
                                    name="title"
                                    required
                                    placeholder="e.g. Looking for Event Committee Members"
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Description</label>
                                <textarea
                                    name="description"
                                    rows={2}
                                    placeholder="Brief description of what you're looking for…"
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                />
                            </div>
                            {error && <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</div>}
                            <button
                                type="submit"
                                disabled={creating}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {creating ? "Posting…" : "Post Request"}
                            </button>
                        </form>
                    )}

                    {/* Posts list */}
                    {recruitments.length === 0 ? (
                        <EmptyState icon="📢" message="No recruitment posts yet." />
                    ) : (
                        <div className="space-y-2">
                            {recruitments.map((post) => (
                                <div key={post.id} className="rounded-lg border p-4">
                                    {editingId === post.id ? (
                                        <form onSubmit={(e) => handleEdit(e, post)} className="space-y-3">
                                            <input
                                                name="title"
                                                required
                                                defaultValue={post.title}
                                                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                            <textarea
                                                name="description"
                                                rows={2}
                                                defaultValue={post.description || ""}
                                                className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                            />
                                            {error && <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</div>}
                                            <div className="flex gap-2">
                                                <button type="submit" disabled={isPending && actioningId === post.id} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
                                                    {isPending && actioningId === post.id ? "Saving…" : "Save"}
                                                </button>
                                                <button type="button" onClick={() => { setEditingId(null); setError(""); }} className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors">Cancel</button>
                                            </div>
                                        </form>
                                    ) : (
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-medium text-sm">{post.title}</h4>
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${post.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                                                        {post.is_active ? "Open" : "Closed"}
                                                    </span>
                                                </div>
                                                {post.description && <p className="text-xs text-muted-foreground mt-1">{post.description}</p>}
                                                <p className="text-[10px] text-muted-foreground mt-2">
                                                    {post.organizations?.name} · Posted {new Date(post.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0">
                                                <button onClick={() => { setEditingId(post.id); setError(""); }} className="px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors">Edit</button>
                                                {post.is_active ? (
                                                    <button onClick={() => runAction(post.id, () => closeRecruitment(post.id, post.organization_id))} disabled={isPending && actioningId === post.id} className="px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50">Close</button>
                                                ) : (
                                                    <button onClick={() => runAction(post.id, () => reopenRecruitment(post.id, post.organization_id))} disabled={isPending && actioningId === post.id} className="px-2.5 py-1.5 rounded-lg border border-green-300 text-green-700 text-xs font-medium hover:bg-green-50 transition-colors disabled:opacity-50">Reopen</button>
                                                )}
                                                <button
                                                    onClick={() => { if (confirm("Delete this recruitment post?")) runAction(post.id, () => deleteRecruitment(post.id, post.organization_id)); }}
                                                    disabled={isPending && actioningId === post.id}
                                                    className="px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
