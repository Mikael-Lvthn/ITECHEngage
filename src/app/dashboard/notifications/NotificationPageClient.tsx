"use client";

import { useEffect } from "react";
import { markAllAsRead } from "@/lib/actions/notifications";

export default function NotificationPageClient() {
    useEffect(() => {
        markAllAsRead().catch(() => {
            // Silent — badge clear is best-effort
        });
    }, []);

    return null;
}
