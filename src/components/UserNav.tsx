"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";

interface UserNavProps {
    userName: string;
    userEmail: string;
    userRole: UserRole;
}

export default function UserNav({ userName, userEmail, userRole }: UserNavProps) {
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const router = useRouter();

    const handleLogout = async () => {
        setLoggingOut(true);
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
        <div className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
            >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                </div>
                <span className="hidden sm:block text-sm font-medium">{userName}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-popover shadow-lg z-50">
                        <div className="p-3 border-b border-border">
                            <p className="text-sm font-medium">{userName}</p>
                            <p className="text-xs text-muted-foreground">{userEmail}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary capitalize">
                                {userRole}
                            </span>
                        </div>
                        <div className="p-1">
                            <button
                                onClick={handleLogout}
                                disabled={loggingOut}
                                className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors text-destructive"
                            >
                                {loggingOut ? "Signing out..." : "Sign out"}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
