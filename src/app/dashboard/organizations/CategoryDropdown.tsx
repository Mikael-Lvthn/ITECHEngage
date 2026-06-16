"use client";

import { useRouter } from "next/navigation";

interface CategoryDropdownProps {
    categories: { id: string; name: string }[];
    currentCategory: string | null;
}

export default function CategoryDropdown({ categories, currentCategory }: CategoryDropdownProps) {
    const router = useRouter();

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        if (val) {
            router.push(`/dashboard/organizations?category=${val}`);
        } else {
            router.push("/dashboard/organizations");
        }
    };

    return (
        <div className="w-full max-w-xs">
            <label htmlFor="category-select" className="sr-only">Filter by Category</label>
            <select
                id="category-select"
                value={currentCategory || ""}
                onChange={handleChange}
                className="w-full bg-card border border-border text-foreground rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#800000]/30 focus:border-[#800000] transition-all"
            >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                        {cat.name}
                    </option>
                ))}
            </select>
        </div>
    );
}
