"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
    Home,
    LayoutDashboard,
    Building2,
    Star,
    Users,
    Newspaper,
    ClipboardList,
    Pin,
    Vote,
    Bell,
    GraduationCap,
    FileCheck2,
    Landmark,
    ShieldCheck,
    Settings,
    ChevronUp,
    LogOut,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
    roles: UserRole[];
    requireOrgRole?: boolean;
}

const navItems: NavItem[] = [
    { label: "Home", href: "/", icon: Home, roles: ["student", "officer", "admin"] },
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["student", "officer", "admin"] },
    { label: "Organizations", href: "/dashboard/organizations", icon: Building2, roles: ["student", "officer", "admin"] },
    { label: "Followed", href: "/dashboard/followed", icon: Star, roles: ["student", "officer"] },
    { label: "My Memberships", href: "/dashboard/memberships", icon: Users, roles: ["officer"] },
    { label: "News & Events", href: "/dashboard/news-and-events", icon: Newspaper, roles: ["student", "officer", "admin"] },
    { label: "Recruitment", href: "/dashboard/recruitment", icon: ClipboardList, roles: ["officer"], requireOrgRole: true },
    { label: "Bulletin Board", href: "/dashboard/bulletin", icon: Pin, roles: ["student", "officer", "admin"] },
    { label: "Elections", href: "/dashboard/elections", icon: Vote, roles: ["student", "officer", "admin"] },
    { label: "Notifications", href: "/dashboard/notifications", icon: Bell, roles: ["student", "officer", "admin"] },
    { label: "My Record", href: "/dashboard/co-curricular", icon: GraduationCap, roles: ["student", "officer"] },
    { label: "Accreditation", href: "/dashboard/accreditation", icon: FileCheck2, roles: ["officer", "admin"] },
    { label: "Officer Panel", href: "/dashboard/officer-panel", icon: Landmark, roles: ["officer"], requireOrgRole: true },
    { label: "Admin Panel", href: "/dashboard/admin", icon: ShieldCheck, roles: ["admin"] },
    { label: "Settings", href: "/dashboard/settings", icon: Settings, roles: ["student", "officer", "admin"] },
];

interface SidebarProps {
    userRole: UserRole;
    userName: string;
    userEmail: string;
    hasOrgRoles?: boolean;
    adminBadgeCount?: number;
    officerBadgeCount?: number;
}

export default function Sidebar({ userRole, userName, userEmail, hasOrgRoles = false, adminBadgeCount = 0, officerBadgeCount = 0 }: SidebarProps) {
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

    const filteredNavItems = navItems.filter((item) => {
        if (!item.roles.includes(userRole)) return false;
        if (item.requireOrgRole && !hasOrgRoles) return false;
        return true;
    });

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

    const badgeFor = (label: string) => {
        if (label === "Notifications") return unreadCount;
        if (label === "Admin Panel") return adminBadgeCount;
        if (label === "Officer Panel") return officerBadgeCount;
        return 0;
    };

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
                    <p className="text-[10px] text-sidebar-foreground/50">Campus Engagement Platform</p>
                </div>
            </Link>

            <nav className="flex-1 px-3 py-4 space-y-1 min-h-0 overflow-y-auto sidebar-scrollbar">
                {filteredNavItems.map((item, i) => {
                    const isActive =
                        item.href === "/"
                            ? pathname === "/"
                            : item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    const badge = badgeFor(item.label);

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
                            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                            <span className="flex-1">{item.label}</span>
                            {badge > 0 && (
                                <span className="bg-sidebar-primary text-sidebar-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                    {badge > 99 ? "99+" : badge}
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent/50 transition-colors text-left cursor-pointer"
                >
                    <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold shrink-0">
                        {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-sidebar-foreground">
                            {userName}
                        </p>
                        <p className="text-[10px] text-sidebar-foreground/50 truncate">{userEmail}</p>
                    </div>
                    <ChevronUp
                        className={cn("w-4 h-4 text-sidebar-foreground/50 transition-transform", showMenu && "rotate-180")}
                        aria-hidden="true"
                    />
                </button>

                {showMenu && (
                    <div className="absolute bottom-full left-3 right-3 mb-2 rounded-lg bg-popover shadow-xl border border-border overflow-hidden animate-scale-in">
                        <div className="px-4 py-3 border-b border-border">
                            <p className="text-sm font-semibold text-popover-foreground">{userName}</p>
                            <p className="text-xs text-muted-foreground">{userEmail}</p>
                            <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary capitalize">
                                {roleLabel}
                            </span>
                        </div>
                        <div className="p-1">
                            <Link
                                href="/"
                                onClick={() => setShowMenu(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground rounded-md hover:bg-accent transition-colors"
                            >
                                <Home className="h-4 w-4" aria-hidden="true" />
                                Go to Homepage
                            </Link>
                            <Link
                                href="/dashboard/profile"
                                onClick={() => setShowMenu(false)}
                                className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground rounded-md hover:bg-accent transition-colors"
                            >
                                <Users className="h-4 w-4" aria-hidden="true" />
                                My Profile
                            </Link>
                            <button
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" aria-hidden="true" />
                                {signingOut ? "Signing out..." : "Sign Out"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}
