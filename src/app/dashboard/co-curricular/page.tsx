"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getUserEngagementSummary } from "@/lib/actions/engagement";
import { generateCocurricularPDF } from "@/lib/pdf/cocurricular";
import { createClient } from "@/lib/supabase/client";
import type { EngagementRecord } from "@/lib/types";

type FilterType = "all" | "membership" | "officer_role" | "event_attended" | "election_winner" | "accreditation";

const typeLabels: Record<string, string> = {
    membership: "Membership",
    officer_role: "Officer Role",
    event_attended: "Event Attended",
    election_winner: "Election Winner",
    accreditation: "Accreditation",
};

const typeEmoji: Record<string, string> = {
    membership: "👥",
    officer_role: "🎖️",
    event_attended: "📅",
    election_winner: "🏆",
    accreditation: "📋",
};

export default function CoCurricularPage() {
    const [summary, setSummary] = useState<{
        totalRecords: number;
        totalHours: number;
        byType: Record<string, { count: number; hours: number }>;
        records: EngagementRecord[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<FilterType>("all");
    const [exporting, setExporting] = useState(false);
    const [studentInfo, setStudentInfo] = useState<{
        fullName: string;
        studentNumber: string;
        program: string;
        yearLevel: number;
    } | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [summaryData, profileRes, studentRes] = await Promise.all([
                getUserEngagementSummary(user.id),
                supabase.from("profiles").select("full_name").eq("id", user.id).single(),
                supabase.from("students").select("student_number, program, year_level").eq("id", user.id).maybeSingle(),
            ]);

            setSummary(summaryData);
            setStudentInfo({
                fullName: profileRes.data?.full_name || "Unknown",
                studentNumber: studentRes.data?.student_number || "N/A",
                program: studentRes.data?.program || "N/A",
                yearLevel: studentRes.data?.year_level || 0,
            });
        } catch (error) {
            console.error("Failed to load engagement data:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredRecords = summary?.records.filter(
        (r) => filter === "all" || r.record_type === filter
    ) || [];

    const handleExportPDF = () => {
        if (!summary || !studentInfo) return;
        setExporting(true);
        try {
            generateCocurricularPDF(filteredRecords, studentInfo);
        } catch (error) {
            console.error("PDF export failed:", error);
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
                    ))}
                </div>
                <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Co-Curricular Record</h1>
                    <p className="text-muted-foreground text-sm mt-1">Track your engagement across organizations and events</p>
                </div>
                <button
                    onClick={handleExportPDF}
                    disabled={exporting || !summary?.records.length}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {exporting ? "Generating..." : "📄 Export PDF"}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="text-3xl font-bold text-[#800000]">{summary?.totalRecords || 0}</div>
                    <p className="text-sm text-muted-foreground mt-1">Total Records</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="text-3xl font-bold text-[#C9A227]">{(summary?.totalHours || 0).toFixed(1)}</div>
                    <p className="text-sm text-muted-foreground mt-1">Total Engagement</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="text-3xl font-bold text-green-600">{summary?.records.filter((r) => r.verified).length || 0}</div>
                    <p className="text-sm text-muted-foreground mt-1">Verified</p>
                </div>
                <div className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="text-3xl font-bold text-blue-600">{Object.keys(summary?.byType || {}).length}</div>
                    <p className="text-sm text-muted-foreground mt-1">Activity Types</p>
                </div>
            </div>

            {Object.keys(summary?.byType || {}).length > 0 && (
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h2 className="font-semibold mb-3">By Category</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                        {Object.entries(summary?.byType || {}).map(([type, data]) => (
                            <button
                                key={type}
                                onClick={() => setFilter(filter === type ? "all" : type as FilterType)}
                                className={`rounded-lg border p-3 text-left transition-all hover:shadow-sm ${filter === type ? "border-[#800000] bg-[#800000]/5" : "hover:bg-accent"}`}
                            >
                                <span className="text-lg">{typeEmoji[type] || "📌"}</span>
                                <p className="text-xs font-medium mt-1">{typeLabels[type] || type}</p>
                                <p className="text-lg font-bold text-[#800000]">{data.count}</p>
                                <p className="text-[10px] text-muted-foreground">{data.hours.toFixed(1)} hrs</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-2">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as FilterType)}
                    className="px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                    <option value="all">All Types</option>
                    {Object.entries(typeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
                <span className="text-sm text-muted-foreground">
                    {filteredRecords.length} record{filteredRecords.length !== 1 ? "s" : ""}
                </span>
            </div>

            {filteredRecords.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                        <span className="text-3xl">📋</span>
                    </div>
                    <h3 className="font-semibold mb-1">No records yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Start participating in organizations and events to build your co-curricular record.
                    </p>
                    <Link
                        href="/dashboard/organizations"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        Browse Organizations
                    </Link>
                </div>
            ) : (
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Activity</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Organization</th>
                                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Hours</th>
                                    <th className="text-center px-4 py-3 font-medium text-muted-foreground">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {filteredRecords.map((record) => (
                                    <tr key={record.id} className="hover:bg-accent/50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap text-xs">
                                            {new Date(record.date_earned).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted">
                                                {typeEmoji[record.record_type]} {typeLabels[record.record_type]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-sm">{record.title}</p>
                                            {record.description && (
                                                <p className="text-xs text-muted-foreground mt-0.5">{record.description}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">{record.organization_name || "—"}</td>
                                        <td className="px-4 py-3 text-center font-semibold">{record.hours_credit}</td>
                                        <td className="px-4 py-3 text-center">
                                            {record.verified ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                                                    ✓ Verified
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-700">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
