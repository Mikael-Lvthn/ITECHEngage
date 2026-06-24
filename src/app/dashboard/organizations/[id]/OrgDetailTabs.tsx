"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface OrgDetailTabsProps {
    aboutContent: ReactNode;
    structureContent: ReactNode;
    electionsContent: ReactNode;
    calendarHref: string;
}

const NAV_TABS = [
    { key: "overview", label: "Overview" },
    { key: "structure", label: "Structure" },
    { key: "elections", label: "Elections" },
];

export default function OrgDetailTabs({ aboutContent, structureContent, electionsContent, calendarHref }: OrgDetailTabsProps) {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div>
            <div className="flex items-center gap-1 border-b mb-6 overflow-x-auto">
                {NAV_TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                            activeTab === tab.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}

                {/* Calendar — external link to dedicated page */}
                <Link
                    href={calendarHref}
                    className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:border-border transition-colors -mb-px whitespace-nowrap"
                >
                    Calendar
                </Link>
            </div>

            <div className="animate-fade-in">
                {activeTab === "overview" && aboutContent}
                {activeTab === "structure" && structureContent}
                {activeTab === "elections" && electionsContent}
            </div>
        </div>
    );
}
