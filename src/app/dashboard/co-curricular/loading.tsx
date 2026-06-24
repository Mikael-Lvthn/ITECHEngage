import { Skeleton } from "@/components/loading/Skeleton";

export default function CoCurricularLoading() {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="mt-2 h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <Skeleton className="mb-2 h-8 w-16" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="space-y-3 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        </div>
    );
}
