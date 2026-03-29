export default function Loading() {
    return (
        <div className="min-h-screen bg-white animate-fade-in">
            <div className="bg-[#800000] text-white">
                <div className="bg-[#600000] px-6 sm:px-12 py-2">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="h-3 w-64 rounded loading-skeleton" />
                        <div className="h-7 w-24 rounded-lg loading-skeleton" />
                    </div>
                </div>
                <div className="px-6 sm:px-12 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-full loading-skeleton" />
                            <div className="space-y-2">
                                <div className="h-4 w-36 rounded loading-skeleton" />
                                <div className="h-2.5 w-24 rounded loading-skeleton" />
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-3">
                            <div className="h-3 w-16 rounded loading-skeleton" />
                            <div className="h-3 w-20 rounded loading-skeleton" />
                            <div className="h-3 w-14 rounded loading-skeleton" />
                        </div>
                    </div>
                </div>
            </div>

            <section className="bg-gradient-to-b from-[#800000] to-[#600000] pb-16 pt-8">
                <div className="max-w-3xl mx-auto px-6 text-center">
                    <div className="h-10 w-4/5 mx-auto rounded loading-skeleton" />
                    <div className="h-5 w-3/5 mx-auto rounded loading-skeleton mt-4" />
                    <div className="h-14 rounded-xl loading-skeleton mt-8" />
                </div>
            </section>

            <section className="-mt-8 relative z-10 max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-[#D9D9D9] bg-white p-5 shadow-sm">
                        <div className="h-7 w-7 rounded loading-skeleton" />
                        <div className="h-4 w-36 rounded loading-skeleton mt-4" />
                        <div className="h-3 w-24 rounded loading-skeleton mt-2" />
                    </div>
                ))}
            </section>

            <section className="max-w-5xl mx-auto px-6 mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-[#D9D9D9] bg-white p-5">
                        <div className="h-5 w-2/3 rounded loading-skeleton" />
                        <div className="h-3 w-full rounded loading-skeleton mt-3" />
                        <div className="h-3 w-4/5 rounded loading-skeleton mt-2" />
                    </div>
                ))}
            </section>
        </div>
    );
}
