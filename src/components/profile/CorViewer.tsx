"use client";

import { useState } from "react";
import { getCorSignedUrl } from "@/lib/actions/cor";
import { getErrorMessage } from "@/lib/utils/error";
import DocumentViewerModal from "@/components/accreditation/DocumentViewerModal";

/**
 * Owner/admin-only button that opens a student's Certificate of Registration.
 * Authorization is enforced server-side by getCorSignedUrl.
 */
export default function CorViewer({ targetUserId }: { targetUserId: string }) {
    const [viewing, setViewing] = useState<{ url: string; name: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleView() {
        try {
            setLoading(true);
            const url = await getCorSignedUrl(targetUserId);
            setViewing({ url, name: "Certificate of Registration.pdf" });
        } catch (err) {
            console.error("View COR failed:", getErrorMessage(err));
            alert(getErrorMessage(err) || "Could not load the Certificate of Registration.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <button
                type="button"
                onClick={handleView}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
                {loading ? "Loading..." : "📄 View COR"}
            </button>

            {viewing && (
                <DocumentViewerModal
                    fileUrl={viewing.url}
                    fileName={viewing.name}
                    onClose={() => setViewing(null)}
                />
            )}
        </>
    );
}
