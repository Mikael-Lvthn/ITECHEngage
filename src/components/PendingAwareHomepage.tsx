"use client";

import { useState, useEffect } from "react";
import { PendingVerificationModal } from "./PendingVerificationBanner";

/**
 * Programmatically intercepts any navigation clicks to restricted routes (e.g. /dashboard)
 * for pending users and shows the pending modal, while keeping public links, headers,
 * dropdowns, and sign out fully functional.
 */
export default function PendingAwareHomepage() {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        function handleGlobalClick(e: MouseEvent) {
            const target = e.target as HTMLElement;
            const anchor = target.closest("a");
            if (anchor) {
                const href = anchor.getAttribute("href");
                if (href && (href === "/dashboard" || href.startsWith("/dashboard/"))) {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowModal(true);
                }
            }
        }

        // Use capture phase to intercept clicks before Next.js Link router can capture them
        document.addEventListener("click", handleGlobalClick, true);
        return () => document.removeEventListener("click", handleGlobalClick, true);
    }, []);

    return (
        <PendingVerificationModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
        />
    );
}
