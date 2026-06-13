"use client";

import { useState } from "react";

export function PendingVerificationBanner() {
    return (
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500/20 via-yellow-400/15 to-amber-500/20 border-b border-amber-400/30 backdrop-blur-sm">
            {/* Animated shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-pulse" />
            <div className="relative max-w-7xl mx-auto px-4 py-3 flex items-center justify-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-amber-400/20 border border-amber-400/40 shrink-0">
                    <span className="text-base">⏳</span>
                </div>
                <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    <span className="font-bold">Account Pending Approval</span>
                    <span className="hidden sm:inline text-amber-800/80 dark:text-amber-300/80 font-normal">
                        {" — "}You&apos;ll have full access once an administrator approves your account.
                    </span>
                </p>
                <span className="hidden sm:flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/30 text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider shrink-0">
                    Under Review
                </span>
            </div>
        </div>
    );
}

export function PendingVerificationModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    if (!isOpen) return null;
    return (
        <div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-sm mx-4 bg-card rounded-2xl border border-amber-400/30 shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Decorative top gradient */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500" />

                <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⏳</span>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">Account Pending Approval</h3>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        Your account is currently under review. An administrator needs to verify your details before you can access this feature.
                    </p>

                    <div className="mt-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30 p-3 text-left space-y-1.5">
                        {[
                            "Check your email for updates",
                            "Verification usually takes 1–2 business days",
                            "Contact admin if it takes longer",
                        ].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
                                <span className="text-amber-500">✦</span>
                                {item}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-5 w-full py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-md"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
}
