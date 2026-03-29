import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import UserMenu from "@/components/UserMenu";
import HomepageSearch from "@/components/HomepageSearch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    let profile: { full_name: string; role: string } | null = null;
    if (user) {
        const { data } = await supabase
            .from("profiles")
            .select("full_name, role")
            .eq("id", user.id)
            .single();
        profile = data;
    }

    const { data: events } = await supabase
        .from("events")
        .select("id, title, description, start_datetime, location, organizations(name)")
        .eq("status", "published")
        .order("start_datetime", { ascending: true })
        .limit(4);

    const { data: organizations } = await supabase
        .from("organizations")
        .select("id, name, description, logo_url, accreditation_status")
        .eq("visibility", "public")
        .order("name", { ascending: true })
        .limit(6);

    const { data: newsItems } = await supabase
        .from("news")
        .select("id, title, content, published_at, created_at, organizations(name)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);

    const { data: activeElections } = await supabase
        .from("elections")
        .select("id, title, status, start_date, end_date, organizations(name)")
        .in("status", ["active", "completed"])
        .order("start_date", { ascending: false })
        .limit(3);

    return (
        <div className="min-h-screen bg-white">
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
                        organizations={(organizations || []).map(o => ({ id: o.id, name: o.name, description: o.description }))}
                        events={(events || []).map(e => ({ id: e.id, title: e.title, location: e.location }))}
                        news={(newsItems || []).map(n => ({ id: n.id, title: n.title, content: n.content }))}
                        isLoggedIn={!!user}
                    />
                </div>
            </section>

            {/* ═══ Quick-Link Cards ═══ */}
            <section className="-mt-8 relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    {
                        icon: "🏢",
                        title: "Find Organizations",
                        desc: "Browse clubs, councils, and more",
                        href: user ? "/dashboard/organizations" : "/login",
                    },
                    {
                        icon: "📅",
                        title: "Attend Events",
                        desc: "RSVP for campus activities",
                        href: user ? "/dashboard/news-and-events" : "/login",
                    },
                    {
                        icon: "📊",
                        title: "Track My Involvement",
                        desc: "View your memberships and history",
                        href: user ? "/dashboard/memberships" : "/login",
                    },
                ].map((card) => (
                    <Link
                        key={card.title}
                        href={card.href}
                        className="rounded-xl bg-white border border-[#D9D9D9] p-5 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                    >
                        <span className="text-3xl">{card.icon}</span>
                        <h3 className="mt-2 font-semibold text-[#2B2B2B] group-hover:text-[#800000] transition-colors">
                            {card.title}
                        </h3>
                        <p className="text-xs text-[#6E6E6E] mt-1">{card.desc}</p>
                    </Link>
                ))}
            </section>

            {/* ═══ Live Elections ═══ */}
            {activeElections && activeElections.length > 0 && (
                <section id="elections" className="max-w-5xl mx-auto px-6 mt-14">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-[#2B2B2B]">
                            Live Elections
                        </h2>
                        <span className="flex items-center gap-2 text-sm text-[#800000] font-semibold animate-pulse">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Active Now
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {activeElections.map((election) => {
                            const now = new Date();
                            const start = new Date(election.start_date);
                            const end = election.end_date ? new Date(election.end_date) : null;
                            const isVotingOpen = election.status === "active" && now >= start && (!end || now <= end);
                            const statusColor = isVotingOpen ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700";
                            const statusLabel = isVotingOpen ? "Voting Open" : "Completed";

                            return (
                                <Link
                                    key={election.id}
                                    href={user ? `/dashboard/elections/${election.id}` : "/login"}
                                    className="block p-5 rounded-xl border border-primary/20 bg-white hover:border-primary/50 hover:shadow-md transition-all group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#800000] to-[#C9A227]"></div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                                            {statusLabel}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground truncate">
                                            {election.organizations && typeof election.organizations === 'object' && !Array.isArray(election.organizations) ? (election.organizations as { name?: string }).name : ""}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[#2B2B2B] text-lg leading-tight group-hover:text-[#800000] transition-colors mb-2">
                                        {election.title}
                                    </h3>
                                    <p className="text-xs text-[#6E6E6E] flex items-center gap-1.5">
                                        <span>⏳</span> {end ? new Date(election.end_date).toLocaleDateString() : "Ongoing"}
                                    </p>
                                </Link>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ═══ Events ═══ */}
            <section id="events" className="max-w-5xl mx-auto px-6 mt-14">
                <h2 className="text-2xl font-bold text-[#2B2B2B] mb-6">
                    Upcoming Events
                </h2>
                {events && events.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {events.map((ev) => (
                            <Link
                                key={ev.id}
                                href={user ? `/dashboard/events/${ev.id}` : "/login"}
                                className="rounded-xl border border-[#D9D9D9] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all bg-white cursor-pointer group"
                            >
                                <div className="h-28 bg-gradient-to-br from-[#800000] to-[#600000] flex items-center justify-center text-3xl">
                                    📅
                                </div>
                                <div className="p-4">
                                    <h3 className="font-semibold text-sm text-[#2B2B2B] line-clamp-1 group-hover:text-[#800000] transition-colors">
                                        {ev.title}
                                    </h3>
                                    <p className="text-xs text-[#6E6E6E] mt-1 line-clamp-2">
                                        {ev.description || "No description"}
                                    </p>
                                    <p className="text-[10px] text-[#6E6E6E] mt-2">
                                        📍 {ev.location}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-[#D9D9D9] bg-white p-10 text-center">
                        <p className="text-3xl mb-3">📅</p>
                        <p className="text-sm text-[#6E6E6E]">No upcoming events yet. Check back soon!</p>
                    </div>
                )}
            </section>

            {/* ═══ Organizations ═══ */}
            <section id="organizations" className="max-w-5xl mx-auto px-6 mt-14">
                <h2 className="text-2xl font-bold text-[#2B2B2B] mb-6">
                    Student Organizations
                </h2>
                {organizations && organizations.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">
                        {organizations.map((org) => (
                            <Link
                                key={org.id}
                                href={user ? `/dashboard/organizations/${org.id}` : "/login"}
                                className="w-full aspect-square max-w-[220px] rounded-2xl border border-[#D9D9D9] bg-white hover:shadow-lg hover:-translate-y-1 transition-all flex flex-col items-center justify-center p-5 group"
                            >
                                <div className="w-20 h-20 rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden shrink-0 mb-4">
                                    {org.logo_url ? (
                                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl">🏢</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-sm text-[#2B2B2B] text-center line-clamp-2 group-hover:text-[#800000] transition-colors">
                                    {org.name}
                                </h3>
                                <p className="text-[10px] text-[#6E6E6E] mt-1 text-center line-clamp-1">
                                    {org.description || "Student Organization"}
                                </p>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-xl border border-[#D9D9D9] bg-white p-10 text-center">
                        <p className="text-3xl mb-3">🏢</p>
                        <p className="text-sm text-[#6E6E6E]">No organizations yet. Check back soon!</p>
                    </div>
                )}
            </section>

            {/* ═══ News ═══ */}
            <section id="news" className="max-w-5xl mx-auto px-6 mt-14">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Latest News */}
                    <div className="lg:col-span-2">
                        <h2 className="text-2xl font-bold text-[#2B2B2B] mb-6">
                            Latest News
                        </h2>
                        <div className="space-y-4">
                            {newsItems && newsItems.length > 0 ? (
                                newsItems.map((item) => (
                                    <Link
                                        key={item.id}
                                        href={user ? `/dashboard/news/${item.id}` : "/login"}
                                        className="block rounded-xl border border-[#D9D9D9] p-5 bg-white hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-[10px] text-[#C9A227] font-semibold uppercase tracking-wider">
                                                {new Date(item.published_at || item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </p>
                                            <span className="text-[10px] text-[#6E6E6E]">•</span>
                                            <p className="text-[10px] text-[#6E6E6E] font-medium truncate">
                                                {item.organizations && typeof item.organizations === 'object' && !Array.isArray(item.organizations) ? (item.organizations as { name?: string }).name : ""}
                                            </p>
                                        </div>
                                        <h3 className="font-semibold text-[#2B2B2B] mt-1 group-hover:text-[#800000] transition-colors">{item.title}</h3>
                                        <p className="text-sm text-[#6E6E6E] mt-1 line-clamp-2">{item.content}</p>
                                    </Link>
                                ))
                            ) : (
                                <div className="rounded-xl border border-[#D9D9D9] p-8 bg-white text-center text-[#6E6E6E] text-sm">
                                    No published news yet.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Campus Links */}
                    <div>
                        <h2 className="text-2xl font-bold text-[#2B2B2B] mb-6">
                            Campus Links
                        </h2>
                        <div className="rounded-xl border border-[#D9D9D9] bg-white p-5 space-y-3">
                            {[
                                { label: "PUP Official Website", url: "https://www.pup.edu.ph" },
                                { label: "PUP SIS (Student Portal)", url: "https://sis2.pup.edu.ph/" },
                                { label: "PUPLMS", url: "https://lms.pup.edu.ph/maincampus/" },
                                { label: "ITECH Facebook Page", url: "#" },
                                { label: "Academic Calendar", url: "#" },
                            ].map((link, i) => (
                                <a
                                    key={i}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-sm text-[#800000] hover:text-[#600000] hover:underline transition-colors"
                                >
                                    <span className="text-xs">🔗</span>
                                    {link.label}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ═══ Role Highlights ═══ */}
            <section id="about" className="max-w-5xl mx-auto px-6 mt-14">
                <h2 className="text-2xl font-bold text-[#2B2B2B] mb-6">
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
                            color: "border-[#2B2B2B]",
                        },
                    ].map((r, i) => (
                        <div
                            key={i}
                            className={`rounded-xl border-2 ${r.color} p-5 bg-white`}
                        >
                            <h3 className="font-bold text-lg text-[#2B2B2B]">{r.role}</h3>
                            <ul className="mt-3 space-y-2">
                                {r.items.map((item, j) => (
                                    <li
                                        key={j}
                                        className="flex items-start gap-2 text-sm text-[#6E6E6E]"
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
                        Institute of Technology. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}