"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { approveLeaveRequest, rejectLeaveRequest } from "@/lib/actions/organizations";
import { approveEvent, rejectEvent } from "@/lib/actions/events";
import { sendAnnouncement, createCategory, deleteCategory, verifyUserAccount, rejectUserAccount, createBulletinPost, bulkDeleteUsers, bulkVerifyUsers, bulkPromoteUsers, updateUserRole, deleteUser } from "@/lib/actions/admin";
import { getErrorMessage } from "@/lib/utils/error";

export interface MembershipRequest {
    id: string;
    user_id: string;
    organization_id: string;
    status: string;
    created_at: string;
    profiles: { full_name: string; email: string } | null;
    organizations: { name: string } | null;
}

export interface PendingEvent {
    id: string;
    title: string;
    description: string;
    start_datetime: string;
    location: string;
    status: string;
    organizations: { name: string } | null;
}

export interface PendingAccreditation {
    id: string;
    organization_id: string;
    status: string;
    submitted_at: string;
    organizations: { name: string } | null;
}



export interface Category {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

export interface Organization {
    id: string;
    name: string;
}

export interface LeaveRequest {
    id: string;
    user_id: string;
    organization_id: string;
    status: string;
    created_at: string;
    designated_approver_id: string | null;
    reviewed_at?: string | null;
    actioned_by_id?: string | null;
    profiles: { full_name: string; email: string } | null;
    organizations: { id: string; name: string } | null;
}

export interface PendingVerificationUser {
    id: string;
    email: string;
    full_name: string;
    account_status: string;
    created_at: string;
    students: {
        student_number: string;
        course: string | null;
        section: string | null;
        year_level: number;
    } | null;
}

export interface ManagementUser {
    id: string;
    email: string;
    full_name: string;
    role: string;
    account_status: string;
    created_at: string;
    students: {
        student_number: string;
        course: string | null;
        section: string | null;
        year_level: number;
    } | null;
}

interface AdminPanelClientProps {
    membershipRequests: MembershipRequest[];
    pendingEvents: PendingEvent[];
    pendingAccreditations: PendingAccreditation[];
    categories: Category[];
    organizations: Organization[];
    pendingLeaveRequests: LeaveRequest[];
    leaveHistory: LeaveRequest[];
    pendingVerificationUsers: PendingVerificationUser[];
    allUsers: ManagementUser[];
    totalUsersCount: number;
    stats: {
        totalUsers: number;
        totalOrgs: number;
        pendingMemberships: number;
        pendingEventsCount: number;
        pendingLeaveCount: number;
        pendingVerificationCount: number;
    };
}

type Tab = "roster" | "events" | "comms" | "config" | "verification" | "users";

const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "verification", label: "Verification", icon: "🆕" },
    { key: "users", label: "User Management", icon: "👤" },
    { key: "roster", label: "Organization & Roster", icon: "👥" },
    { key: "events", label: "Event Oversight", icon: "📅" },
    { key: "comms", label: "Communication", icon: "📢" },
    { key: "config", label: "Configuration", icon: "⚙️" },
];

export default function AdminPanelClient({
    membershipRequests,
    pendingEvents,
    pendingAccreditations,
    categories,
    organizations,
    pendingLeaveRequests,
    leaveHistory,
    pendingVerificationUsers,
    allUsers,
    totalUsersCount,
    stats,
}: AdminPanelClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = (searchParams.get("tab") as Tab) || "roster";
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [_isPending, _startTransition] = useTransition();

    const switchTab = (tab: Tab) => {
        setActiveTab(tab);
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", tab);
        router.replace(`/dashboard/admin?${next.toString()}`, { scroll: false });
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <StatCard icon="👤" label="Total Users" value={stats.totalUsers} color="bg-[#800000]/10" />
                <StatCard icon="🏢" label="Organizations" value={stats.totalOrgs} color="bg-[#C9A227]/10" />
                <StatCard icon="⏳" label="Pending Members" value={stats.pendingMemberships} color="bg-yellow-500/10" />
                <StatCard icon="📅" label="Pending Events" value={stats.pendingEventsCount} color="bg-blue-500/10" />
                <StatCard icon="🚪" label="Leave Requests" value={stats.pendingLeaveCount} color="bg-orange-500/10" />
                <StatCard icon="🆕" label="Pending Verification" value={stats.pendingVerificationCount} color="bg-green-500/10" />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-border">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                        let badgeCount = 0;
                        if (tab.key === "verification") badgeCount = stats.pendingVerificationCount;
                        if (tab.key === "roster") badgeCount = stats.pendingMemberships + pendingAccreditations.length;
                        if (tab.key === "events") badgeCount = stats.pendingEventsCount;
                        // For User Management, maybe leave requests?
                        if (tab.key === "users") badgeCount = stats.pendingLeaveCount;

                        return (
                            <button
                                key={tab.key}
                                onClick={() => switchTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                                }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                                {badgeCount > 0 && (
                                    <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                                        {badgeCount > 99 ? "99+" : badgeCount}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-scale-in">
                {activeTab === "verification" && (
                    <VerificationTab pendingUsers={pendingVerificationUsers} />
                )}
                {activeTab === "users" && (
                    <UserManagementTab users={allUsers} totalCount={totalUsersCount} />
                )}
                {activeTab === "roster" && (
                    <RosterTab
                        membershipRequests={membershipRequests}
                        pendingAccreditations={pendingAccreditations}
                        organizations={organizations}
                        pendingLeaveRequests={pendingLeaveRequests}
                        leaveHistory={leaveHistory}
                    />
                )}
                {activeTab === "events" && (
                    <EventsTab pendingEvents={pendingEvents} />
                )}
                {activeTab === "comms" && <CommsTab organizations={organizations} />}
                {activeTab === "config" && (
                    <ConfigTab categories={categories} />
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

/* ---------- Tab 1: Organization & Roster ---------- */
function RosterTab({
    membershipRequests,
    pendingAccreditations,
    organizations,
    pendingLeaveRequests,
    leaveHistory,
}: {
    membershipRequests: MembershipRequest[];
    pendingAccreditations: PendingAccreditation[];
    organizations: Organization[];
    pendingLeaveRequests: LeaveRequest[];
    leaveHistory: LeaveRequest[];
}) {
    return (
        <div className="space-y-6">
            {/* Membership Requests */}
            <MembershipRequestsSection
                organizations={organizations}
                membershipRequests={membershipRequests}
            />

            {/* Leave Requests */}
            <LeaveRequestsSection
                organizations={organizations}
                pendingLeaveRequests={pendingLeaveRequests}
                leaveHistory={leaveHistory}
            />

            {/* Club Onboarding / Accreditation */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#22543D]/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📑 Club Onboarding</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Organizations pending accreditation review</p>
                </div>
                <div className="p-4">
                    {pendingAccreditations.length === 0 ? (
                        <EmptyState icon="🎓" message="No pending accreditation applications." />
                    ) : (
                        <div className="space-y-2">
                            {pendingAccreditations.map((acc) => (
                                <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                    <div>
                                        <p className="text-sm font-medium">{acc.organizations?.name || "Unknown Org"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Submitted {new Date(acc.submitted_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <Link
                                        href="/dashboard/accreditation"
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-green-600/30 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                                    >
                                        Review →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

/* ---------- Membership Requests Section ---------- */
function MembershipRequestsSection({
    organizations,
    membershipRequests,
}: {
    organizations: Organization[];
    membershipRequests: MembershipRequest[];
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeOrg = searchParams.get("org") || "all";
    const [searchText, setSearchText] = useState("");

    const filteredRequests = membershipRequests.filter((req) => {
        const matchSearch =
            !searchText ||
            req.profiles?.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
            req.organizations?.name?.toLowerCase().includes(searchText.toLowerCase());
        const matchOrg = activeOrg === "all" || req.organization_id === activeOrg;
        return matchSearch && matchOrg;
    });

    const activeOrgName = activeOrg === "all"
        ? "All Organizations"
        : organizations.find((o) => o.id === activeOrg)?.name || "Unknown";

    function setOrgFilter(orgId: string) {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", "roster");
        if (orgId === "all") {
            next.delete("org");
        } else {
            next.set("org", orgId);
        }
        router.replace(`/dashboard/admin?${next.toString()}`, { scroll: false });
        router.refresh();
    }

    return (
        <section className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                <h3 className="font-semibold text-foreground">📋 Membership Requests</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Approve or reject pending join requests</p>
            </div>
            
            <div className="p-4 space-y-4">
                {/* Search & Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by student or organization..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pl-8"
                        />
                        <span className="absolute left-2.5 top-2.5 text-muted-foreground text-sm">🔍</span>
                    </div>
                    <select
                        value={activeOrg}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
                    >
                        <option value="all">All Organizations</option>
                        {organizations.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                </div>

                {activeOrg !== "all" && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-[#800000]/10 text-[#800000] font-medium">
                            Filtering: {activeOrgName}
                        </span>
                        <button
                            onClick={() => setOrgFilter("all")}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ✕ Clear
                        </button>
                    </div>
                )}

                {/* List */}
                {filteredRequests.length === 0 ? (
                    <EmptyState icon="✅" message="No pending membership requests." />
                ) : (
                    <div className="space-y-2">
                        {filteredRequests.map((req) => (
                            <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{req.profiles?.full_name || "Unknown"}</p>
                                    <p className="text-xs text-muted-foreground">
                                        Wants to join <span className="font-medium">{req.organizations?.name}</span>
                                        {" · "}{new Date(req.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex gap-2 shrink-0 ml-3">
                                    <Link
                                        href={`/dashboard/organizations/${req.organization_id}/members`}
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary/30 text-primary hover:bg-primary/5 transition-colors"
                                    >
                                        Review →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ---------- Leave Requests Section ---------- */
function LeaveRequestsSection({
    organizations,
    pendingLeaveRequests,
    leaveHistory,
}: {
    organizations: Organization[];
    pendingLeaveRequests: LeaveRequest[];
    leaveHistory: LeaveRequest[];
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeOrg = searchParams.get("org") || "all";
    const [searchText, setSearchText] = useState("");
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const filteredPending = pendingLeaveRequests.filter((req) => {
        const matchSearch =
            !searchText ||
            req.profiles?.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
            req.organizations?.name?.toLowerCase().includes(searchText.toLowerCase());
        return matchSearch;
    });

    const filteredHistory = leaveHistory.filter((req) => {
        const matchSearch =
            !searchText ||
            req.profiles?.full_name?.toLowerCase().includes(searchText.toLowerCase()) ||
            req.organizations?.name?.toLowerCase().includes(searchText.toLowerCase());
        return matchSearch;
    });

    function setOrgFilter(orgId: string) {
        const next = new URLSearchParams(searchParams.toString());
        next.set("tab", "roster");
        if (orgId === "all") {
            next.delete("org");
        } else {
            next.set("org", orgId);
        }
        router.replace(`/dashboard/admin?${next.toString()}`, { scroll: false });
        router.refresh();
    }

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

    const activeOrgName = activeOrg === "all"
        ? "All Organizations"
        : organizations.find((o) => o.id === activeOrg)?.name || "Unknown";

    return (
        <section className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-orange-500/5 to-transparent">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">🚪 Leave Requests</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Review and process member leave requests
                        </p>
                    </div>
                    {leaveHistory.length > 0 && (
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {showHistory ? "Hide History" : "Show History"}
                        </button>
                    )}
                </div>
            </div>

            <div className="p-4 space-y-4">
                {/* Organization Filter & Search */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search by student or organization..."
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 pl-8"
                        />
                        <span className="absolute left-2.5 top-2.5 text-muted-foreground text-sm">🔍</span>
                    </div>
                    <select
                        value={activeOrg}
                        onChange={(e) => setOrgFilter(e.target.value)}
                        className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[200px]"
                    >
                        <option value="all">All Organizations</option>
                        {organizations.map((org) => (
                            <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                    </select>
                </div>

                {activeOrg !== "all" && (
                    <div className="flex items-center gap-2 text-xs">
                        <span className="px-2 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 font-medium">
                            Filtering: {activeOrgName}
                        </span>
                        <button
                            onClick={() => setOrgFilter("all")}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ✕ Clear
                        </button>
                    </div>
                )}

                {/* Pending Leave Requests */}
                {filteredPending.length === 0 ? (
                    <EmptyState icon="✅" message="No pending leave requests." />
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Pending ({filteredPending.length})
                        </p>
                        {filteredPending.map((req) => (
                            <div
                                key={req.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {req.profiles?.full_name || "Unknown"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Wants to leave{" "}
                                        <span className="font-medium">
                                            {req.organizations?.name || "Unknown Org"}
                                        </span>
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
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                    >
                                        {isPending && actioningId === req.id ? "..." : "Reject"}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Leave Request History */}
                {showHistory && filteredHistory.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            History ({filteredHistory.length})
                        </p>
                        {filteredHistory.map((req) => (
                            <div
                                key={req.id}
                                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {req.profiles?.full_name || "Unknown"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Left{" "}
                                        <span className="font-medium">
                                            {req.organizations?.name || "Unknown Org"}
                                        </span>
                                        {req.reviewed_at && (
                                            <> · {new Date(req.reviewed_at).toLocaleDateString()}</>
                                        )}
                                    </p>
                                </div>
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                                        req.status === "approved"
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                    }`}
                                >
                                    {req.status === "approved" ? "Approved" : "Rejected"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}

/* ---------- Tab 2: Event Oversight ---------- */
function EventsTab({ pendingEvents }: { pendingEvents: PendingEvent[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);

    function handleApprove(eventId: string) {
        setActioningId(eventId);
        startTransition(async () => {
            try {
                await approveEvent(eventId);
                router.refresh();
            } catch (err) {
                console.error("Approve event failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    function handleReject(eventId: string) {
        setActioningId(eventId);
        startTransition(async () => {
            try {
                await rejectEvent(eventId);
                router.refresh();
            } catch (err) {
                console.error("Reject event failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#2B6CB0]/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📅 Event Moderation</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Approve or reject pending event submissions</p>
                </div>
                <div className="p-4">
                    {pendingEvents.length === 0 ? (
                        <EmptyState icon="🎉" message="No pending events to review." />
                    ) : (
                        <div className="space-y-2">
                            {pendingEvents.map((ev) => (
                                <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{ev.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {ev.organizations?.name} · {ev.location}
                                            {" · "}{new Date(ev.start_datetime).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2 shrink-0 ml-3">
                                        <button
                                            onClick={() => handleApprove(ev.id)}
                                            disabled={isPending && actioningId === ev.id}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                        >
                                            {isPending && actioningId === ev.id ? "..." : "Approve"}
                                        </button>
                                        <button
                                            onClick={() => handleReject(ev.id)}
                                            disabled={isPending && actioningId === ev.id}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

/* ---------- Tab 3: Communication ---------- */
function CommsTab({ organizations }: { organizations: Organization[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    function handleSend(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");
        setSuccess("");
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                const result = await sendAnnouncement(formData);
                setSuccess(`Announcement sent to ${result.count} user(s).`);
                (e.target as HTMLFormElement).reset();
                router.refresh();
            } catch (err) {
                setError(getErrorMessage(err));
            }
        });
    }

    const [bulletinError, setBulletinError] = useState("");
    const [bulletinSuccess, setBulletinSuccess] = useState("");

    function handleBulletin(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setBulletinError("");
        setBulletinSuccess("");
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await createBulletinPost(formData);
                setBulletinSuccess("Bulletin post created successfully!");
                (e.target as HTMLFormElement).reset();
                router.refresh();
            } catch (err) {
                setBulletinError(getErrorMessage(err));
            }
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#C9A227]/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📢 Mass Announcement</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Send notifications to users platform-wide or to a specific organization</p>
                </div>
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">{success}</div>
                    )}
                    <form onSubmit={handleSend} className="space-y-4 max-w-lg">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Target Audience</label>
                            <select
                                name="target"
                                required
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                                <option value="all">All Users</option>
                                {organizations.map((org) => (
                                    <option key={org.id} value={org.id}>
                                        {org.name} (Members & Followers)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Title <span className="text-destructive">*</span>
                            </label>
                            <input
                                name="title"
                                required
                                placeholder="Announcement title"
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                Message <span className="text-destructive">*</span>
                            </label>
                            <textarea
                                name="message"
                                required
                                rows={4}
                                placeholder="Write your announcement message..."
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-6 py-2.5 rounded-lg bg-[#C9A227] text-[#2B2B2B] text-sm font-semibold hover:bg-[#C9A227]/90 transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Sending..." : "📢 Send Announcement"}
                        </button>
                    </form>
                </div>
            </section>

            {/* Bulletin Board Post */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📌 Post to Bulletin Board</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Create a pinned or featured announcement visible on the Bulletin Board</p>
                </div>
                <div className="p-6">
                    {bulletinError && (
                        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{bulletinError}</div>
                    )}
                    {bulletinSuccess && (
                        <div className="mb-4 p-3 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm">✓ {bulletinSuccess}</div>
                    )}
                    <form onSubmit={handleBulletin} className="space-y-4 max-w-lg">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Type <span className="text-destructive">*</span></label>
                                <select
                                    name="bulletin_type"
                                    required
                                    className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                >
                                    <option value="system">📣 System</option>
                                    <option value="special">⭐ Special</option>
                                </select>
                            </div>
                            <div className="flex items-end">
                                <label className="flex items-center gap-2 cursor-pointer pb-2">
                                    <input type="checkbox" name="bulletin_pinned" className="w-4 h-4 accent-[#800000]" />
                                    <span className="text-sm font-medium">Pin to top</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Title <span className="text-destructive">*</span></label>
                            <input
                                name="bulletin_title"
                                required
                                placeholder="Bulletin title..."
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Body</label>
                            <textarea
                                name="bulletin_body"
                                rows={3}
                                placeholder="Optional message body..."
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Expires At (optional)</label>
                            <input
                                type="datetime-local"
                                name="bulletin_expires_at"
                                className="w-full px-3 py-2.5 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-6 py-2.5 rounded-lg bg-[#800000] text-white text-sm font-semibold hover:bg-[#600000] transition-colors disabled:opacity-50"
                        >
                            {isPending ? "Posting..." : "📌 Post to Bulletin Board"}
                        </button>
                    </form>
                </div>
            </section>

        </div>
    );
}

/* ---------- Tab 4: Configuration ---------- */
function ConfigTab({ categories }: { categories: Category[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showCatForm, setShowCatForm] = useState(false);
    const [catError, setCatError] = useState("");
    const [deletingId, setDeletingId] = useState<string | null>(null);

    function handleCreateCategory(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setCatError("");
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
            try {
                await createCategory(formData);
                setShowCatForm(false);
                router.refresh();
            } catch (err) {
                setCatError(getErrorMessage(err));
            }
        });
    }

    function handleDeleteCategory(categoryId: string) {
        setDeletingId(categoryId);
        startTransition(async () => {
            try {
                await deleteCategory(categoryId);
                router.refresh();
            } catch (err) {
                setCatError(getErrorMessage(err));
            } finally {
                setDeletingId(null);
            }
        });
    }

    return (
        <div className="space-y-6">
            {/* Category Management */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-foreground">🏷️ Organization Categories</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Manage categories for classifying organizations</p>
                    </div>
                    <button
                        onClick={() => setShowCatForm(!showCatForm)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                        {showCatForm ? "Cancel" : "+ Create"}
                    </button>
                </div>
                <div className="p-4">
                    {catError && (
                        <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">{catError}</div>
                    )}

                    {showCatForm && (
                        <form onSubmit={handleCreateCategory} className="mb-4 p-4 rounded-lg border bg-background space-y-3">
                            <div>
                                <label className="block text-xs font-medium mb-1">Name <span className="text-destructive">*</span></label>
                                <input
                                    name="name"
                                    required
                                    placeholder="e.g. Academic, Sports, Cultural"
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1">Description</label>
                                <input
                                    name="description"
                                    placeholder="Brief description (optional)"
                                    className="w-full px-3 py-2 rounded-lg border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isPending}
                                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                {isPending ? "Creating..." : "Create Category"}
                            </button>
                        </form>
                    )}

                    {categories.length === 0 ? (
                        <EmptyState icon="🏷️" message="No categories defined yet. Create one to start organizing." />
                    ) : (
                        <div className="space-y-2">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                    <div>
                                        <p className="text-sm font-medium">{cat.name}</p>
                                        {cat.description && (
                                            <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(cat.created_at).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteCategory(cat.id)}
                                            disabled={isPending && deletingId === cat.id}
                                            className="px-2 py-1 text-[10px] font-semibold rounded border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                        >
                                            {isPending && deletingId === cat.id ? "..." : "Delete"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

/* ---------- Verification Tab ---------- */
function VerificationTab({ pendingUsers }: { pendingUsers: PendingVerificationUser[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);

    function handleVerify(userId: string) {
        setActioningId(userId);
        startTransition(async () => {
            try {
                await verifyUserAccount(userId);
                router.refresh();
            } catch (err) {
                console.error("Verify failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    function handleReject(userId: string) {
        setActioningId(userId);
        startTransition(async () => {
            try {
                await rejectUserAccount(userId);
                router.refresh();
            } catch (err) {
                console.error("Reject failed:", getErrorMessage(err));
            } finally {
                setActioningId(null);
            }
        });
    }

    return (
        <div className="space-y-6">
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-green-500/5 to-transparent">
                    <h3 className="font-semibold text-foreground">🆕 Pending Account Verification</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Review and verify new student accounts</p>
                </div>
                <div className="p-4">
                    {pendingUsers.length === 0 ? (
                        <EmptyState icon="✅" message="No accounts pending verification." />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-xs text-muted-foreground uppercase tracking-wider">
                                        <th className="pb-3 pr-4 font-medium">Name</th>
                                        <th className="pb-3 pr-4 font-medium">Email</th>
                                        <th className="pb-3 pr-4 font-medium">Student #</th>
                                        <th className="pb-3 pr-4 font-medium">Course</th>
                                        <th className="pb-3 pr-4 font-medium">Year</th>
                                        <th className="pb-3 pr-4 font-medium">Section</th>
                                        <th className="pb-3 pr-4 font-medium">Registered</th>
                                        <th className="pb-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {pendingUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3 pr-4 font-medium">{user.full_name}</td>
                                            <td className="py-3 pr-4 text-muted-foreground text-xs">{user.email}</td>
                                            <td className="py-3 pr-4 text-xs font-mono">{user.students?.student_number || "—"}</td>
                                            <td className="py-3 pr-4 text-xs">{user.students?.course || "—"}</td>
                                            <td className="py-3 pr-4 text-xs">{user.students?.year_level ? `${user.students.year_level}${user.students.year_level === 1 ? 'st' : user.students.year_level === 2 ? 'nd' : user.students.year_level === 3 ? 'rd' : 'th'} Year` : "—"}</td>
                                            <td className="py-3 pr-4 text-xs">{user.students?.section || "—"}</td>
                                            <td className="py-3 pr-4 text-xs text-muted-foreground">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <button
                                                        onClick={() => handleVerify(user.id)}
                                                        disabled={isPending && actioningId === user.id}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isPending && actioningId === user.id ? "..." : "✓ Verify"}
                                                    </button>
                                                    <button
                                                        onClick={() => handleReject(user.id)}
                                                        disabled={isPending && actioningId === user.id}
                                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                                    >
                                                        {isPending && actioningId === user.id ? "..." : "✗ Reject"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

/* ---------- Shared ---------- */
function EmptyState({ icon, message }: { icon: string; message: string }) {
    return (
        <div className="py-8 text-center">
            <span className="text-3xl block mb-2">{icon}</span>
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Tab 6: User Management (Task 17)
───────────────────────────────────────────────────────────────*/
function ConfirmDeleteModal({
    isOpen,
    count,
    onConfirm,
    onCancel,
}: {
    isOpen: boolean;
    count: number;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-card rounded-2xl border shadow-2xl p-6 max-w-sm w-full mx-4 animate-scale-in">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">⚠️</span>
                </div>
                <h3 className="text-lg font-bold text-center">Confirm Deletion</h3>
                <p className="text-sm text-muted-foreground text-center mt-2">
                    You are about to <strong className="text-foreground">permanently delete {count} user{count !== 1 ? "s" : ""}</strong>.
                </p>
                <p className="text-sm text-destructive font-semibold text-center mt-2">
                    This action cannot be undone. All user data, memberships, and auth credentials will be removed.
                </p>
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        Delete {count} User{count !== 1 ? "s" : ""}
                    </button>
                </div>
            </div>
        </div>
    );
}

function UserManagementTab({
    users: initialUsers,
    totalCount,
}: {
    users: ManagementUser[];
    totalCount: number;
}) {
    const [users, setUsers] = useState<ManagementUser[]>(initialUsers);
    const [loaded, setLoaded] = useState(initialUsers.length);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");
    const [filterYear, setFilterYear] = useState("all");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [actionSuccess, setActionSuccess] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [loadingMore, setLoadingMore] = useState(false);

    // Derive available year batches from student_numbers (prefix like "2023-...")
    const yearBatches = Array.from(
        new Set(
            users
                .map((u) => u.students?.student_number?.split("-")[0])
                .filter(Boolean)
        )
    ).sort().reverse() as string[];

    const filtered = users.filter((u) => {
        const matchSearch =
            !search ||
            u.full_name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase()) ||
            u.students?.student_number?.toLowerCase().includes(search.toLowerCase());
        const matchRole = filterRole === "all" || u.role === filterRole;
        const matchStatus = filterStatus === "all" || u.account_status === filterStatus;
        const matchYear =
            filterYear === "all" ||
            u.students?.student_number?.startsWith(filterYear);
        return matchSearch && matchRole && matchStatus && matchYear;
    });

    const allOnPageSelected = filtered.length > 0 && filtered.every((u) => selected.has(u.id));

    function toggleAll() {
        if (allOnPageSelected) {
            setSelected((prev) => {
                const next = new Set(prev);
                filtered.forEach((u) => next.delete(u.id));
                return next;
            });
        } else {
            setSelected((prev) => {
                const next = new Set(prev);
                filtered.forEach((u) => next.add(u.id));
                return next;
            });
        }
    }

    function toggleOne(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }

    function clearFeedback() {
        setActionError(null);
        setActionSuccess(null);
    }

    function handleBulkVerify() {
        clearFeedback();
        startTransition(async () => {
            try {
                await bulkVerifyUsers(Array.from(selected));
                setActionSuccess(`Verified ${selected.size} user(s).`);
                setSelected(new Set());
            } catch (e) {
                setActionError(getErrorMessage(e));
            }
        });
    }

    function handleBulkPromote(role: "student" | "admin") {
        clearFeedback();
        startTransition(async () => {
            try {
                await bulkPromoteUsers(Array.from(selected), role);
                setActionSuccess(`${selected.size} user(s) promoted to ${role}.`);
                setSelected(new Set());
            } catch (e) {
                setActionError(getErrorMessage(e));
            }
        });
    }

    function handleBulkDeleteConfirmed() {
        setShowDeleteModal(false);
        clearFeedback();
        const ids = Array.from(selected);
        startTransition(async () => {
            try {
                await bulkDeleteUsers(ids);
                setUsers((prev) => prev.filter((u) => !ids.includes(u.id)));
                setLoaded((prev) => prev - ids.length);
                setActionSuccess(`Deleted ${ids.length} user(s).`);
                setSelected(new Set());
            } catch (e) {
                setActionError(getErrorMessage(e));
            }
        });
    }

    function handleSingleDelete(userId: string) {
        clearFeedback();
        startTransition(async () => {
            try {
                await deleteUser(userId);
                setUsers((prev) => prev.filter((u) => u.id !== userId));
                setLoaded((prev) => prev - 1);
                setActionSuccess("User deleted.");
                setSelected((prev) => { const n = new Set(prev); n.delete(userId); return n; });
            } catch (e) {
                setActionError(getErrorMessage(e));
            }
        });
    }

    function handleRoleChange(userId: string, role: "student" | "admin") {
        clearFeedback();
        startTransition(async () => {
            try {
                await updateUserRole(userId, role);
                setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
                setActionSuccess("Role updated.");
            } catch (e) {
                setActionError(getErrorMessage(e));
            }
        });
    }

    async function handleLoadMore() {
        setLoadingMore(true);
        try {
            const { fetchAllUsers } = await import("@/lib/actions/admin");
            const { users: more } = await fetchAllUsers(loaded, 200);
            const normalized = (more as unknown[]).map((u) => {
                const item = u as ManagementUser & { students: ManagementUser["students"] | ManagementUser["students"][] };
                return {
                    ...item,
                    students: Array.isArray(item.students) ? item.students[0] : item.students,
                };
            }) as ManagementUser[];
            setUsers((prev) => [...prev, ...normalized]);
            setLoaded((prev) => prev + normalized.length);
        } catch (e) {
            setActionError(getErrorMessage(e));
        } finally {
            setLoadingMore(false);
        }
    }

    const roleBadge = (role: string) => {
        const map: Record<string, string> = {
            admin: "bg-[#800000]/10 text-[#800000] dark:bg-[#800000]/20",
            officer: "bg-[#C9A227]/10 text-[#C9A227] dark:bg-[#C9A227]/20",
            student: "bg-muted text-muted-foreground",
        };
        return map[role] || "bg-muted text-muted-foreground";
    };

    const statusBadge = (status: string) => {
        const map: Record<string, string> = {
            verified: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
            pending_verification: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
            rejected: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
        };
        return map[status] || "bg-muted text-muted-foreground";
    };

    return (
        <div className="space-y-4">
            <ConfirmDeleteModal
                isOpen={showDeleteModal}
                count={selected.size}
                onConfirm={handleBulkDeleteConfirmed}
                onCancel={() => setShowDeleteModal(false)}
            />

            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h3 className="font-semibold text-foreground">👤 User Management</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {loaded} loaded of {totalCount} total users
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-4 border-b flex flex-wrap gap-3">
                    <input
                        type="search"
                        placeholder="Search by name, email, or student number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 min-w-[180px] h-9 rounded-lg border px-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="h-9 rounded-lg border px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Roles</option>
                        <option value="student">Student</option>
                        <option value="admin">Admin</option>
                    </select>
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="h-9 rounded-lg border px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        <option value="all">All Statuses</option>
                        <option value="verified">Verified</option>
                        <option value="pending_verification">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    {yearBatches.length > 0 && (
                        <select
                            value={filterYear}
                            onChange={(e) => setFilterYear(e.target.value)}
                            className="h-9 rounded-lg border px-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            <option value="all">All Year Batches</option>
                            {yearBatches.map((y) => (
                                <option key={y} value={y}>{y} Batch</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Bulk Actions */}
                {selected.size > 0 && (
                    <div className="px-6 py-3 border-b bg-primary/5 flex items-center gap-3 flex-wrap">
                        <span className="text-sm font-medium text-primary">{selected.size} selected</span>
                        <button
                            onClick={handleBulkVerify}
                            disabled={isPending}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:opacity-80 transition-opacity disabled:opacity-50"
                        >
                            ✓ Verify All
                        </button>
                        <select
                            onChange={(e) => { if (e.target.value) handleBulkPromote(e.target.value as "student" | "admin"); e.target.value = ""; }}
                            disabled={isPending}
                            className="h-7 rounded-lg border px-2 text-xs bg-background focus:outline-none"
                        >
                            <option value="">Set Role...</option>
                            <option value="student">→ Student</option>
                            <option value="admin">→ Admin</option>
                        </select>
                        <button
                            onClick={() => setShowDeleteModal(true)}
                            disabled={isPending}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-50"
                        >
                            🗑 Delete Selected
                        </button>
                        <button
                            onClick={() => setSelected(new Set())}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                        >
                            Clear selection
                        </button>
                    </div>
                )}

                {/* Feedback */}
                {actionError && (
                    <div className="px-6 py-2 text-sm text-destructive bg-destructive/5 border-b">{actionError}</div>
                )}
                {actionSuccess && (
                    <div className="px-6 py-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-b">{actionSuccess}</div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    {filtered.length === 0 ? (
                        <EmptyState icon="👤" message="No users match your filters." />
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="py-3 pl-6 pr-2 text-left w-10">
                                        <input
                                            type="checkbox"
                                            checked={allOnPageSelected}
                                            onChange={toggleAll}
                                            className="rounded"
                                        />
                                    </th>
                                    <th className="py-3 px-3 text-left">User</th>
                                    <th className="py-3 px-3 text-left hidden md:table-cell">Student No.</th>
                                    <th className="py-3 px-3 text-left hidden lg:table-cell">Program Info</th>
                                    <th className="py-3 px-3 text-left">Role</th>
                                    <th className="py-3 px-3 text-left">Status</th>
                                    <th className="py-3 px-3 text-left hidden lg:table-cell">Joined</th>
                                    <th className="py-3 pr-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {filtered.map((u) => (
                                    <tr key={u.id} className={`hover:bg-accent/30 transition-colors ${selected.has(u.id) ? "bg-primary/5" : ""}`}>
                                        <td className="py-3 pl-6 pr-2">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(u.id)}
                                                onChange={() => toggleOne(u.id)}
                                                className="rounded"
                                            />
                                        </td>
                                        <td className="py-3 px-3">
                                            <p className="font-medium text-foreground truncate max-w-[160px]">{u.full_name}</p>
                                            <p className="text-xs text-muted-foreground truncate max-w-[160px]">{u.email}</p>
                                        </td>
                                        <td className="py-3 px-3 hidden md:table-cell">
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {u.students?.student_number || "—"}
                                            </p>
                                        </td>
                                        <td className="py-3 px-3 hidden lg:table-cell">
                                            {u.students ? (
                                                <div className="text-xs">
                                                    <span className="font-semibold">{u.students.course || "—"}</span>
                                                    <span className="text-muted-foreground ml-1">
                                                        ({u.students.year_level ? `${u.students.year_level}${u.students.year_level === 1 ? 'st' : u.students.year_level === 2 ? 'nd' : u.students.year_level === 3 ? 'rd' : 'th'} Yr` : "—"} - {u.students.section || "—"})
                                                    </span>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">—</p>
                                            )}
                                        </td>
                                        <td className="py-3 px-3">
                                            <select
                                                value={u.role}
                                                onChange={(e) => handleRoleChange(u.id, e.target.value as "student" | "admin")}
                                                disabled={isPending}
                                                className={`text-xs font-semibold px-2 py-0.5 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${roleBadge(u.role)}`}
                                            >
                                                <option value="student">student</option>
                                                <option value="admin">admin</option>
                                            </select>
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${statusBadge(u.account_status)}`}>
                                                {u.account_status === "pending_verification" ? "Pending" :
                                                    u.account_status === "verified" ? "Verified" : "Rejected"}
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 hidden lg:table-cell">
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                        </td>
                                        <td className="py-3 pr-6 text-right">
                                            <button
                                                onClick={() => handleSingleDelete(u.id)}
                                                disabled={isPending}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-destructive bg-destructive/10 hover:bg-destructive hover:text-destructive-foreground transition-colors disabled:opacity-50"
                                                title="Delete user"
                                            >
                                                🗑 Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Load More */}
                {loaded < totalCount && (
                    <div className="px-6 py-4 border-t text-center">
                        <button
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                            className="px-5 py-2 rounded-lg border text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? "Loading..." : `Load More (${totalCount - loaded} remaining)`}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
}

