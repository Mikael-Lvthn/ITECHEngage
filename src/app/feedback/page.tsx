import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FeedbackForm } from "@/components/FeedbackForm";
import { SiteFooterLinks, CONTACT_EMAIL } from "@/components/SiteFooterLinks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
    title: "Feedback & Suggestions — ITECHEngage",
};

export default async function FeedbackPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <div className="bg-primary px-6 py-2 text-center">
                <p className="text-xs text-primary-foreground/80">
                    Polytechnic University of the Philippines — Institute of Technology
                </p>
            </div>

            <div className="flex-1 w-full max-w-2xl mx-auto px-4 py-10">
                <Link
                    href={user ? "/dashboard" : "/"}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back
                </Link>

                <div className="flex items-center gap-3 mb-2">
                    <Image src="/logo.png" alt="ITECHEngage" width={44} height={44} className="rounded-full shrink-0" />
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Feedback &amp; Suggestions</h1>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                    We would love to hear your thoughts. Tell us what is working, what is not, or what you would like to see next.
                </p>

                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                    <FeedbackForm isLoggedIn={!!user} />
                </div>

                <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Prefer email? Reach us at{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary font-medium hover:underline">
                            {CONTACT_EMAIL}
                        </a>
                        .
                    </p>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                    <SiteFooterLinks className="text-xs text-muted-foreground" showContact={false} />
                </div>
            </div>
        </div>
    );
}
