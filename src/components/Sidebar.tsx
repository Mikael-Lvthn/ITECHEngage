"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

interface NavItem {
    label: string;
    href: string;
    icon: string;
    roles: UserRole[];
}

const navItems: NavItem[] = [
    {
        label: "Home",
        href: "/",
        icon: "🏠",
        roles: ["student", "officer", "admin"],
    },
    {
        label: "Dashboard",
        href: "/dashboard",
        icon: "📊",
        roles: ["student", "officer", "admin"],
    },
    {
        label: "Organizations",
        href: "/dashboard/organizations",
        icon: "🏢",
        roles: ["student", "officer", "admin"],
    },
    {
        label: "Followed",
        href: "/dashboard/followed",
        icon: "⭐",
        roles: ["student", "officer"],
    },
    {
        label: "My Memberships",
        href: "/dashboard/memberships",
        icon: "👥",
        roles: ["officer"],
    },
    {
        label: "News & Events",
        href: "/dashboard/news-and-events",
        icon: "📰",
        roles: ["student", "officer", "admin"],
    },
    {
        label: "Recruitment",
        href: "/dashboard/recruitment",
        icon: "📋",
        roles: ["officer"],
    },
    {
        label: "Bulletin Board",
        href: "/dashboard/bulletin",
        icon: "📌",
        roles: ["student", "officer", "admin"],
    },
    {
        label: "Elections",
        href: "/dashboard/elections",
        icon: "🗳️",
        roles: ["student", "officer", "admin"],
    },
    {
        label: "Notifications",
        href: "/dashboard/notifications",
        icon: "🔔",
        roles: ["student", "officer", "admin"],
    },
    {
        label: "My Record",
        href: "/dashboard/co-curricular",
        icon: "🎓",
        roles: ["student", "officer"],
    },
    {
        label: "Accreditation",
        href: "/dashboard/accreditation",
        icon: "📑",
        roles: ["officer", "admin"],
    },
    {
        label: "Officer Panel",
        href: "/dashboard/officer-panel",
        icon: "🏛️",
        roles: ["officer"],
    },
    {
        label: "Admin Panel",
        href: "/dashboard/admin",
        icon: "⚙️",
        roles: ["admin"],
    },
    {
        label: "Settings",
        href: "/dashboard/settings",
        icon: "🎨",
        roles: ["student", "officer", "admin"],
    },
];

interface SidebarProps {
    userRole: UserRole;
    userName: string;
    userEmail: string;
    hasOrgRoles?: boolean;
    adminBadgeCount?: number;
    officerBadgeCount?: number;
}

export default function Sidebar({ userRole, userName, userEmail, adminBadgeCount = 0, officerBadgeCount = 0 }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [showMenu, setShowMenu] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) return;
            supabase
                .from("notifications")
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id)
                .eq("status", "unread")
                .then(({ count }) => {
                    setUnreadCount(count || 0);
                });
        });
    }, [pathname]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredNavItems = navItems.filter((item) =>
        item.roles.includes(userRole)
    );

    const handleSignOut = async () => {
        setSigningOut(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    const roleLabel =
        userRole === "admin"
            ? "Admin"
            : userRole === "officer"
                ? "Student Officer"
                : "Student";

    return (
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
            <Link href="/" className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border hover:bg-sidebar-accent/30 transition-colors">
                <Image
                    src="/logo.png"
                    alt="ITECHEngage"
                    width={40}
                    height={40}
                    className="rounded-full"
                />
                <div>
                    <h1 className="text-base font-semibold text-sidebar-foreground">ITECHEngage</h1>
                    <p className="text-[10px] text-white/50">Campus Engagement Platform</p>
                </div>
            </Link>

            <nav className="flex-1 px-3 py-4 space-y-1 min-h-0 overflow-y-auto no-scrollbar">
                {filteredNavItems.map((item, i) => {
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(item.href);

                    return (
                        <Link
                            key={`${item.href}-${item.label}`}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                            )}
                            style={{ animationDelay: `${i * 50}ms` }}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="flex-1">{item.label}</span>
                            {item.label === "Notifications" && unreadCount > 0 && (
                                <span className="bg-[#C9A227] text-[#2B2B2B] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                            )}
                            {item.label === "Admin Panel" && adminBadgeCount > 0 && (
                                <span className="bg-[#C9A227] text-[#2B2B2B] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {adminBadgeCount > 99 ? "99+" : adminBadgeCount}
                                </span>
                            )}
                            {item.label === "Officer Panel" && officerBadgeCount > 0 && (
                                <span className="bg-[#C9A227] text-[#2B2B2B] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {officerBadgeCount > 99 ? "99+" : officerBadgeCount}
                                </span>
                            )}
                        </Link>
                    );
                })}

                <div className="my-2 border-t border-sidebar-border" />
            </nav>

            <div className="relative px-3 py-3 border-t border-sidebar-border" ref={menuRef}>
                <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors text-left"
                >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#C9A227] text-[#2B2B2B] text-sm font-bold shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-sidebar-foreground">
                            {userName}
                        </p>
                        <p className="text-[10px] text-white/50 truncate">{userEmail}</p>
                    </div>
                    <svg
                        className={cn("w-4 h-4 text-white/50 transition-transform", showMenu && "rotate-180")}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                </button>

                {showMenu && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 rounded-lg bg-popover shadow-xl border border-border overflow-hidden animate-scale-in">
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm font-semibold text-popover-foreground">{userName}</p>
                            <p className="text-xs text-muted-foreground">{userEmail}</p>
                            <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#800000]/10 text-[#800000] capitalize">
                                {roleLabel}
                            </span>
                        </div>
                        <div className="p-1">
                            <Link
                                href="/"
                                onClick={() => setShowMenu(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground rounded-md hover:bg-accent transition-colors"
                            >
                                <span className="text-base">🏠</span>
                                Go to Homepage
                            </Link>
                            <Link
                                href="/dashboard/profile"
                                onClick={() => setShowMenu(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground rounded-md hover:bg-accent transition-colors"
                            >
                                <span className="text-base">👤</span>
                                My Profile
                            </Link>
                            <button
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {signingOut ? "Signing out..." : "Sign Out"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
