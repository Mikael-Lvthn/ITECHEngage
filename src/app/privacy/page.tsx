import type { Metadata } from "next";
import { getSiteContent } from "@/lib/actions/legal";
import { LegalPageShell } from "@/components/LegalPageShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Privacy Policy — ITECHEngage",
};

export default async function PrivacyPage() {
    const doc = await getSiteContent("privacy");
    return (
        <LegalPageShell
            title={doc?.title || "Privacy Policy"}
            updatedAt={doc?.updated_at}
            content={doc?.content || ""}
        />
    );
}
