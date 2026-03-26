import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LikeShareButtons from "@/components/LikeShareButtons";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function NewsDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: newsItem } = await supabase
        .from("news")
        .select("*, organizations(name, logo_url)")
        .eq("id", id)
        .single();

    if (!newsItem) notFound();

    const publishedDate = newsItem.published_at || newsItem.created_at;

    let likeCount = 0;
    let userLiked = false;

    const { count } = await supabase
        .from("news_likes")
        .select("*", { count: "exact", head: true })
        .eq("news_id", id);

    likeCount = count || 0;

    if (user) {
        const { data: likeRow } = await supabase
            .from("news_likes")
            .select("id")
            .eq("news_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        userLiked = !!likeRow;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Link
                href="/dashboard/news-and-events"
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
                ← Back to News & Events
            </Link>

            <article className="rounded-xl border bg-white shadow-sm overflow-hidden">
                {newsItem.image_url && (
                    <img
                        src={newsItem.image_url}
                        alt={newsItem.title}
                        className="w-full h-64 object-cover"
                    />
                )}

                <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        {newsItem.organizations && !Array.isArray(newsItem.organizations) && typeof newsItem.organizations === 'object' && 'logo_url' in newsItem.organizations && newsItem.organizations.logo_url ? (
                            <img
                                src={String(newsItem.organizations.logo_url)}
                                alt=""
                                className="w-10 h-10 rounded-lg object-cover border"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#800000]/10 flex items-center justify-center">
                                <span className="text-lg">🏢</span>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold text-gray-900">
                                {newsItem.organizations && !Array.isArray(newsItem.organizations) && typeof newsItem.organizations === 'object' && 'name' in newsItem.organizations ? String(newsItem.organizations.name) : "Unknown Organization"}
                            </p>
                            <p className="text-xs text-gray-500">
                                {new Date(publishedDate).toLocaleDateString("en-US", {
                                    month: "long",
                                    day: "numeric",
                                    year: "numeric",
                                })}
                            </p>
                        </div>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                        {newsItem.title}
                    </h1>

                    <div className="flex items-center gap-3 mb-6 pb-6 border-b">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${newsItem.status === "published"
                            ? "bg-green-100 text-green-800 border border-green-200"
                            : newsItem.status === "pending"
                                ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                                : "bg-gray-100 text-gray-700 border border-gray-200"
                            }`}>
                            {newsItem.status}
                        </span>
                    </div>

                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {newsItem.content}
                    </div>

                    <div className="mt-8 pt-6 border-t">
                        <LikeShareButtons
                            itemId={id}
                            itemType="news"
                            initialLikeCount={likeCount}
                            initialLiked={userLiked}
                            title={newsItem.title}
                        />
                    </div>
                </div>
            </article>
        </div>
    );
}
