export default function Loading() {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#800000] to-[#A52A2A] p-6 sm:p-8">
                <div className="h-4 w-28 rounded loading-skeleton" />
                <div className="h-8 w-60 rounded loading-skeleton mt-3" />
                <div className="h-4 w-80 max-w-full rounded loading-skeleton mt-3" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card p-5">
                        <div className="h-10 w-10 rounded-lg loading-skeleton" />
                        <div className="h-3 w-24 rounded loading-skeleton mt-4" />
                        <div className="h-7 w-16 rounded loading-skeleton mt-2" />
                    </div>
                ))}
            </div>

            <div>
                <div className="h-6 w-36 rounded loading-skeleton mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="rounded-xl border bg-card p-5">
                            <div className="h-2 w-full rounded loading-skeleton mb-4" />
                            <div className="h-5 w-3/4 rounded loading-skeleton" />
                            <div className="h-3 w-full rounded loading-skeleton mt-3" />
                            <div className="h-3 w-2/3 rounded loading-skeleton mt-2" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
