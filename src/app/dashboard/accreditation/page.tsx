import Link from "next/link";

export default function AccreditationPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Accreditation</h1>
                    <p className="text-muted-foreground mt-1">
                        Submit and track organization accreditation status.
                    </p>
                </div>
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors card-hover"
                >
                    <span>🏠</span> Home
                </Link>
            </div>

            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#22543D] to-[#38A169]" />
                <div className="text-center py-20 px-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-[#22543D]/10 flex items-center justify-center mb-5">
                        <span className="text-4xl animate-float">📑</span>
                    </div>
                    <p className="font-bold text-xl text-foreground">Coming Soon</p>
                    <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                        Accreditation management features including document submission,
                        review workflows, and status tracking are coming in Phase 3.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#22543D]/10 text-[#22543D]">Submissions</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#C9A227]/10 text-[#C9A227]">Review</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#800000]/10 text-[#800000]">Tracking</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
