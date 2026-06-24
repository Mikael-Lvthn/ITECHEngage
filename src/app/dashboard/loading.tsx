import { Skeleton } from "@/components/loading/Skeleton";

/**
 * Dashboard route skeleton. Renders inside the persistent dashboard shell
 * (sidebar + mobile header stay put), foreshadowing the page content while
 * it streams in. The full-screen BrandedLoader is reserved for initial
 * portal entry (src/app/loading.tsx).
 */
export default function Loading() {
    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-[#A52A2A] p-6 sm:p-8">
                <Skeleton className="h-4 w-28 bg-white/25" />
                <Skeleton className="mt-3 h-8 w-60 max-w-full bg-white/25" />
                <Skeleton className="mt-3 h-4 w-80 max-w-full bg-white/20" />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-5">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <Skeleton className="mt-4 h-3 w-24" />
                        <Skeleton className="mt-2 h-7 w-16" />
                    </div>
                ))}
            </div>

            {/* Content grid */}
            <div>
                <Skeleton className="mb-4 h-6 w-36" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border border-border bg-card p-5">
                            <Skeleton className="mb-4 h-2 w-full" />
                            <Skeleton className="h-5 w-3/4" />
                            <Skeleton className="mt-3 h-3 w-full" />
                            <Skeleton className="mt-2 h-3 w-2/3" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
