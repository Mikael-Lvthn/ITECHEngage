"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

interface MembershipRequest {
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
    description: string;
    start_datetime: string;
    location: string;
    status: string;
    organizations: { name: string } | null;
}

interface PendingAccreditation {
    id: string;
    organization_id: string;
    status: string;
    created_at: string;
    organizations: { name: string } | null;
}

interface AuditLogEntry {
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: any;
    created_at: string;
    profiles: { full_name: string } | null;
}

interface Category {
    id: string;
    name: string;
    description: string | null;
    created_at: string;
}

interface AdminPanelClientProps {
    membershipRequests: MembershipRequest[];
    pendingEvents: PendingEvent[];
    pendingAccreditations: PendingAccreditation[];
    auditLogs: AuditLogEntry[];
    categories: Category[];
    stats: {
        totalUsers: number;
        totalOrgs: number;
        pendingMemberships: number;
        pendingEventsCount: number;
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
    stats,
}: AdminPanelClientProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const initialTab = (searchParams.get("tab") as Tab) || "roster";
    const [activeTab, setActiveTab] = useState<Tab>(initialTab);
    const [isPending, startTransition] = useTransition();

    const switchTab = (tab: Tab) => {
        setActiveTab(tab);
        router.replace(`/dashboard/admin?tab=${tab}`, { scroll: false });
    };

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard icon="👤" label="Total Users" value={stats.totalUsers} color="bg-[#800000]/10" />
                <StatCard icon="🏢" label="Organizations" value={stats.totalOrgs} color="bg-[#C9A227]/10" />
                <StatCard icon="⏳" label="Pending Members" value={stats.pendingMemberships} color="bg-yellow-500/10" />
                <StatCard icon="📅" label="Pending Events" value={stats.pendingEventsCount} color="bg-blue-500/10" />
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
}: {
    membershipRequests: MembershipRequest[];
    pendingAccreditations: PendingAccreditation[];
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
