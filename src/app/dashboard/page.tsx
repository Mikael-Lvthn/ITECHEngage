import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

interface QuickAction {
    label: string;
    description: string;
    href: string;
    icon: string;
    gradient: string;
    roles: UserRole[];
}

const quickActions: QuickAction[] = [
    {
        label: "Browse Organizations",
        description: "Discover student orgs to join",
        href: "/dashboard/organizations",
        icon: "🏢",
        gradient: "from-[#800000] to-[#A52A2A]",
        roles: ["student"],
    },
    {
        label: "Browse Organizations",
        description: "Manage organizations under your jurisdiction.",
        href: "/dashboard/organizations",
        icon: "🏢",
        gradient: "from-[#800000] to-[#A52A2A]",
        roles: ["officer"],
    },
    {
        label: "Browse Organizations",
        description: "Oversee all registered student organizations.",
        href: "/dashboard/organizations",
        icon: "🏢",
        gradient: "from-[#800000] to-[#A52A2A]",
        roles: ["admin"],
    },
    {
        label: "News & Events",
        description: "Latest campus news and upcoming events",
        href: "/dashboard/news-and-events",
        icon: "📰",
        gradient: "from-[#C9A227] to-[#E6C84D]",
        roles: ["student"],
    },
    {
        label: "Active Elections",
        description: "View active elections happening across organizations",
        href: "/dashboard/elections",
        icon: "🗳️",
        gradient: "from-[#2D3748] to-[#4A5568]",
        roles: ["student"],
    },
    {
        label: "My Memberships",
        description: "View groups you've joined",
        href: "/dashboard/memberships",
        icon: "👥",
        gradient: "from-[#C9A227] to-[#E6C84D]",
        roles: ["officer"],
    },
    {
        label: "Upcoming Events",
        description: "See what's happening on campus",
        href: "/dashboard/events",
        icon: "📅",
        gradient: "from-[#2B6CB0] to-[#4299E1]",
        roles: ["student", "officer"],
    },
    {
        label: "Upcoming Events",
        description: "Moderate and approve campus event submissions.",
        href: "/dashboard/events",
        icon: "📅",
        gradient: "from-[#2B6CB0] to-[#4299E1]",
        roles: ["admin"],
    },
    {
        label: "Active Elections",
        description: "Create, manage, and oversee active organization elections.",
        href: "/dashboard/elections",
        icon: "🗳️",
        gradient: "from-[#2D3748] to-[#4A5568]",
        roles: ["officer", "admin"],
    },
    {
        label: "Manage Accreditation",
        description: "Review and process organization accreditation applications.",
        href: "/dashboard/accreditation",
        icon: "📑",
        gradient: "from-[#22543D] to-[#38A169]",
        roles: ["officer", "admin"],
    },
    {
        label: "Admin Panel",
        description: "Manage organizations, events, members, and system configuration.",
        href: "/dashboard/admin",
        icon: "⚙️",
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

    const [profileResult, orgCountResult, membershipCountResult, followCountResult] = await Promise.all([
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
    ]);

    const profile = profileResult.data;
    const orgCount = orgCountResult.count;
    const membershipCount = membershipCountResult.count;
    const followCount = followCountResult.count;

    let userRole: UserRole = (profile?.role as UserRole) || "student";
    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) {
            userRole = rpcRole as UserRole;
        }
    }

    // Determine effective role based on officer memberships (same logic as layout)
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

        if ((officerResult.data && officerResult.data.length > 0) || (orgRoleResult.data && orgRoleResult.data.length > 0)) {
            userRole = "officer";
        } else {
            userRole = "student";
        }
    }

    const filteredActions = quickActions.filter((action) =>
        action.roles.includes(userRole)
    );

    const isStudent = userRole === "student";

    return (
        <div className="space-y-8">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#800000] to-[#A52A2A] p-6 sm:p-8 text-white">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9A227]/10 rounded-full -translate-y-1/2 translate-x-1/4" />
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#800000]/10 flex items-center justify-center">
                            <span className="text-lg">🏢</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Organizations</p>
                            <p className="text-2xl font-bold mt-0.5">{orgCount ?? 0}</p>
                        </div>
                    </div>
                </div>
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#C9A227]/10 flex items-center justify-center">
                            <span className="text-lg">{isStudent ? "⭐" : "👥"}</span>
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
                <div className="rounded-xl border bg-card p-5 card-hover">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#2B6CB0]/10 flex items-center justify-center">
                            <span className="text-lg">🎖️</span>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Role</p>
                            <p className="text-2xl font-bold mt-0.5 capitalize">{userRole}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredActions.map((action, i) => (
                        <Link
                            key={`${action.label}-${action.href}`}
                            href={action.href}
                            className="group rounded-xl border bg-card overflow-hidden card-hover"
                            style={{ animationDelay: `${(i + 3) * 100}ms` }}
                        >
                            <div className={`h-2 bg-gradient-to-r ${action.gradient}`} />
                            <div className="p-5">
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl group-hover:animate-float">{action.icon}</span>
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
                                    <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
                <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
                <div className="text-center py-8 text-muted-foreground">
                    <p className="text-3xl mb-2">📋</p>
                    <p className="text-sm">Your recent activity will appear here as you engage with the platform.</p>
                </div>
            </div>
        </div>
    );
}
