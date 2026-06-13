import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const typeBadgeStyle: Record<string, string> = {
    news: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    event: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    recruitment: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    system: "bg-[#800000]/10 text-[#800000] border-[#800000]/20",
    special: "bg-[#C9A227]/10 text-[#C9A227] border-[#C9A227]/20",
};

const typeEmoji: Record<string, string> = {
    news: "📰",
    event: "📅",
    recruitment: "📋",
    system: "📣",
    special: "⭐",
};

export default async function BulletinPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const [bulletinResult, topNewsResult, topEventsResult] = await Promise.all([
        supabase
            .from("bulletin_board_posts")
            .select("id, type, title, body, link, pinned, created_at, expires_at, organizations(name)")
            .order("pinned", { ascending: false })
            .order("created_at", { ascending: false })
            .limit(20),
        // Top-liked news (> 3 likes)
        supabase
            .from("news")
            .select("id, title, content, created_at, organizations(name), news_likes(count)")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(10),
        // Top-liked events (> 3 likes)
        supabase
            .from("events")
            .select("id, title, description, created_at, organizations(name), event_likes(count)")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(10),
    ]);

    const bulletinPosts = (bulletinResult.data || []).map((p) => ({
        ...p,
        organizations: Array.isArray(p.organizations) ? p.organizations[0] : p.organizations,
    }));

    // Filter top news and events with >3 likes and merge them
    const topNews = (topNewsResult.data || [])
        .filter((n) => {
            const likes = Array.isArray(n.news_likes) ? n.news_likes[0] : n.news_likes;
            return ((likes as { count: number } | null)?.count ?? 0) > 3;
        })
        .map((n) => ({
            id: n.id,
            type: "news" as const,
            title: n.title,
            body: n.content?.slice(0, 200) || null,
            link: `/dashboard/news/${n.id}`,
            pinned: false,
            created_at: n.created_at,
            organizations: Array.isArray(n.organizations) ? n.organizations[0] : n.organizations,
        }));

    const topEvents = (topEventsResult.data || [])
        .filter((e) => {
            const likes = Array.isArray(e.event_likes) ? e.event_likes[0] : e.event_likes;
            return ((likes as { count: number } | null)?.count ?? 0) > 3;
        })
        .map((e) => ({
            id: e.id,
            type: "event" as const,
            title: e.title,
            body: e.description?.slice(0, 200) || null,
            link: `/dashboard/events/${e.id}`,
            pinned: false,
            created_at: e.created_at,
            organizations: Array.isArray(e.organizations) ? e.organizations[0] : e.organizations,
        }));

    // Merge and sort: pinned first, then by date
    const allPosts = [
        ...bulletinPosts,
        ...topNews,
        ...topEvents,
    ].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">📌 Bulletin Board</h1>
                    <p className="text-muted-foreground mt-1">
                        Latest announcements, events, and featured content from your campus community.
                    </p>
                </div>
            </div>

            {allPosts.length === 0 ? (
                <div className="rounded-xl border bg-card p-12 text-center">
                    <p className="text-3xl mb-3">📌</p>
                    <h2 className="font-semibold text-foreground">No posts yet</h2>
                    <p className="text-sm text-muted-foreground mt-2">
                        Bulletin posts from administrators and featured content will appear here.
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {allPosts.map((post) => (
                        <div
                            key={`${post.type}-${post.id}`}
                            className={`rounded-xl border bg-card overflow-hidden transition-colors hover:bg-accent/30 ${
                                post.pinned ? "border-[#C9A227]/40 shadow-sm" : ""
                            }`}
                        >
                            <div className={`h-1 ${post.pinned ? "bg-gradient-to-r from-[#C9A227] to-[#E6C84D]" : "bg-gradient-to-r from-[#800000] to-[#A52A2A]"}`} />
                            <div className="p-5">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 text-xl">
                                        {post.pinned ? "📌" : typeEmoji[post.type] || "📌"}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            {post.pinned && (
                                                <span className="text-[10px] font-bold text-[#C9A227] uppercase tracking-wider">Pinned</span>
                                            )}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${typeBadgeStyle[post.type] || "bg-muted text-muted-foreground border-border"}`}>
                                                {post.type}
                                            </span>
                                            {post.organizations && (
                                                <span className="text-[10px] text-muted-foreground">{(post.organizations as { name: string }).name}</span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-foreground leading-tight">{post.title}</h3>
                                        {post.body && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{post.body}</p>
                                        )}
                                        <div className="flex items-center gap-3 mt-2">
                                            <p className="text-[10px] text-muted-foreground">
                                                {new Date(post.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </p>
                                            {"link" in post && post.link && (
                                                <Link
                                                    href={post.link}
                                                    className="text-[10px] font-semibold text-[#800000] hover:underline"
                                                >
                                                    View →
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
