"use client";

interface CandidateCardProps {
    id: string;
    name: string;
    avatarUrl: string | null;
    platform: string | null;
    voteCount?: number;
    isWinner?: boolean;
    isCurrentUser?: boolean;
    hasVoted?: boolean;
    canVote?: boolean;
    onVote?: () => void;
    isVoting?: boolean;
}

export default function CandidateCard({
    id,
    name,
    avatarUrl,
    platform,
    voteCount,
    isWinner = false,
    isCurrentUser = false,
    hasVoted = false,
    canVote = false,
    onVote,
    isVoting = false,
}: CandidateCardProps) {
    return (
        <div
            className={`relative rounded-xl border p-4 transition-all ${
                isWinner
                    ? "bg-gradient-to-br from-[#C9A227]/20 to-[#C9A227]/5 border-[#C9A227] ring-2 ring-[#C9A227]/30"
                    : "bg-card border-border hover:shadow-md"
            }`}
        >
            {/* Winner badge */}
            {isWinner && (
                <div className="absolute -top-2 -right-2 bg-[#C9A227] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    🏆 Winner
                </div>
            )}

            {/* Vote count badge */}
            {typeof voteCount === "number" && (
                <div className={`absolute -top-2 -left-2 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-sm ${
                    isWinner
                        ? "bg-[#C9A227] text-white"
                        : "bg-gray-100 text-gray-700 border border-gray-200"
                }`}>
                    {voteCount} vote{voteCount !== 1 ? "s" : ""}
                </div>
            )}

            {/* Avatar */}
            <div className="flex justify-center mb-3">
                <div className={`w-16 h-16 rounded-full overflow-hidden border-2 ${
                    isWinner ? "border-[#C9A227]" : "border-gray-200"
                }`}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-[#800000] to-[#C9A227] flex items-center justify-center text-white text-xl font-bold">
                            {name.charAt(0).toUpperCase()}
                        </div>
                    )}
                </div>
            </div>

            {/* Name */}
            <h4 className={`text-center font-semibold text-sm ${isWinner ? "text-[#800000] dark:text-[#C9A227]" : "text-foreground"}`}>
                {name}
                {isCurrentUser && (
                    <span className="ml-1 text-[10px] text-gray-500">(You)</span>
                )}
            </h4>

            {/* Platform excerpt */}
            {platform && (
                <p className="text-xs text-gray-500 text-center mt-1 line-clamp-2">
                    {platform}
                </p>
            )}

            {/* Vote button */}
            {canVote && !hasVoted && !isCurrentUser && onVote && (
                <button
                    onClick={onVote}
                    disabled={isVoting}
                    className="mt-3 w-full px-3 py-1.5 rounded-lg bg-[#800000] text-white text-xs font-semibold hover:bg-[#600000] transition-colors disabled:opacity-50"
                >
                    {isVoting ? "Voting..." : "Vote"}
                </button>
            )}

            {/* Already voted indicator */}
            {hasVoted && (
                <div className="mt-3 text-center">
                    <span className="text-[10px] text-green-600 font-medium">
                        ✓ You voted for this position
                    </span>
                </div>
            )}

            {/* Can't vote for yourself */}
            {isCurrentUser && canVote && (
                <div className="mt-3 text-center">
                    <span className="text-[10px] text-gray-400 font-medium">
                        You can't vote for yourself
                    </span>
                </div>
            )}
        </div>
    );
}
