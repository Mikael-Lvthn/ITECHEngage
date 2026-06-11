export default function CoCurricularLoading() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-7 bg-gray-200 rounded-lg w-56 animate-pulse" />
                    <div className="h-4 bg-gray-200 rounded w-72 mt-2 animate-pulse" />
                </div>
                <div className="h-10 bg-gray-200 rounded-lg w-32 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="rounded-xl border bg-card p-4 shadow-sm animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-16 mb-2" />
                        <div className="h-4 bg-gray-200 rounded w-24" />
                    </div>
                ))}
            </div>
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="p-4 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        </div>
    );
}
