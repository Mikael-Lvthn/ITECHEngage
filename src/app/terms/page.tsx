import type { Metadata } from "next";
import { getSiteContent } from "@/lib/actions/legal";
import { LegalPageShell } from "@/components/LegalPageShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Terms & Agreement — ITECHEngage",
};

export default async function TermsPage() {
    const doc = await getSiteContent("terms");
    return (
        <LegalPageShell
            title={doc?.title || "Terms & Agreement"}
            updatedAt={doc?.updated_at}
            content={doc?.content || ""}
        />
    );
}
