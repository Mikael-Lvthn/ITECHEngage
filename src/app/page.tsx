import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Building2, BarChart3 } from "lucide-react";
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
        })),
        ...(recruitments || []).map((r) => ({
            id: r.id,
            type: "recruitment" as const,
            title: r.title,
            body: r.description?.slice(0, 200) || null,
            link: `/dashboard/organizations/${r.organization_id}`,
            created_at: r.created_at,
            organizations: Array.isArray(r.organizations) ? r.organizations[0] : r.organizations,
        })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="min-h-screen bg-background">
            {isPending && <PendingVerificationBanner />}
            {isPending && <PendingAwareHomepage />}
            {/* ═══ Top Navigation ═══ */}
            <header className="bg-[#800000] text-white">
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
                                        className="bg-[#C9A227] text-[#2B2B2B] px-3 py-0.5 rounded font-medium hover:bg-[#b8911f] transition-colors"
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
                                    <span className="text-sm">⚠️</span>
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
                        <span className="text-[#C9A227]">PUP ITECH</span>
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
                        title: "Track My Involvement",
                        desc: "View your memberships and history",
                        href: user ? "/dashboard/memberships" : "/login",
                    },
                ].map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="rounded-xl bg-card border border-border p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                    >
                        <div className="text-muted-foreground group-hover:text-[#800000] transition-colors">{card.icon}</div>
                        <h3 className="mt-2 font-semibold text-foreground group-hover:text-[#800000] transition-colors">
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
                                        <h3 className="font-semibold text-sm text-foreground line-clamp-1 group-hover:text-[#800000] transition-colors">
                                            {ev.title}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {ev.description || "No description"}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            📍 {ev.location}
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
                                            className="block rounded-xl border border-border bg-card overflow-hidden transition-colors hover:bg-accent/30 group"
                                        >
                                            <div className={`h-1 ${post.type === "recruitment" ? "bg-gradient-to-r from-green-500 to-green-400" : "bg-gradient-to-r from-[#800000] to-[#A52A2A]"}`} />
                                            <div className="p-5">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 text-xl">
                                                        {post.type === "recruitment" ? "📋" : "📰"}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${post.type === "recruitment" ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"}`}>
                                                                {post.type}
                                                            </span>
                                                            {post.organizations && (
                                                                <span className="text-[10px] text-muted-foreground">{(post.organizations as { name: string }).name}</span>
                                                            )}
                                                        </div>
                                                        <h3 className="font-semibold text-foreground leading-tight group-hover:text-[#800000] transition-colors">{post.title}</h3>
                                                        {post.body && (
                                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.body}</p>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-2">
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                                            </p>
                                                            <span className="text-[10px] font-semibold text-[#800000] group-hover:underline">
                                                                View →
                                                            </span>
                                                        </div>
                                                    </div>
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
                                        className="flex items-center gap-2 text-sm text-[#800000] dark:text-[#C9A227] hover:text-[#600000] dark:hover:text-[#b8911f] hover:underline transition-colors"
                                    >
                                        <span className="text-xs">🔗</span>
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
                                role: "🎓 Student",
                                items: [
                                    "Join student organizations",
                                    "Register for campus events",
                                    "Track your involvement",
                                ],
                                color: "border-[#800000]",
                            },
                            {
                                role: "🛡️ Student Officer",
                                items: [
                                    "Manage organization members",
                                    "Create and publish events",
                                    "Submit accreditation documents",
                                    "Vote in elections",
                                ],
                                color: "border-[#C9A227]",
                            },
                            {
                                role: "⚙️ Administrator",
                                items: [
                                    "Approve organizations",
                                    "Review accreditation",
                                    "Manage elections",
                                    "Platform oversight",
                                ],
                                color: "border-border dark:border-[#2B2B2B]",
                            },
                        ].map((r, i) => (
                            <div
                                key={i}
                                className={`rounded-xl border-2 ${r.color} p-5 bg-card`}
                            >
                                <h3 className="font-bold text-lg text-foreground">{r.role}</h3>
                                <ul className="mt-3 space-y-2">
                                    {r.items.map((item, j) => (
                                        <li
                                            key={j}
                                            className="flex items-start gap-2 text-sm text-muted-foreground"
                                        >
                                            <span className="text-[#C9A227] mt-0.5">✦</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>
            </ScrollReveal>

            {/* ═══ CTA ═══ */}
            <section className="bg-[#800000] py-12 mt-14">
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
                                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-lg bg-[#C9A227] text-[#2B2B2B] font-semibold hover:bg-[#b8911f] transition-colors shadow-lg"
                            >
                                Go to Dashboard →
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href="/signup"
                                    className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 rounded-lg bg-[#C9A227] text-[#2B2B2B] font-semibold hover:bg-[#b8911f] transition-colors shadow-lg"
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">
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
                                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
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