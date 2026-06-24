"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

interface User {
    id: string;
    full_name: string;
    avatar_url: string | null;
}

interface UserListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    users: User[];
    total: number;
    organizationId: string;
    type: "members" | "followers";
}

export default function UserListModal({
    isOpen,
    onClose,
    title,
    users,
    total,
    organizationId,
    type,
}: UserListModalProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" 
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-md bg-card border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
                <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/30">
                    <div>
                        <h3 className="font-bold text-lg text-foreground">{title}</h3>
                        <p className="text-xs text-muted-foreground">{total} total {type}</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    {users.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-sm text-muted-foreground">No {type} to show.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {users.map((u) => (
                                <Link
                                    key={u.id}
                                    href={`/dashboard/profile/${u.id}`}
                                    onClick={onClose}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-accent transition-all group"
                                >
                                    <div className="relative w-10 h-10 rounded-full bg-muted overflow-hidden shrink-0 border border-border">
                                        {u.avatar_url ? (
                                            <Image src={u.avatar_url} alt={u.full_name} fill className="object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                {u.full_name
                                                    .split(" ")
                                                    .map((n) => n[0])
                                                    .join("")
                                                    .toUpperCase()
                                                    .slice(0, 2)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                                            {u.full_name}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground">View profile →</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t bg-muted/30">
                    <Link
                        href={`/dashboard/organizations/${organizationId}${type === "members" ? "/members" : ""}`}
                        className="block w-full py-2.5 text-center text-sm font-bold bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-opacity"
                        onClick={onClose}
                    >
                        See All {type === "members" ? "Members" : "Followers"}
                    </Link>
                </div>
            </div>
        </div>
    );
}
