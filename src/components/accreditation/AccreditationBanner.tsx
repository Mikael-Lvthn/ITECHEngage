"use client";

import Link from "next/link";
import React from "react";

interface AccreditationBannerProps {
    status: string;
    expiresAt?: string | null;
    isOfficer: boolean;
}

export default function AccreditationBanner({ status, expiresAt, isOfficer }: AccreditationBannerProps) {
    const daysRemaining = React.useMemo(() => {
        if (!expiresAt) return null;
        const expiryDate = new Date(expiresAt);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }, [expiresAt]);

    if (!isOfficer) return null; // Only show to officers

    // If no expiration date but status is pending/rejected, we don't necessarily show this banner
    // as it's specifically for the *expiry cycle* (Stage 5)
    if (!expiresAt && status !== 'expired') return null;

    const isExpired = status === 'expired' || (daysRemaining !== null && daysRemaining <= 0);
    const isDanger = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
    const isWarning = daysRemaining !== null && daysRemaining > 7 && daysRemaining <= 60;

    if (!isExpired && !isDanger && !isWarning) return null;

    let bannerClass = "";
    let icon = "";
    let title = "";
    let message = "";

    if (isExpired) {
        bannerClass = "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300";
        icon = "🚨";
        title = "Accreditation Lapsed";
        message = "Your organization's accreditation has expired. Core features like elections and recruitment are currently locked. Please submit a revalidation application immediately.";
    } else if (isDanger) {
        bannerClass = "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/50 text-orange-800 dark:text-orange-300";
        icon = "⚠️";
        title = "Critical: Accreditation Expiring Soon";
        message = `Your accreditation expires in ${daysRemaining} days. Renew immediately to avoid feature lockout.`;
    } else if (isWarning) {
        bannerClass = "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-900/50 text-yellow-800 dark:text-yellow-300";
        icon = "⏳";
        title = "Accreditation Renewal Notice";
        message = `Your accreditation expires in ${daysRemaining} days. Start gathering documents for your revalidation cycle.`;
    }

    return (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm ${bannerClass}`}>
            <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">{icon}</span>
                <div>
                    <h4 className="font-semibold">{title}</h4>
                    <p className="text-sm mt-0.5 opacity-90">{message}</p>
                </div>
            </div>
            <Link 
                href="/dashboard/accreditation" 
                className="shrink-0 px-4 py-2 bg-background/50 hover:bg-background/80 border border-current/20 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
            >
                Start Revalidation
            </Link>
        </div>
    );
}
