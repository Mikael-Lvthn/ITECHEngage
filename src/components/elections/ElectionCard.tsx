"use client";

import Link from "next/link";

interface ElectionCardProps {
    id: string;
    title: string;
    description: string | null;
    orgName: string;
    startDate: string;
    endDate: string;
    status: string;
    candidateCount: number;
    roleCount: number;
    index: number;
}

export default function ElectionCard({
    id,
    title,
    description,
    orgName,
    startDate,
    endDate,
    status,
    candidateCount,
    roleCount,
    index,
}: ElectionCardProps) {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const isUpcoming = status === "active" && now < start;
    const isOngoing = status === "active" && now >= start && now <= end;
    const isClosed = status === "closed" || (status === "active" && now > end);

    const statusLabel = isClosed ? "Closed" : isUpcoming ? "Upcoming" : isOngoing ? "Voting Open" : status;
    const statusColor = isClosed
        ? "bg-gray-100 text-gray-600"
        : isUpcoming
            ? "bg-blue-100 text-blue-700"
            : isOngoing
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700";

    const gradientClass = isClosed
        ? "from-gray-400 to-gray-500"
        : isUpcoming
            ? "from-blue-500 to-blue-600"
            : "from-[#800000] to-[#C9A227]";

    return (
        <Link
            href={`/dashboard/elections/${id}`}
            className="group rounded-xl border bg-card overflow-hidden card-hover animate-slide-up"
            style={{ animationDelay: `${index * 80}ms` }}
        >
            <div className={`h-2 bg-gradient-to-r ${gradientClass}`} />
            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors truncate">
                            {title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {orgName}
                        </p>
                    </div>
                    <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${statusColor}`}>
                        {statusLabel}
                    </span>
                </div>

                {description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{description}</p>
                )}

                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                        <span>📋</span>
                        <span>{roleCount} role{roleCount !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span>👤</span>
                        <span>{candidateCount} candidate{candidateCount !== 1 ? "s" : ""}</span>
                    </div>
                </div>

                <div className="mt-3 pt-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                        {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" — "}
                        {end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        View details
                        <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </span>
                </div>
            </div>
        </Link>
    );
}
