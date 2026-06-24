"use client";
import Image from "next/image";

interface PositionCardProps {
    title: string;
    hierarchyLevel: number;
    assignedUserName?: string | null;
    assignedUserAvatar?: string | null;
    isVacant: boolean;
    hasWinner?: boolean;
    winnerName?: string;
    winnerAvatar?: string | null;
    onClick?: () => void;
    clickable?: boolean;
    clickLabel?: string;
}

export default function PositionCard({
    title,
    hierarchyLevel,
    assignedUserName,
    assignedUserAvatar,
    isVacant,
    hasWinner = false,
    winnerName,
    winnerAvatar,
    onClick,
    clickable = false,
    clickLabel,
}: PositionCardProps) {
    // If there's a winner, show winner card
    if (hasWinner && winnerName) {
        return (
            <div className="relative rounded-xl border-2 border-gold bg-gradient-to-br from-[#C9A227]/20 to-card p-4 shadow-md min-w-[140px]">
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-gold text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap">
                    🏆 Elected
                </div>
                
                <div className="flex flex-col items-center pt-2">
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-gold mb-2">
                        {winnerAvatar ? (
                            <Image
                                src={winnerAvatar}
                                alt={winnerName}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#800000] to-[#C9A227] flex items-center justify-center text-white text-lg font-bold">
                                {winnerName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <h4 className="font-bold text-sm text-primary dark:text-gold text-center">{title}</h4>
                    <p className="text-xs text-muted-foreground text-center mt-0.5">{winnerName}</p>
                </div>
            </div>
        );
    }

    const cardContent = (
        <>
            {/* Level indicator */}
            <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {hierarchyLevel}
            </div>

            <div className="flex flex-col items-center">
                {/* Icon or current holder */}
                {isVacant ? (
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground mb-2">
                        <span className="text-2xl">👤</span>
                    </div>
                ) : (
                    <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-border mb-2">
                        {assignedUserAvatar ? (
                            <Image
                                src={assignedUserAvatar}
                                alt={assignedUserName || ""}
                                fill
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#800000] to-[#C9A227] flex items-center justify-center text-white text-lg font-bold">
                                {assignedUserName?.charAt(0).toUpperCase() || "?"}
                            </div>
                        )}
                    </div>
                )}

                <h4 className="font-bold text-sm text-foreground text-center">{title}</h4>
                
                {isVacant ? (
                    <span className="text-[10px] text-muted-foreground mt-1 px-2 py-0.5 rounded bg-muted">
                        Vacant
                    </span>
                ) : assignedUserName && (
                    <p className="text-xs text-muted-foreground text-center mt-0.5">{assignedUserName}</p>
                )}

                {/* Clickable hint */}
                {clickable && clickLabel && (
                    <span className="mt-2 text-[10px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        {clickLabel}
                    </span>
                )}
            </div>
        </>
    );

    // Wrap in a button if clickable
    if (clickable && onClick) {
        return (
            <button
                type="button"
                onClick={onClick}
                className={`group relative rounded-xl border-2 p-4 min-w-[140px] cursor-pointer transition-all hover:shadow-md hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                    isVacant 
                        ? "border-dashed border-muted-foreground/30 bg-muted/50 hover:bg-primary/5" 
                        : "border-solid border-border bg-card hover:bg-primary/5"
                }`}
            >
                {cardContent}
            </button>
        );
    }

    // Non-clickable card
    return (
        <div className={`relative rounded-xl border-2 p-4 min-w-[140px] ${
            isVacant 
                ? "border-dashed border-muted-foreground/30 bg-muted/50" 
                : "border-solid border-border bg-card"
        }`}>
            {cardContent}
        </div>
    );
}
