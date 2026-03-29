"use client";

import { useState, useEffect } from "react";
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
    { label: "Home", href: "/", icon: "🏠", roles: ["student", "officer", "admin"] },
    { label: "Dashboard", href: "/dashboard", icon: "📊", roles: ["student", "officer", "admin"] },
    { label: "Organizations", href: "/dashboard/organizations", icon: "🏢", roles: ["student", "officer", "admin"] },
    { label: "My Memberships", href: "/dashboard/memberships", icon: "👥", roles: ["student", "officer"] },
    { label: "Membership Requests", href: "/dashboard/requests", icon: "📋", roles: ["officer", "admin"] },
    { label: "News & Events", href: "/dashboard/news-and-events", icon: "📰", roles: ["student", "officer", "admin"] },
    { label: "Elections", href: "/dashboard/elections", icon: "🗳️", roles: ["student", "officer", "admin"] },
    { label: "Notifications", href: "/dashboard/notifications", icon: "🔔", roles: ["student", "officer", "admin"] },
    { label: "Accreditation", href: "/dashboard/accreditation", icon: "📑", roles: ["officer", "admin"] },
    { label: "Admin Panel", href: "/dashboard/admin", icon: "⚙️", roles: ["admin"] },
    { label: "Settings", href: "/dashboard/settings", icon: "🎨", roles: ["student", "officer", "admin"] },
];

interface MobileNavProps {
    userRole: UserRole;
    userName: string;
    userEmail: string;
}

export default function MobileNav({ userRole, userName, userEmail }: MobileNavProps) {
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from("notifications")
            .select("*", { count: "exact", head: true })
            .eq("is_read", false)
            .then(({ count }) => {
                setUnreadCount(count || 0);
            });
    }, [pathname]);

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

    return (
        <div className="lg:hidden">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-accent transition-colors"
                aria-label="Toggle menu"
            >
                {open ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                )}
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
                                <p className="text-[10px] text-white/50">Campus Engagement Platform</p>
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
                                        <span className="text-lg">{item.icon}</span>
                                        <span className="flex-1">{item.label}</span>
                                        {item.label === "Notifications" && unreadCount > 0 && (
                                            <span className="bg-[#C9A227] text-[#2B2B2B] text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {unreadCount > 99 ? "99+" : unreadCount}
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
                                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#C9A227] text-[#2B2B2B] text-sm font-bold shrink-0">
                                    {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate text-sidebar-foreground">{userName}</p>
                                    <p className="text-[10px] text-white/50 truncate">{userEmail}</p>
                                </div>
                            </div>
                            <button
                                onClick={handleSignOut}
                                disabled={signingOut}
                                className="w-full mt-2 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                {signingOut ? "Signing out..." : "Sign Out"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
