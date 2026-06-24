import Link from "next/link";

export const CONTACT_EMAIL = "team12itechengage@gmail.com";

interface SiteFooterLinksProps {
    className?: string;
    /** Link colour classes (so it adapts to maroon footers vs. light surfaces). */
    linkClassName?: string;
    showContact?: boolean;
}

/**
 * Shared inline row of legal/support links used in the homepage footer,
 * the dashboard footer, and the auth pages. Plain component (no client JS).
 */
export function SiteFooterLinks({
    className = "",
    linkClassName = "hover:underline transition-colors",
    showContact = true,
}: SiteFooterLinksProps) {
    return (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
            <Link href="/terms" className={linkClassName}>Terms &amp; Agreement</Link>
            <span aria-hidden="true" className="opacity-40">·</span>
            <Link href="/privacy" className={linkClassName}>Privacy Policy</Link>
            <span aria-hidden="true" className="opacity-40">·</span>
            <Link href="/feedback" className={linkClassName}>Feedback &amp; Suggestions</Link>
            {showContact && (
                <>
                    <span aria-hidden="true" className="opacity-40">·</span>
                    <a href={`mailto:${CONTACT_EMAIL}`} className={linkClassName}>Contact</a>
                </>
            )}
        </div>
    );
}
