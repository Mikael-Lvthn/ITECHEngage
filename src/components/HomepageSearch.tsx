"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

interface SearchableItem {
    type: "organization" | "event" | "news";
    id: string;
    title: string;
    subtitle: string;
    href: string;
    icon: string;
}

interface HomepageSearchProps {
    organizations: { id: string; name: string; description: string | null }[];
    events: { id: string; title: string; location: string }[];
    news: { id: string; title: string; content: string }[];
    isLoggedIn: boolean;
}

export default function HomepageSearch({ organizations, events, news, isLoggedIn }: HomepageSearchProps) {
    const [query, setQuery] = useState("");
    const [focused, setFocused] = useState(false);

    const allItems: SearchableItem[] = useMemo(() => {
        const items: SearchableItem[] = [];
        organizations.forEach(org => items.push({
            type: "organization", id: org.id, title: org.name,
            subtitle: org.description || "Student Organization",
            href: isLoggedIn ? `/dashboard/organizations/${org.id}` : "/login",
            icon: "🏢"
        }));
        events.forEach(ev => items.push({
            type: "event", id: ev.id, title: ev.title,
            subtitle: ev.location || "Campus Event",
            href: isLoggedIn ? "/dashboard/news-and-events" : "/login",
            icon: "📅"
        }));
        news.forEach(n => items.push({
            type: "news", id: n.id, title: n.title,
            subtitle: n.content?.slice(0, 80) || "News Article",
            href: isLoggedIn ? "/dashboard/news-and-events" : "/login",
            icon: "📰"
        }));
        return items;
    }, [organizations, events, news, isLoggedIn]);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return allItems.filter(item =>
            item.title.toLowerCase().includes(q) ||
            item.subtitle.toLowerCase().includes(q)
        ).slice(0, 8);
    }, [query, allItems]);

    const showDropdown = focused && query.trim().length > 0;

    return (
        <div className="mt-8 max-w-xl mx-auto relative">
            <div className="relative">
                <svg
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6E6E6E]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                </svg>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setTimeout(() => setFocused(false), 200)}
                    placeholder="Search for organizations, events, or news..."
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white text-[#2B2B2B] text-sm placeholder:text-[#6E6E6E] focus:outline-none focus:ring-2 focus:ring-[#C9A227] shadow-lg"
                />
            </div>

            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
                    {results.length > 0 ? (
                        <div className="max-h-80 overflow-y-auto">
                            {results.map((item, i) => (
                                <Link
                                    key={`${item.type}-${item.id}`}
                                    href={item.href}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                                >
                                    <span className="text-xl shrink-0">{item.icon}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-[#2B2B2B] truncate">{item.title}</p>
                                        <p className="text-xs text-[#6E6E6E] truncate">{item.subtitle}</p>
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#800000]/60 bg-[#800000]/5 px-2 py-0.5 rounded-full shrink-0">
                                        {item.type}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="px-4 py-6 text-center text-sm text-[#6E6E6E]">
                            No results found for &ldquo;{query}&rdquo;
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
