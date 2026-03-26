"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface UserMenuProps {
    userName: string;
    userRole: string;
}

export default function UserMenu({ userName, userRole }: UserMenuProps) {
    const [open, setOpen] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const firstName = userName.split(" ")[0] || "User";

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSignOut = async () => {
        setSigningOut(true);
        const supabase = createClient();
        await supabase.auth.signOut();
        router.push("/login");
        router.refresh();
    };

    return (
        <div ref={menuRef} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="inline-flex items-center gap-2 bg-[#C9A227] text-[#2B2B2B] px-3 py-1 rounded-lg font-medium hover:bg-[#b8911f] transition-colors text-xs"
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {firstName}
                <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-xl border border-border overflow-hidden animate-scale-in z-50">
                    <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-semibold text-[#2B2B2B]">{userName}</p>
                        <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#800000]/10 text-[#800000] capitalize">
                            {userRole}
                        </span>
                    </div>
                    <div className="p-1">
                        <Link
                            href="/dashboard"
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-[#2B2B2B] rounded-md hover:bg-[#F0F0F0] transition-colors"
                        >
                            <span className="text-base">📊</span>
                            Dashboard
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
    );
}
