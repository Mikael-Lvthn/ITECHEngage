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
            {/* Category filter dropdown */}
            {categories.length > 0 && (
                <div className="mb-6 max-w-xs">
                    <label htmlFor="category-select" className="sr-only">Filter by Category</label>
                    <select
                        id="category-select"
                        value={activeCategory || ""}
                        onChange={(e) => handleFilter(e.target.value || null)}
                        className="w-full bg-card border border-border text-foreground rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
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
                                className="rounded-xl bg-card border border-border p-6 hover:shadow-md hover:-translate-y-0.5 transition-all group block text-center flex flex-col items-center justify-center min-h-[180px]"
                            >
                                <div className="w-24 h-24 rounded-full bg-primary/5 border border-border flex items-center justify-center shrink-0 overflow-hidden mb-4 shadow-sm">
                                    {org.logo_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl">🏢</span>
                                    )}
                                </div>
                                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors text-base line-clamp-2">
                                    {org.name}
                                </h3>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
