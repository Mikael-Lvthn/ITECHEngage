import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { SiteFooterLinks } from "@/components/SiteFooterLinks";

interface LegalPageShellProps {
    title: string;
    updatedAt?: string | null;
    content: string;
}

/** Public layout for the Terms / Privacy pages. Renders stored content as
 *  safe text (whitespace-pre-wrap, no HTML injection). */
export function LegalPageShell({ title, updatedAt, content }: LegalPageShellProps) {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <div className="bg-primary px-6 py-2 text-center">
                <p className="text-xs text-primary-foreground/80">
                    Polytechnic University of the Philippines — Institute of Technology
                </p>
            </div>

            <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-10">
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Homepage
                </Link>

                <div className="flex items-center gap-3 mb-6">
                    <Image src="/logo.png" alt="ITECHEngage" width={44} height={44} className="rounded-full shrink-0" />
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                        {updatedAt && (
                            <p className="text-xs text-muted-foreground">
                                Last updated{" "}
                                {new Date(updatedAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                        {content || "This content has not been set yet. Please check back soon."}
                    </div>
                </div>

                <div className="mt-8 border-t border-border pt-6">
                    <SiteFooterLinks className="text-xs text-muted-foreground" />
                </div>
            </div>
        </div>
    );
}
