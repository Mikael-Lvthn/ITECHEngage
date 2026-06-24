"use client";

import { useState } from "react";

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
    Menu,
    X,
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

interface MobileNavProps {
    userRole: UserRole;
    userName: string;
    userEmail: string;
    hasOrgRoles?: boolean;
    adminBadgeCount?: number;
    officerBadgeCount?: number;
}

export default function MobileNav({ userRole, userName, userEmail, hasOrgRoles = false, adminBadgeCount = 0, officerBadgeCount = 0 }: MobileNavProps) {
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [unreadCount] = useState(0);
    const pathname = usePathname();
    const router = useRouter();

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
        <div className="lg:hidden">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent transition-colors cursor-pointer"
                aria-label="Toggle menu"
            >
                {open ? <X className="w-5 h-5" aria-hidden="true" /> : <Menu className="w-5 h-5" aria-hidden="true" />}
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/50 animate-fade-in" onClick={() => setOpen(false)} />
                    <div className="fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border shadow-xl animate-slide-in-left flex flex-col">
                        {/* Logo */}
                        <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
                            <Image
                                src="/logo.png"
                                alt="ITECHEngage"
                                width={36}
                                height={36}
                                className="rounded-full"
                            />
                            <div>
                                <h1 className="text-base font-semibold text-sidebar-foreground">ITECHEngage</h1>
                                <p className="text-[10px] text-sidebar-foreground/50">Campus Engagement Platform</p>
                            </div>
                        </Link>

                        {/* Navigation */}
                        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                            {filteredNavItems.map((item) => {
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
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                                            isActive
                                                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
                                        )}
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

                        {/* User Profile + Sign Out */}
                        <div className="px-3 py-3 border-t border-sidebar-border">
                            <div className="flex items-center gap-3 px-3 py-2">
                                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-sm font-bold shrink-0">
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-sidebar-foreground">{userName}</p>
                                    <p className="text-[10px] text-sidebar-foreground/50 truncate">{userEmail}</p>
                                    <p className="text-[10px] text-sidebar-primary truncate">{roleLabel}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                                <LogOut className="w-4 h-4" aria-hidden="true" />
                                {signingOut ? "Signing out..." : "Sign Out"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
