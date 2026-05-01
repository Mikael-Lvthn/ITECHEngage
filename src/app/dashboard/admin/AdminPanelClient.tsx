"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { approveLeaveRequest, rejectLeaveRequest } from "@/lib/actions/organizations";
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
    created_at: string;
    organizations: { name: string } | null;
}

export interface AuditLogEntry {
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: unknown;
    created_at: string;
    profiles: { full_name: string } | null;
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

interface AdminPanelClientProps {
    membershipRequests: MembershipRequest[];
    pendingEvents: PendingEvent[];
    pendingAccreditations: PendingAccreditation[];
    auditLogs: AuditLogEntry[];
    categories: Category[];
    organizations: Organization[];
    pendingLeaveRequests: LeaveRequest[];
    leaveHistory: LeaveRequest[];
    stats: {
        totalUsers: number;
        totalOrgs: number;
        pendingMemberships: number;
        pendingEventsCount: number;
        pendingLeaveCount: number;
    };
}

type Tab = "roster" | "events" | "comms" | "config";

const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: "roster", label: "Organization & Roster", icon: "👥" },
    { key: "events", label: "Event Oversight", icon: "📅" },
    { key: "comms", label: "Communication", icon: "📢" },
    { key: "config", label: "Configuration", icon: "⚙️" },
];

export default function AdminPanelClient({
    membershipRequests,
    pendingEvents,
    pendingAccreditations,
    auditLogs,
    categories,
    organizations,
    pendingLeaveRequests,
    leaveHistory,
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatCard icon="👤" label="Total Users" value={stats.totalUsers} color="bg-[#800000]/10" />
                <StatCard icon="🏢" label="Organizations" value={stats.totalOrgs} color="bg-[#C9A227]/10" />
                <StatCard icon="⏳" label="Pending Members" value={stats.pendingMemberships} color="bg-yellow-500/10" />
                <StatCard icon="📅" label="Pending Events" value={stats.pendingEventsCount} color="bg-blue-500/10" />
                <StatCard icon="🚪" label="Leave Requests" value={stats.pendingLeaveCount} color="bg-orange-500/10" />
            </div>

            {/* Tab Navigation */}
            <div className="border-b border-border">
                <div className="flex gap-1 overflow-x-auto">
                    {tabs.map((tab) => (
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
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="animate-scale-in">
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
                {activeTab === "comms" && <CommsTab />}
                {activeTab === "config" && (
                    <ConfigTab auditLogs={auditLogs} categories={categories} />
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
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📋 Membership Requests</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Approve or reject pending join requests</p>
                </div>
                <div className="p-4">
                    {membershipRequests.length === 0 ? (
                        <EmptyState icon="✅" message="No pending membership requests." />
                    ) : (
                        <div className="space-y-2">
                            {membershipRequests.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
                                    <div>
                                        <p className="text-sm font-medium">{req.profiles?.full_name || "Unknown"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Wants to join <span className="font-medium">{req.organizations?.name}</span>
                                            {" · "}{new Date(req.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
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
                                            Submitted {new Date(acc.created_at).toLocaleDateString()}
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
    const [orgSearchText, setOrgSearchText] = useState("");
    const [isPending, startTransition] = useTransition();
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const filteredOrgs = organizations.filter((o) =>
        o.name.toLowerCase().includes(orgSearchText.toLowerCase())
    );

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
                {/* Organization Filter */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <input
                            type="text"
                            placeholder="Search organizations..."
                            value={orgSearchText}
                            onChange={(e) => setOrgSearchText(e.target.value)}
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
                        {filteredOrgs.map((org) => (
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
                {pendingLeaveRequests.length === 0 ? (
                    <EmptyState icon="✅" message="No pending leave requests." />
                ) : (
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Pending ({pendingLeaveRequests.length})
                        </p>
                        {pendingLeaveRequests.map((req) => (
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
                {showHistory && leaveHistory.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            History ({leaveHistory.length})
                        </p>
                        {leaveHistory.map((req) => (
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
                                    <Link
                                        href="/dashboard/news-and-events"
                                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-blue-600/30 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors shrink-0 ml-3"
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

/* ---------- Tab 3: Communication (Shell) ---------- */
function CommsTab() {
    return (
        <div className="space-y-6">
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#C9A227]/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📢 Mass Outreach</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Send announcements to users platform-wide</p>
                </div>
                <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-[#C9A227]/10 flex items-center justify-center mb-4">
                        <span className="text-3xl">📨</span>
                    </div>
                    <p className="font-semibold text-foreground mb-1">Coming Soon</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Mass notification broadcasting to all users, specific organizations, or officer groups will be available in a future update.
                    </p>
                    {/* TODO: wire up when infrastructure is available */}
                </div>
            </section>

            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-purple-500/5 to-transparent">
                    <h3 className="font-semibold text-foreground">🔗 Resource Coordination</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Shared resources and document management</p>
                </div>
                <div className="p-12 text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                        <span className="text-3xl">📁</span>
                    </div>
                    <p className="font-semibold text-foreground mb-1">Coming Soon</p>
                    <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        Centralized resource sharing and document coordination across organizations will be available in a future update.
                    </p>
                    {/* TODO: wire up when infrastructure is available */}
                </div>
            </section>
        </div>
    );
}

/* ---------- Tab 4: Configuration ---------- */
function ConfigTab({ auditLogs, categories }: { auditLogs: AuditLogEntry[]; categories: Category[] }) {
    return (
        <div className="space-y-6">
            {/* Category Management */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent">
                    <h3 className="font-semibold text-foreground">🏷️ Organization Categories</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage categories for classifying organizations</p>
                </div>
                <div className="p-4">
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
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(cat.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Audit Logs */}
            <section className="rounded-xl border bg-card overflow-hidden">
                <div className="px-6 py-4 border-b bg-gradient-to-r from-gray-500/5 to-transparent">
                    <h3 className="font-semibold text-foreground">📝 Audit Logs</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Recent system activity and changes</p>
                </div>
                <div className="p-4">
                    {auditLogs.length === 0 ? (
                        <EmptyState icon="📝" message="No audit log entries yet. Activity will be recorded as actions occur." />
                    ) : (
                        <div className="space-y-2">
                            {auditLogs.map((log) => (
                                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-xs">📋</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm">
                                            <span className="font-medium">{log.profiles?.full_name || "System"}</span>
                                            {" "}<span className="text-muted-foreground">{log.action}</span>
                                            {" on "}<span className="font-medium">{log.entity_type}</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {new Date(log.created_at).toLocaleString()}
                                        </p>
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

/* ---------- Shared ---------- */
function EmptyState({ icon, message }: { icon: string; message: string }) {
    return (
        <div className="py-8 text-center">
            <span className="text-3xl block mb-2">{icon}</span>
            <p className="text-sm text-muted-foreground">{message}</p>
        </div>
    );
}
