import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Building2, BarChart3, MapPin, Newspaper, ClipboardList, ExternalLink, AlertTriangle, GraduationCap, ShieldCheck, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getHomepagePublicData, getHomepageElectionsWithFollowStatus } from "@/lib/homepage-data";
import UserMenu from "@/components/UserMenu";
import HomepageSearch from "@/components/HomepageSearch";
import HomepageElectionsSection from "@/components/HomepageElectionsSection";
import HomepageOrgFilter from "@/components/HomepageOrgFilter";
import { PendingVerificationBanner } from "@/components/PendingVerificationBanner";
import PendingAwareHomepage from "../components/PendingAwareHomepage";
import ScrollReveal from "@/components/ScrollReveal";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string; error_description?: string; message?: string; code?: string }>;
}) {
    const { error, error_description, message, code } = await searchParams;

    if (code) {
        redirect(`/auth/callback?code=${code}`);
    }

    const supabase = await createClient();

    const userResultPromise = supabase.auth.getUser();
    const homepageDataPromise = getHomepagePublicData();

    const [
        {
            data: { user },
        },
        { events, organizations, newsItems, activeElections, categories, recruitments },
    ] = await Promise.all([userResultPromise, homepageDataPromise]);

    let profile: { full_name: string; role: string; account_status: string } | null = null;
    let electionsWithFollow = activeElections;

    if (user) {
        const [profileData, followedElections] = await Promise.all([
            supabase
                .from("profiles")
                .select("full_name, role, account_status")
                .eq("id", user.id)
                .single(),
            getHomepageElectionsWithFollowStatus(user.id),
        ]);
        profile = profileData.data;
        electionsWithFollow = followedElections;
    }

    const isPending = profile?.account_status === 'pending_verification';

    // Build combined news + recruitments feed sorted by date
    const combinedFeed = [
        ...(newsItems || []).map((n) => ({
            id: n.id,
            type: "news" as const,
            title: n.title,
            body: n.content?.slice(0, 200) || null,
            link: `/dashboard/news/${n.id}`,
            created_at: n.published_at || n.created_at,
            organizations: Array.isArray(n.organizations) ? n.organizations[0] : n.organizations,
            image_url: n.image_url,
            creator_name: Array.isArray(n.creator) ? n.creator[0]?.full_name : n.creator?.full_name,
        })),
        ...(recruitments || []).map((r) => ({
            id: r.id,
            type: "recruitment" as const,
            title: r.title,
            body: r.description?.slice(0, 200) || null,
            link: `/dashboard/organizations/${r.organization_id}`,
            created_at: r.created_at,
            organizations: Array.isArray(r.organizations) ? r.organizations[0] : r.organizations,
            image_url: null,
            creator_name: null,
        })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="min-h-screen bg-background">
            {isPending && <PendingVerificationBanner />}
            {isPending && <PendingAwareHomepage />}
            {/* ═══ Top Navigation ═══ */}
            <header className="bg-primary text-white">
                <div className="bg-[#600000] px-6 sm:px-12 py-1.5">
                    <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
                        <span className="text-white/80">
                            Polytechnic University of the Philippines — Institute of Technology
                        </span>
                        <div className="flex items-center gap-4">
                            {user ? (
                                <UserMenu
                                    userName={profile?.full_name || "User"}
                                    userRole={profile?.role || "student"}
                                />
                            ) : (
                                <>
                                    <Link href="/login" className="text-white/90 hover:text-white transition-colors">
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/signup"
                                        className="bg-gold text-[#2B2B2B] px-3 py-0.5 rounded font-medium hover:bg-gold/90 transition-colors"
                                    >
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main nav */}
                <nav className="px-6 sm:px-12 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <Link href="/" className="flex items-center gap-3">
                            <Image
                                src="/logo.png"
                                alt="ITECHEngage Logo"
                                width={44}
                                height={44}
                                className="rounded-full"
                            />
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">ITECHEngage</h1>
                                <p className="text-[10px] text-white/60 -mt-0.5">Campus Engagement Platform</p>
                            </div>
                        </Link>
                        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <Link href="#events" className="text-white/90 hover:text-white transition-colors">
                                Events
                            </Link>
                            <Link href="#organizations" className="text-white/90 hover:text-white transition-colors">
                                Organizations
                            </Link>
                            <Link href="#news" className="text-white/90 hover:text-white transition-colors">
                                News
                            </Link>
                            <Link href="#about" className="text-white/90 hover:text-white transition-colors">
                                About
                            </Link>
                            {user && (
                                <Link href="/dashboard" className="bg-white/15 backdrop-blur px-4 py-1.5 rounded-lg text-white hover:bg-white/25 transition-colors">
                                    Dashboard
                                </Link>
                            )}
                        </div>
                    </div>
                </nav>
            </header>

            {/* ═══ Hero / Search ═══ */}
            <section className="relative bg-gradient-to-b from-[#800000] to-[#600000] pb-16 pt-8">
                <div className="max-w-7xl mx-auto px-6 mb-8">
                    {(error || message) && (
                        <div className="max-w-2xl mx-auto mb-8 rounded-xl border border-white/20 bg-white/10 backdrop-blur-md p-4 text-white animate-scale-in">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">
                                        {message || (error === "access_denied" ? "Link Expired or Invalid" : "Authentication Error")}
                                    </p>
                                    <p className="text-xs text-white/70 mt-0.5">
                                        {error_description || "Please try requesting a new password reset link."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="max-w-3xl mx-auto px-6 text-center text-white">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
                        Discover unique opportunities at{" "}
                        <span className="text-gold">PUP ITECH</span>
                    </h2>
                    <p className="mt-4 text-white/80 text-base sm:text-lg max-w-xl mx-auto">
                        Connect with student organizations, attend campus events, and engage with your community.
                    </p>

                    {/* Search Bar */}
                    <HomepageSearch
                        organizations={organizations.map((o) => ({
                            id: o.id,
                            name: o.name,
                            description: o.description,
                        }))}
                        events={events.map((e) => ({
                            id: e.id,
                            title: e.title,
                            location: e.location,
                        }))}
                        news={newsItems.map((n) => ({
                            id: n.id,
                            title: n.title,
                            content: n.content.slice(0, 140),
                        }))}
                        isLoggedIn={!!user}
                    />
                </div>
            </section>

            {/* ═══ Quick-Link Cards ═══ */}
            <section className="-mt-8 relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        icon: <Building2 className="w-8 h-8" />,
                        title: "Find Organizations",
                        desc: "Browse clubs, councils, and more",
                        href: user ? "/dashboard/organizations" : "/login",
                    },
                    {
                        icon: <CalendarDays className="w-8 h-8" />,
                        title: "Attend Events",
                        desc: "RSVP for campus activities",
                        href: user ? "/dashboard/news-and-events" : "/login",
                    },
                    {
                        icon: <BarChart3 className="w-8 h-8" />,
                        title: profile?.role === "admin" ? "Manage Platform" : "Track My Involvement",
                        desc: profile?.role === "admin" ? "Access the administrator console" : "View your memberships and history",
                        href: user ? (profile?.role === "admin" ? "/dashboard/admin" : "/dashboard/memberships") : "/login",
                    },
                ].map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="rounded-xl bg-card border border-border p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                    >
                        <div className="text-muted-foreground group-hover:text-primary transition-colors">{card.icon}</div>
                        <h3 className="mt-2 font-semibold text-foreground group-hover:text-primary transition-colors">
                            {card.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                    </Link>
                ))}
            </section>

            {/* ═══ Ongoing Elections ═══ */}
            <HomepageElectionsSection elections={electionsWithFollow} isLoggedIn={!!user} />

            {/* ═══ Events ═══ */}
            <ScrollReveal>
                <section id="events" className="max-w-5xl mx-auto px-6 mt-14">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                        Upcoming Events
                    </h2>
                    {events && events.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {events.map((ev) => (
                                <Link
                                    key={ev.id}
                                    href={user ? `/dashboard/events/${ev.id}` : "/login"}
                                    className="rounded-xl border border-border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all bg-card cursor-pointer group"
                                >
                                    <div className="h-28 bg-gradient-to-br from-[#800000] to-[#600000] flex items-center justify-center text-3xl">
                                        <CalendarDays className="w-10 h-10 text-white/80" />
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                                            {ev.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {ev.description || "No description"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" /> {ev.location}
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border bg-card p-10 flex flex-col items-center justify-center text-center">
                            <CalendarDays className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">No upcoming events yet. Check back soon!</p>
                        </div>
                    )}
                </section>
            </ScrollReveal>

            {/* ═══ Organizations ═══ */}
            <ScrollReveal delay={100}>
                <section id="organizations" className="max-w-5xl mx-auto px-6 mt-14">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                        Student Organizations
                    </h2>
                    <HomepageOrgFilter
                        organizations={organizations}
                        categories={categories}
                        isLoggedIn={!!user}
                    />
                </section>
            </ScrollReveal>

            {/* ═══ News ═══ */}
            <ScrollReveal delay={100}>
                <section id="news" className="max-w-5xl mx-auto px-6 mt-14">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Latest News */}
                        <div className="lg:col-span-2">
                            <h2 className="text-2xl font-bold text-foreground mb-6">
                                Latest News
                            </h2>
                            <div className="space-y-4">
                                {combinedFeed.length === 0 ? (
                                    <div className="rounded-xl border border-border p-8 bg-card text-center text-muted-foreground text-sm">
                                        No published news or recruitment posts yet.
                                    </div>
                                ) : (
                                    combinedFeed.map((post) => (
                                        <Link
                                            key={`${post.type}-${post.id}`}
                                            href={user ? post.link : "/login"}
                                            className="block rounded-xl border border-border bg-card overflow-hidden transition-all hover:shadow-md group flex flex-col sm:flex-row"
                                        >
                                            {post.image_url ? (
                                                <div className="w-full sm:w-72 h-48 sm:h-auto relative shrink-0 bg-muted/30">
                                                    <Image
                                                        src={post.image_url}
                                                        alt={post.title}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                            ) : (
                                                <div className={`w-full sm:w-72 h-48 sm:h-auto relative shrink-0 flex items-center justify-center bg-muted ${post.type === "recruitment" ? "text-green-500/30" : "text-primary/20"}`}>
                                                    {post.type === "recruitment" ? <ClipboardList className="w-12 h-12" aria-hidden="true" /> : <Newspaper className="w-12 h-12" aria-hidden="true" />}
                                                </div>
                                            )}

                                            <div className="p-5 sm:p-6 flex-1 flex flex-col">
                                                <h3 className="font-bold text-lg text-foreground leading-tight group-hover:text-primary transition-colors mb-2">
                                                    {post.title}
                                                </h3>
                                                <div className="text-sm text-muted-foreground mb-1">
                                                    {new Date(post.created_at).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                                                </div>
                                                <div className="text-sm text-muted-foreground italic mb-6">
                                                    Posted {post.creator_name ? `by ${post.creator_name} ` : ""}
                                                    {post.organizations && (
                                                        <>for {(post.organizations as { name: string }).name}</>
                                                    )}
                                                </div>
                                                <div className="text-sm text-foreground/80 line-clamp-2 mt-auto">
                                                    {post.body}
                                                </div>
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Campus Links */}
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-6">
                                Campus Links
                            </h2>
                            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                                {[
                                    { label: "PUP Official Website", url: "https://www.pup.edu.ph" },
                                    { label: "PUP SIS (Student Portal)", url: "https://sis2.pup.edu.ph/" },
                                    { label: "PUPLMS", url: "https://lms.pup.edu.ph/maincampus/" },
                                    { label: "Academic Calendar", url: "https://www.pup.edu.ph/about/calendar" },
                                ].map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-primary dark:text-gold hover:underline transition-colors"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                        {link.label}
                                    </a>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </ScrollReveal>

            {/* ═══ Role Highlights ═══ */}
            <ScrollReveal delay={80}>
                <section id="about" className="max-w-5xl mx-auto px-6 mt-14">
                    <h2 className="text-2xl font-bold text-foreground mb-6">
                        Get Involved Based on Your Role
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                            {
                                icon: GraduationCap,
                                iconColor: "text-primary",
                                role: "Student",
                                items: [
                                    "Join student organizations",
                                    "Register for campus events",
                                    "Track your involvement",
                                ],
                                color: "border-primary",
                            },
                            {
                                icon: ShieldCheck,
                                iconColor: "text-gold",
                                role: "Student Officer",
                                items: [
                                    "Manage organization members",
                                    "Create and publish events",
                                    "Submit accreditation documents",
                                    "Vote in elections",
                                ],
                                color: "border-gold",
                            },
                            {
                                icon: Settings,
                                iconColor: "text-muted-foreground",
                                role: "Administrator",
                                items: [
                                    "Approve organizations",
                                    "Review accreditation",
                                    "Manage elections",
                                    "Platform oversight",
                                ],
                                color: "border-border",
                            },
                        ].map((r, i) => {
                            const Icon = r.icon;
                            return (
                                <div
                                    key={i}
                                    className={`rounded-xl border-2 ${r.color} p-5 bg-card`}
                                >
                                    <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                                        <Icon className={`w-5 h-5 ${r.iconColor}`} aria-hidden="true" />
                                        {r.role}
                                    </h3>
                                    <ul className="mt-3 space-y-2">
                                        {r.items.map((item, j) => (
                                            <li
                                                key={j}
                                                className="flex items-start gap-2 text-sm text-muted-foreground"
                                            >
                                                <span className="text-gold mt-0.5">✦</span>
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </ScrollReveal>

            {/* ═══ CTA ═══ */}
            <section className="bg-primary py-12 mt-14">
                <div className="max-w-3xl mx-auto px-6 text-center text-white">
                    <h2 className="text-2xl sm:text-3xl font-bold">
                        Ready to engage with your campus?
                    </h2>
                    <p className="mt-3 text-white/80">
                        Join ITECHEngage today and be part of the PUP ITECH community.
                    </p>
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                        {user ? (
                            <Link
                                href="/dashboard"
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-lg bg-gold text-[#2B2B2B] font-semibold hover:bg-gold/90 transition-colors shadow-lg"
                            >
                                Go to Dashboard →
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/signup"
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-lg bg-gold text-[#2B2B2B] font-semibold hover:bg-gold/90 transition-colors shadow-lg"
                                >
                                    Create Account →
                                </Link>
                                <Link
                                    href="/login"
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-lg border border-white/30 text-white font-medium hover:bg-white/10 transition-colors"
                                >
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* ═══ Footer ═══ */}
            <footer className="bg-[#2B2B2B] text-white/60 py-10">
                <div className="max-w-5xl mx-auto px-6 sm:px-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Image
                                    src="/logo.png"
                                    alt="ITECHEngage"
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                />
                                <span className="text-white font-semibold">ITECHEngage</span>
                            </div>
                            <p className="text-xs leading-relaxed">
                                Campus Engagement Platform for<br />
                                Polytechnic University of the Philippines<br />
                                Institute of Technology
                            </p>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
                            <ul className="space-y-1.5 text-xs">
                                <li><Link href={user ? "/dashboard/organizations" : "/login"} className="hover:text-white transition-colors">Organizations</Link></li>
                                <li><Link href={user ? "/dashboard/events" : "/login"} className="hover:text-white transition-colors">Events</Link></li>
                                <li><Link href={user ? "/dashboard/elections" : "/login"} className="hover:text-white transition-colors">Elections</Link></li>
                                <li><Link href={user ? "/dashboard/accreditation" : "/login"} className="hover:text-white transition-colors">Accreditation</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold text-sm mb-3">Resources</h4>
                            <ul className="space-y-1.5 text-xs">
                                <li><a href="https://www.pup.edu.ph" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">PUP Website</a></li>
                                <li><a href="https://sis2.pup.edu.ph/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Student Portal</a></li>
                                <li><a href="https://lms.pup.edu.ph/maincampus/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">PUPLMS</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white font-semibold text-sm mb-3">Legal &amp; Support</h4>
                            <ul className="space-y-1.5 text-xs">
                                <li><Link href="/terms" className="hover:text-white transition-colors">Terms &amp; Agreement</Link></li>
                                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                                <li><Link href="/feedback" className="hover:text-white transition-colors">Feedback &amp; Suggestions</Link></li>
                                <li><a href="mailto:team12itechengage@gmail.com" className="hover:text-white transition-colors">Contact</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/10 pt-6 text-xs text-center">
                        © 2026 ITECHEngage — Polytechnic University of the Philippines,
                        Institute of Technology.
                    </div>
                </div>
            </footer>
        </div>
    );
}