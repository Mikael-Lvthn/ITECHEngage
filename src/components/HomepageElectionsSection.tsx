import Link from "next/link";
import { HomepageElection } from "@/lib/homepage-data";

interface HomepageElectionsSectionProps {
    elections: HomepageElection[];
    isLoggedIn: boolean;
}

export default function HomepageElectionsSection({ elections, isLoggedIn }: HomepageElectionsSectionProps) {
    if (!elections || elections.length === 0) {
        return null;
    }

    // Separate followed and non-followed
    const followedElections = elections.filter(e => e.isFollowed);
    const otherElections = elections.filter(e => !e.isFollowed);

    const getStatusBadge = (status: string) => {
        if (status === "voting") {
            return (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    Voting Open
                </span>
            );
        }
        return (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">
                Published
            </span>
        );
    };

    const renderElectionCard = (election: HomepageElection) => {
        const end = election.end_date ? new Date(election.end_date) : null;
        const orgName = election.organizations && typeof election.organizations === 'object' && !Array.isArray(election.organizations)
            ? (election.organizations as { name?: string }).name
            : "";

        return (
            <Link
                key={election.id}
                href={isLoggedIn ? `/dashboard/elections/${election.id}` : "/login"}
                className="block p-5 rounded-xl border border-primary/20 bg-card hover:border-primary/50 hover:shadow-md transition-all group relative overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#800000] to-[#C9A227]"></div>
                
                <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(election.status)}
                    {election.isFollowed && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-gold/20 text-[#8B6914] dark:text-gold">
                            Following
                        </span>
                    )}
                </div>

                <p className="text-[10px] text-muted-foreground truncate mb-1">
                    {orgName}
                </p>

                <h3 className="font-bold text-foreground text-lg leading-tight group-hover:text-primary transition-colors mb-2">
                    {election.title}
                </h3>

                {election.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {election.description}
                    </p>
                )}

                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span>⏳</span> {end ? `Ends ${end.toLocaleDateString()}` : "Ongoing"}
                </p>
            </Link>
        );
    };

    return (
        <section id="elections" className="max-w-5xl mx-auto px-6 mt-14">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-foreground">
                    Ongoing Elections
                </h2>
                <span className="flex items-center gap-2 text-sm text-primary dark:text-gold font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                    {elections.filter(e => e.status === "voting").length} Active
                </span>
            </div>

            {/* Followed organizations' elections */}
            {followedElections.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                        <span className="text-gold">★</span> From Organizations You Follow
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {followedElections.map(renderElectionCard)}
                    </div>
                </div>
            )}

            {/* Other elections */}
            {otherElections.length > 0 && (
                <div>
                    {followedElections.length > 0 && (
                        <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                            Other Elections
                        </h3>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherElections.map(renderElectionCard)}
                    </div>
                </div>
            )}

            {/* Transparency note */}
            <div className="mt-6 p-4 rounded-lg bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground text-center">
                    🗳️ All ongoing elections are shown publicly for transparency. Only organization members can vote.
                </p>
            </div>
        </section>
    );
}
