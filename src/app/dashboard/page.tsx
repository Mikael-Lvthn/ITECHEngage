import Link from "next/link";
import { redirect } from "next/navigation";
import {
    Building2,
    Newspaper,
    Vote,
    Users,
    CalendarDays,
    FileCheck2,
    Settings,
    Star,
    Award,
    Medal,
    Trophy,
    ClipboardList,
    Pin,
    ChevronRight,
    type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const typeIcon: Record<string, LucideIcon> = {
    membership: Users,
    officer_role: Award,
    event_attended: CalendarDays,
    election_winner: Trophy,
    accreditation: ClipboardList,
};

interface QuickAction {
    label: string;
    description: string;
    href: string;
    icon: LucideIcon;
    gradient: string;
    roles: UserRole[];
}

const quickActions: QuickAction[] = [
    {
        label: "Browse Organizations",
        description: "Discover student orgs to join",
        href: "/dashboard/organizations",
        icon: Building2,
        gradient: "from-[#800000] to-[#A52A2A]",
        roles: ["student"],
    },
    {
        label: "Browse Organizations",
        description: "Manage organizations under your jurisdiction.",
        href: "/dashboard/organizations",
        icon: Building2,
        gradient: "from-[#800000] to-[#A52A2A]",
        roles: ["officer"],
    },
    {
        label: "Browse Organizations",
        description: "Oversee all registered student organizations.",
        href: "/dashboard/organizations",
        icon: Building2,
        gradient: "from-[#800000] to-[#A52A2A]",
        roles: ["admin"],
    },
    {
        label: "News & Events",
        description: "Latest campus news and upcoming events",
        href: "/dashboard/news-and-events",
        icon: Newspaper,
        gradient: "from-[#C9A227] to-[#E6C84D]",
        roles: ["student"],
    },
    {
        label: "Active Elections",
        description: "View active elections happening across organizations",
        href: "/dashboard/elections",
        icon: Vote,
        gradient: "from-[#2D3748] to-[#4A5568]",
        roles: ["student"],
    },
    {
        label: "My Memberships",
        description: "View groups you've joined",
        href: "/dashboard/memberships",
        icon: Users,
        gradient: "from-[#C9A227] to-[#E6C84D]",
        roles: ["officer"],
    },
    {
        label: "Upcoming Events",
        description: "See what's happening on campus",
        href: "/dashboard/events",
        icon: CalendarDays,
        gradient: "from-[#2B6CB0] to-[#4299E1]",
        roles: ["student", "officer"],
    },
    {
        label: "Upcoming Events",
        description: "Moderate and approve campus event submissions.",
        href: "/dashboard/events",
        icon: CalendarDays,
        gradient: "from-[#2B6CB0] to-[#4299E1]",
        roles: ["admin"],
    },
    {
        label: "Active Elections",
        description: "Create, manage, and oversee active organization elections.",
        href: "/dashboard/elections",
        icon: Vote,
        gradient: "from-[#2D3748] to-[#4A5568]",
        roles: ["officer", "admin"],
    },
    {
        label: "Manage Accreditation",
        description: "Review and process organization accreditation applications.",
        href: "/dashboard/accreditation",
        icon: FileCheck2,
        gradient: "from-[#22543D] to-[#38A169]",
        roles: ["officer", "admin"],
    },
    {
        label: "Admin Panel",
        description: "Manage organizations, events, members, and system configuration.",
        href: "/dashboard/admin",
        icon: Settings,
        gradient: "from-[#800000] to-[#C9A227]",
        roles: ["admin"],
    },
];

export default async function DashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
        return;
    }

    const [profileResult, orgCountResult, membershipCountResult, followCountResult, recentActivityResult, positionsResult] = await Promise.all([
        supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single(),
        supabase
            .from("organizations")
            .select("*", { count: "exact", head: true })
            .eq("visibility", "public"),
        supabase
            .from("memberships")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "approved"),
        supabase
            .from("organization_follows")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
        supabase
            .from("engagement_records")
            .select("id, record_type, title, organization_name, date_earned")
            .eq("user_id", user.id)
            .order("date_earned", { ascending: false })
            .limit(5),
        supabase
            .from("organization_roles")
            .select("title, hierarchy_level, organizations(id, name)")
            .eq("assigned_user_id", user.id)
            .order("hierarchy_level", { ascending: true })
            .limit(3),
    ]);

    const profile = profileResult.data;
    const orgCount = orgCountResult.count;
    const membershipCount = membershipCountResult.count;
    const followCount = followCountResult.count;
    const hasMembership = (membershipCount ?? 0) > 0;
    const recentActivity = recentActivityResult.data || [];
    const userPositions = (positionsResult.data || []).map((p) => ({
        ...p,
        organizations: Array.isArray(p.organizations) ? p.organizations[0] : p.organizations,
    }));

    let userRole: UserRole = (profile?.role as UserRole) || "student";
    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) {
            userRole = rpcRole as UserRole;
        }
    }

    // Determine effective role based on approved memberships or structural roles.
    if (userRole !== "admin") {
        const [officerResult, orgRoleResult] = await Promise.all([
            supabase
                .from("memberships")
                .select("id")
                .eq("user_id", user.id)
                .eq("role", "officer")
                .eq("status", "approved")
                .limit(1),
            supabase
                .from("organization_roles")
                .select("id")
                .eq("assigned_user_id", user.id)
                .limit(1),
        ]);

        if (hasMembership || !!officerResult.data?.length || !!orgRoleResult.data?.length) {
            userRole = "officer";
        } else {
            userRole = "student";
        }
    }

    const filteredActions = quickActions.filter((action) =>
        action.roles.includes(userRole)
    );

    const isStudent = userRole === "student";
    const roleLabel =
        userRole === "admin"
            ? "Admin"
            : userRole === "officer"
                ? "Student Officer"
                : "Student";

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#800000] to-[#A52A2A] p-6 sm:p-8 text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
                <div className="relative">
                    <p className="text-white/60 text-sm font-medium">Welcome back,</p>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                        {profile?.full_name?.split(" ")[0] || "there"} 👋
                    </h1>
                    <p className="text-white/70 mt-2 text-sm sm:text-base max-w-lg">
                        Here&apos;s what&apos;s happening in your campus community today.
                    </p>
                </div>
            </div>

            <div className={`grid grid-cols-1 gap-4 ${
                userPositions.length > 0
                    ? "sm:grid-cols-2 lg:grid-cols-4"
                    : "sm:grid-cols-3"
            }`}>
                <div className="rounded-xl border border-border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Organizations</p>
                            <p className="text-2xl font-bold mt-0.5">{orgCount ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                            {isStudent
                                ? <Star className="w-5 h-5 text-gold" aria-hidden="true" />
                                : <Users className="w-5 h-5 text-gold" aria-hidden="true" />}
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                {isStudent ? "Followed Orgs" : "My Memberships"}
                            </p>
                            <p className="text-2xl font-bold mt-0.5">
                                {isStudent ? (followCount ?? 0) : (membershipCount ?? 0)}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Role</p>
                            <p className="text-2xl font-bold mt-0.5">{roleLabel}</p>
                        </div>
                    </div>
                </div>
                {userPositions.map((pos) => (
                    <div key={pos.title} className="rounded-xl border border-border bg-card p-5 card-hover">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                                <Medal className="w-5 h-5 text-gold" aria-hidden="true" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">My Position</p>
                                <p className="text-base font-bold mt-0.5 truncate">{pos.title}</p>
                                <p className="text-xs text-muted-foreground truncate">{pos.organizations?.name}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredActions.map((action, i) => {
                        const Icon = action.icon;
                        return (
                            <Link
                                key={`${action.label}-${action.href}`}
                                href={action.href}
                                className="group rounded-xl border border-border bg-card overflow-hidden card-hover"
                                style={{ animationDelay: `${(i + 3) * 100}ms` }}
                            >
                                <div className={`h-2 bg-gradient-to-r ${action.gradient}`} />
                                <div className="p-5">
                                    <div className="flex items-start gap-3">
                                        <Icon className="w-6 h-6 text-primary shrink-0 group-hover:animate-float" aria-hidden="true" />
                                        <div>
                                            <h3 className="font-semibold group-hover:text-primary transition-colors">
                                                {action.label}
                                            </h3>
                                            <p className="text-sm text-muted-foreground mt-1">
                                                {action.description}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        Open
                                        <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
                {recentActivity.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-8 text-muted-foreground">
                        <ClipboardList className="w-8 h-8 mb-2" aria-hidden="true" />
                        <p className="text-sm">Your recent activity will appear here as you engage with the platform.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentActivity.map((rec) => {
                            const RecIcon = typeIcon[rec.record_type] || Pin;
                            return (
                                <div key={rec.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                                    <RecIcon className="w-5 h-5 text-muted-foreground shrink-0" aria-hidden="true" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{rec.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {rec.organization_name || "—"} · {new Date(rec.date_earned).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize shrink-0">
                                        {rec.record_type.replace(/_/g, " ")}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
