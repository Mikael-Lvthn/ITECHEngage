import Link from "next/link";

export default function ElectionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Elections</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage and participate in organization elections.
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
                <div className="h-2 bg-gradient-to-r from-[#2D3748] to-[#4A5568]" />
                <div className="text-center py-20 px-6">
                    <div className="w-20 h-20 mx-auto rounded-2xl bg-[#2D3748]/10 flex items-center justify-center mb-5">
                        <span className="text-4xl animate-float">🗳️</span>
                    </div>
                    <p className="font-bold text-xl text-foreground">Coming Soon</p>
                    <p className="text-sm text-muted-foreground mt-3 max-w-md mx-auto leading-relaxed">
                        E-voting features including election creation, candidate registration,
                        secure voting, and results are coming in Phase 4.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#2D3748]/10 text-[#2D3748]">Elections</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#C9A227]/10 text-[#C9A227]">Candidates</span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#800000]/10 text-[#800000]">Secure Voting</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
