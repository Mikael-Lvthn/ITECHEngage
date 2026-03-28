"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface OrgDetailTabsProps {
    aboutContent: ReactNode;
    structureContent: ReactNode;
}

const tabs = [
    { key: "overview", label: "Overview", icon: "📋" },
    { key: "structure", label: "Structure", icon: "🏛️" },
];

export default function OrgDetailTabs({ aboutContent, structureContent }: OrgDetailTabsProps) {
    const [activeTab, setActiveTab] = useState("overview");

    return (
        <div>
            <div className="flex items-center gap-1 border-b mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px",
                            activeTab === tab.key
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                        )}
                    >
                        <span className="text-base">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="animate-fade-in">
                {activeTab === "overview" && aboutContent}
                {activeTab === "structure" && structureContent}
            </div>
        </div>
    );
}
