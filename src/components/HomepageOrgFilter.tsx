"use client";

import { useState } from "react";
import type { HomepageOrganization, HomepageCategory } from "@/lib/homepage-data";

interface HomepageOrgFilterProps {
    organizations: HomepageOrganization[];
    categories: HomepageCategory[];
    isLoggedIn: boolean;
}

export default function HomepageOrgFilter({ organizations, categories, isLoggedIn }: HomepageOrgFilterProps) {
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [fading, setFading] = useState(false);

    function handleFilter(id: string | null) {
        if (id === activeCategory) return;
        setFading(true);
        setTimeout(() => {
            setActiveCategory(id);
            setFading(false);
        }, 150);
    }

    const filtered = activeCategory
        ? organizations.filter((o) => o.category_id === activeCategory)
        : organizations;

    return (
        <div>
            {/* Pill filter row */}
            {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
                    <button
                        onClick={() => handleFilter(null)}
                        className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                            !activeCategory
                                ? "bg-[#800000] text-white shadow-sm"
                                : "bg-card border border-border text-foreground hover:border-[#800000] hover:text-[#800000]"
                        }`}
                    >
                        All
                    </button>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleFilter(cat.id)}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                                activeCategory === cat.id
                                    ? "bg-[#800000] text-white shadow-sm"
                                    : "bg-card border border-border text-foreground hover:border-[#800000] hover:text-[#800000]"
                            }`}
                        >
                            {cat.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Grid */}
            <div
                style={{
                    opacity: fading ? 0 : 1,
                    transition: "opacity 0.15s ease",
                }}
            >
                {filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <p className="text-3xl mb-2">🏢</p>
                        <p className="text-sm">No organizations in this category yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filtered.map((org) => (
                            <a
                                key={org.id}
                                href={isLoggedIn ? `/dashboard/organizations/${org.id}` : "/login"}
                                className="rounded-xl bg-card border border-border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group block"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-[#800000]/5 border border-border flex items-center justify-center shrink-0 overflow-hidden">
                                        {org.logo_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-2xl">🏢</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-foreground group-hover:text-[#800000] transition-colors truncate">
                                            {org.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                            {org.description || "No description provided."}
                                        </p>
                                        {org.accreditation_status === "approved" && (
                                            <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50">
                                                ✓ Official
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
