import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/* ─── Type config ──────────────────────────────────────────────────── */
const TYPE_CONFIG: Record<string, { label: string; bg: string; text: string; accent: string }> = {
    news:        { label: "News",        bg: "bg-sky-500",        text: "text-white",   accent: "bg-sky-50 border-sky-200 text-sky-800" },
    event:       { label: "Event",       bg: "bg-violet-500",     text: "text-white",   accent: "bg-violet-50 border-violet-200 text-violet-800" },
    recruitment: { label: "Recruitment", bg: "bg-emerald-500",    text: "text-white",   accent: "bg-emerald-50 border-emerald-200 text-emerald-800" },
    election:    { label: "Election",    bg: "bg-indigo-500",     text: "text-white",   accent: "bg-indigo-50 border-indigo-200 text-indigo-800" },
    system:      { label: "System",      bg: "bg-[#800000]",      text: "text-white",   accent: "bg-red-50 border-red-200 text-[#800000]" },
    urgent:      { label: "Urgent",      bg: "bg-orange-500",     text: "text-white",   accent: "bg-orange-50 border-orange-200 text-orange-800" },
    special:     { label: "Special",     bg: "bg-[#C9A227]",      text: "text-[#2B2B2B]", accent: "bg-yellow-50 border-yellow-200 text-yellow-800" },
};

/* Soft card background per type */
const CARD_BG: Record<string, string> = {
    news:        "bg-amber-50  border-amber-200",
    event:       "bg-violet-50 border-violet-200",
    recruitment: "bg-teal-50   border-teal-200",
    election:    "bg-indigo-50 border-indigo-200",
    system:      "bg-rose-50   border-rose-200",
    urgent:      "bg-orange-50 border-orange-200",
    special:     "bg-yellow-50 border-yellow-200",
};

function getConfig(type: string) {
    return TYPE_CONFIG[type] ?? TYPE_CONFIG.news;
}
function getCardBg(type: string, pinned: boolean) {
    if (pinned) return "bg-amber-50 border-amber-300";
    return CARD_BG[type] ?? "bg-white border-gray-200";
}

/* ─── Post type ────────────────────────────────────────────────────── */
interface Post {
    id: string;
    type: string;
    title: string;
    body: string | null;
    link: string | null;
    pinned: boolean;
    created_at: string;
    organizations: { name: string } | null;
}

/* ─── Server Component ─────────────────────────────────────────────── */
export default async function BulletinPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    /* Parallel data fetch */
    const [
        bulletinResult,
        topNewsResult,
        topEventsResult,
        recruitmentResult,
        electionsResult,
        upcomingEventsResult,
    ] = await Promise.all([
        supabase
            .from("bulletin_board_posts")
            .select("id, type, title, body, link, pinned, created_at, expires_at, organizations(name)")
            .order("pinned",      { ascending: false })
            .order("created_at",  { ascending: false })
            .limit(20),
        supabase
            .from("news")
            .select("id, title, content, created_at, organizations(name), news_likes(count)")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(10),
        supabase
            .from("events")
            .select("id, title, description, created_at, organizations(name), event_likes(count)")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(10),
        supabase
            .from("recruitment_requests")
            .select("id, title, description, created_at, organization_id, organizations(name)")
            .eq("is_active", true)
            .order("created_at", { ascending: false })
            .limit(15),
        supabase
            .from("elections")
            .select("id", { count: "exact", head: true })
            .in("status", ["published", "voting"]),
        supabase
            .from("events")
            .select("id", { count: "exact", head: true })
            .eq("status", "published")
            .gte("start_datetime", new Date().toISOString()),
    ]);

    /* Normalise bulletin posts */
    const bulletinPosts: Post[] = (bulletinResult.data || []).map((p) => ({
        ...p,
        organizations: Array.isArray(p.organizations) ? p.organizations[0] : p.organizations,
    })) as Post[];

    /* Top news (>3 likes) */
    const topNews: Post[] = (topNewsResult.data || [])
        .filter((n) => {
            const likes = Array.isArray(n.news_likes) ? n.news_likes[0] : n.news_likes;
            return ((likes as { count: number } | null)?.count ?? 0) > 3;
        })
        .map((n) => ({
            id: n.id,
            type: "news",
            title: n.title,
            body: n.content?.slice(0, 200) || null,
            link: `/dashboard/news/${n.id}`,
            pinned: false,
            created_at: n.created_at,
            organizations: Array.isArray(n.organizations) ? n.organizations[0] : n.organizations,
        }));

    /* Top events (>3 likes) */
    const topEvents: Post[] = (topEventsResult.data || [])
        .filter((e) => {
            const likes = Array.isArray(e.event_likes) ? e.event_likes[0] : e.event_likes;
            return ((likes as { count: number } | null)?.count ?? 0) > 3;
        })
        .map((e) => ({
            id: e.id,
            type: "event",
            title: e.title,
            body: e.description?.slice(0, 200) || null,
            link: `/dashboard/events/${e.id}`,
            pinned: false,
            created_at: e.created_at,
            organizations: Array.isArray(e.organizations) ? e.organizations[0] : e.organizations,
        }));

    /* Active recruitments */
    const activeRecruitments: Post[] = (recruitmentResult.data || []).map((r) => ({
        id: r.id,
        type: "recruitment",
        title: r.title,
        body: r.description?.slice(0, 200) || null,
        link: `/dashboard/organizations/${r.organization_id}`,
        pinned: false,
        created_at: r.created_at,
        organizations: Array.isArray(r.organizations) ? r.organizations[0] : r.organizations,
    }));

    /* Merge & sort: pinned first, then by date */
    const allPosts: Post[] = [
        ...bulletinPosts,
        ...topNews,
        ...topEvents,
        ...activeRecruitments,
    ].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    /* Sidebar stats */
    const activeElectionsCount  = electionsResult.count  ?? 0;
    const upcomingEventsCount   = upcomingEventsResult.count ?? 0;
    const openRecruitmentsCount = activeRecruitments.length;
    const uniqueRecruitingOrgs  = new Set(activeRecruitments.map((r) => r.organizations?.name)).size;

    /* Ticker text */
    const tickerItems = allPosts.slice(0, 6).map((p) => p.title);

    /* Pinned / non-pinned split */
    const pinnedPosts  = allPosts.filter((p) => p.pinned);
    const recentPosts  = allPosts.filter((p) => !p.pinned);

    /* Today label */
    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    return (
        <div className="space-y-0 -mt-2">
            {/* ═══ Header ═══ */}
            <div className="rounded-t-2xl overflow-hidden">
                <div
                    className="px-6 py-4 flex items-end justify-between"
                    style={{ background: "linear-gradient(135deg, #3b2a1a 0%, #5c3d20 50%, #3b2a1a 100%)" }}
                >
                    <div>
                        <p className="text-[11px] font-bold tracking-[0.2em] text-amber-300/80 uppercase mb-0.5">
                            ITECH ENGAGE
                        </p>
                        <h1 className="text-2xl font-extrabold text-white tracking-tight">
                            Digital Bulletin Board
                        </h1>
                    </div>
                    <p className="text-sm text-amber-200/70 hidden sm:block">{today}</p>
                </div>

                {/* Ticker */}
                <div
                    className="overflow-hidden flex items-center gap-0 py-2 px-0"
                    style={{ background: "#2a1a0e" }}
                >
                    <div className="shrink-0 px-4 text-xs font-bold text-amber-400 uppercase tracking-widest border-r border-amber-800 mr-4">
                        Live
                    </div>
                    <div className="ticker-container overflow-hidden flex-1">
                        <div className="ticker-content whitespace-nowrap text-xs text-amber-200/80">
                            {tickerItems.length > 0
                                ? tickerItems.map((t, i) => (
                                    <span key={i}>
                                        <span className="text-amber-400 mx-2">•</span>
                                        {t}
                                    </span>
                                ))
                                : <span className="text-amber-200/50 italic">No announcements</span>
                            }
                            {/* Duplicate for seamless loop */}
                            {tickerItems.length > 0 && tickerItems.map((t, i) => (
                                <span key={`dup-${i}`}>
                                    <span className="text-amber-400 mx-2">•</span>
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ Body ═══ */}
            <div
                className="rounded-b-2xl p-5"
                style={{ background: "linear-gradient(180deg, #c8a97e 0%, #b8936a 100%)" }}
            >
                <div className="flex gap-5 items-start">

                    {/* ── Left: Posts ── */}
                    <div className="flex-1 min-w-0 space-y-5">

                        {/* Pinned section */}
                        {pinnedPosts.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold tracking-[0.18em] text-amber-900/60 uppercase mb-2 px-1">
                                    Pinned Announcements
                                </p>
                                <div className="columns-2 gap-3 space-y-0">
                                    {pinnedPosts.map((post) => (
                                        <PostCard key={`pin-${post.id}`} post={post} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* All posts grid */}
                        {recentPosts.length > 0 && (
                            <div className="columns-2 gap-3">
                                {recentPosts.map((post) => (
                                    <PostCard key={`${post.type}-${post.id}`} post={post} />
                                ))}
                            </div>
                        )}

                        {allPosts.length === 0 && (
                            <div className="rounded-xl border-2 border-dashed border-amber-700/30 bg-amber-50/40 p-12 text-center">
                                <p className="text-4xl mb-3">📌</p>
                                <h2 className="font-bold text-amber-900">No posts yet</h2>
                                <p className="text-sm text-amber-800/60 mt-1">
                                    Bulletin posts from administrators and featured content will appear here.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* ── Right: Sidebar ── */}
                    <div className="w-48 shrink-0 space-y-3">

                        {/* Quick Stats */}
                        <div className="rounded-xl overflow-hidden shadow-sm">
                            <div className="px-3 py-2 bg-amber-900/80">
                                <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">Quick Stats</p>
                            </div>
                            <div className="bg-amber-50/90 divide-y divide-amber-200/60">
                                <StatRow label="Active Elections" value={activeElectionsCount} sub="voting open now" />
                                <StatRow label="Upcoming Events" value={upcomingEventsCount} sub="next 14 days" />
                                <StatRow
                                    label="Open Recruitments"
                                    value={openRecruitmentsCount}
                                    sub={`across ${uniqueRecruitingOrgs} org${uniqueRecruitingOrgs !== 1 ? "s" : ""}`}
                                />
                            </div>
                        </div>

                        {/* Recent Posts */}
                        {recentPosts.length > 0 && (
                            <div className="rounded-xl overflow-hidden shadow-sm">
                                <div className="px-3 py-2 bg-amber-900/80">
                                    <p className="text-[10px] font-bold tracking-widest text-amber-300 uppercase">Recent Posts</p>
                                </div>
                                <div className="bg-amber-50/90 divide-y divide-amber-200/60">
                                    {recentPosts.slice(0, 5).map((post) => (
                                        <RecentRow key={post.id} post={post} />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Ticker animation */}
            <style>{`
                .ticker-container { position: relative; }
                .ticker-content {
                    display: inline-block;
                    animation: ticker-scroll 30s linear infinite;
                }
                @keyframes ticker-scroll {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .ticker-container:hover .ticker-content { animation-play-state: paused; }
            `}</style>
        </div>
    );
}

/* ─── Post Card ────────────────────────────────────────────────────── */
function PostCard({ post }: { post: Post }) {
    const cfg = getConfig(post.type);
    const cardBg = getCardBg(post.type, post.pinned);
    const orgName = (post.organizations as { name: string } | null)?.name;
    const dateStr = new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const inner = (
        <div
            className={`break-inside-avoid mb-3 rounded-xl border-2 ${cardBg} shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md relative`}
        >
            {/* Top dot accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                <div className={`w-3 h-3 rounded-full ${cfg.bg} ring-2 ring-white shadow-sm`} />
            </div>

            <div className="px-4 pt-5 pb-4">
                {/* Badges */}
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>
                        {cfg.label}
                    </span>
                    {post.pinned && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-700 text-white">
                            pinned
                        </span>
                    )}
                </div>

                {/* Title */}
                <h3 className="font-bold text-gray-900 text-sm leading-snug mb-2">
                    {post.title}
                </h3>

                {/* Body */}
                {post.body && (
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-4 mb-3">
                        {post.body}
                    </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-black/10">
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="text-[9px]">🏢</span>
                        <span className="text-[10px] text-gray-500 truncate max-w-[80px]">
                            {orgName || "ITECHEngage"}
                        </span>
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 ml-1">{dateStr}</span>
                </div>
            </div>
        </div>
    );

    if (post.link) {
        return <Link href={post.link} className="block">{inner}</Link>;
    }
    return inner;
}

/* ─── Sidebar helpers ──────────────────────────────────────────────── */
function StatRow({ label, value, sub }: { label: string; value: number; sub: string }) {
    return (
        <div className="px-3 py-2.5">
            <p className="text-[10px] font-semibold text-amber-900/70 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-extrabold text-amber-950 leading-none mt-0.5">{value}</p>
            <p className="text-[10px] text-amber-800/60 mt-0.5">{sub}</p>
        </div>
    );
}

function RecentRow({ post }: { post: Post }) {
    const orgName = (post.organizations as { name: string } | null)?.name;
    const dateStr = new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const inner = (
        <div className="px-3 py-2 hover:bg-amber-100/70 transition-colors">
            <p className="text-[11px] font-semibold text-amber-950 leading-tight line-clamp-2">{post.title}</p>
            <p className="text-[10px] text-amber-800/60 mt-0.5">{orgName} · {dateStr}</p>
        </div>
    );

    if (post.link) {
        return <Link href={post.link} className="block">{inner}</Link>;
    }
    return <div>{inner}</div>;
}
