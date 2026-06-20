"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { getUserEngagementSummary, setRecordVisibility } from "@/lib/actions/engagement";
import { generateCocurricularPDF } from "@/lib/pdf/cocurricular";
import { createClient } from "@/lib/supabase/client";
import type { EngagementRecord } from "@/lib/types";

type StudentInfo = {
    fullName: string;
    studentNumber: string;
    program: string;
    yearLevel: number;
    avatarUrl: string | null;
};

type ResumeSection = {
    key: string;
    heading: string;
    emoji: string;
    types: string[];
    entryHeading: (r: EngagementRecord) => string;
    entrySubtitle: (r: EngagementRecord) => string | null;
};

// Resume sections, in the order they appear top-to-bottom (like a CV).
const SECTIONS: ResumeSection[] = [
    {
        key: "leadership",
        heading: "Leadership & Roles",
        emoji: "🎖️",
        types: ["officer_role", "election_winner"],
        entryHeading: (r) => r.role_title || r.title,
        entrySubtitle: (r) => r.organization_name,
    },
    {
        key: "memberships",
        heading: "Organizations & Memberships",
        emoji: "👥",
        types: ["membership"],
        entryHeading: (r) => r.organization_name || r.title,
        entrySubtitle: (r) => r.role_title || "Member",
    },
    {
        key: "events",
        heading: "Events Attended",
        emoji: "📅",
        types: ["event_attended"],
        entryHeading: (r) => r.title,
        entrySubtitle: (r) => r.organization_name,
    },
    {
        key: "recognitions",
        heading: "Recognitions",
        emoji: "📋",
        types: ["accreditation"],
        entryHeading: (r) => r.title,
        entrySubtitle: (r) => r.organization_name,
    },
];

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTerm(r: EngagementRecord): string | null {
    if (r.academic_year && r.semester) return `${r.semester} Sem, AY ${r.academic_year}`;
    if (r.academic_year) return `AY ${r.academic_year}`;
    if (r.semester) return `${r.semester} Sem`;
    return null;
}

export default function CoCurricularPage() {
    const [records, setRecords] = useState<EngagementRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [student, setStudent] = useState<StudentInfo | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [summaryData, profileRes, studentRes] = await Promise.all([
                getUserEngagementSummary(user.id),
                supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).single(),
                supabase.from("students").select("student_number, program, year_level").eq("id", user.id).maybeSingle(),
            ]);

            setRecords(summaryData.records);
            setStudent({
                fullName: profileRes.data?.full_name || "Unknown",
                studentNumber: studentRes.data?.student_number || "N/A",
                program: studentRes.data?.program || "N/A",
                yearLevel: studentRes.data?.year_level || 0,
                avatarUrl: profileRes.data?.avatar_url || null,
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

    const handleExportPDF = () => {
        if (!student) return;
        setExporting(true);
        try {
            generateCocurricularPDF(records, {
                fullName: student.fullName,
                studentNumber: student.studentNumber,
                program: student.program,
                yearLevel: student.yearLevel,
            });
        } catch (error) {
            console.error("PDF export failed:", error);
        } finally {
            setExporting(false);
        }
    };

    const handleToggleVisibility = async (record: EngagementRecord) => {
        const next = !record.is_public;
        // Optimistic update.
        setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, is_public: next } : r)));
        try {
            await setRecordVisibility(record.id, next);
        } catch (error) {
            console.error("Failed to update visibility:", error);
            // Revert on failure.
            setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, is_public: !next } : r)));
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-40 bg-gray-200 rounded-xl animate-pulse" />
                <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
        );
    }

    const initials = (student?.fullName || "?")
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const orgCount = new Set(
        records.map((r) => r.organization_name).filter(Boolean)
    ).size;

    // Build the sections that actually have records.
    const populatedSections = SECTIONS.map((section) => ({
        section,
        items: records.filter((r) => section.types.includes(r.record_type)),
    })).filter((s) => s.items.length > 0);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Resume</h1>
                    <p className="text-muted-foreground text-sm mt-1">Your co-curricular journey across organizations and events</p>
                </div>
                <button
                    onClick={handleExportPDF}
                    disabled={exporting || records.length === 0}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {exporting ? "Generating..." : "📄 Download Resume"}
                </button>
            </div>

            {/* Profile header */}
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="h-28 bg-gradient-to-r from-[#800000] to-[#C9A227] opacity-80" />
                <div className="px-6 pb-6 relative">
                    <div className="flex items-end -mt-12 mb-4">
                        <div className="relative w-24 h-24 rounded-full border-4 border-card bg-card shrink-0 overflow-hidden shadow-lg z-10">
                            {student?.avatarUrl ? (
                                <Image src={student.avatarUrl} alt={student.fullName} fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full bg-[#800000]/10 flex items-center justify-center text-2xl font-bold text-[#800000]">
                                    {initials}
                                </div>
                            )}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{student?.fullName}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {[
                            student?.program && student.program !== "N/A" ? student.program : null,
                            student?.yearLevel ? `${student.yearLevel}${["th", "st", "nd", "rd"][student.yearLevel % 10] || "th"} Year` : null,
                            student?.studentNumber && student.studentNumber !== "N/A" ? student.studentNumber : null,
                        ].filter(Boolean).join("  ·  ")}
                    </p>
                    {records.length > 0 && (
                        <>
                            <p className="text-xs text-muted-foreground mt-3">
                                {records.length} {records.length === 1 ? "activity" : "activities"}
                                {orgCount > 0 && ` across ${orgCount} ${orgCount === 1 ? "organization" : "organizations"}`}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-2">
                                Tip: use the 👁 / 🙈 toggle on each item to control what appears on your public profile. Hidden items stay visible only to you.
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Resume sections */}
            {records.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
                    <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                        <span className="text-3xl">📋</span>
                    </div>
                    <h3 className="font-semibold mb-1">No records yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Start participating in organizations and events to build your resume.
                    </p>
                    <Link
                        href="/dashboard/organizations"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        Browse Organizations
                    </Link>
                </div>
            ) : (
                populatedSections.map(({ section, items }) => (
                    <section key={section.key} className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gradient-to-r from-[#800000]/5 to-transparent flex items-center justify-between">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <span>{section.emoji}</span> {section.heading}
                            </h2>
                            <span className="text-xs text-muted-foreground">{items.length}</span>
                        </div>
                        <div className="divide-y">
                            {items.map((record) => {
                                const subtitle = section.entrySubtitle(record);
                                const term = formatTerm(record);
                                return (
                                    <div key={record.id} className="px-6 py-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-sm">{section.entryHeading(record)}</p>
                                            {subtitle && (
                                                <p className="text-xs text-[#800000] font-medium mt-0.5">{subtitle}</p>
                                            )}
                                            {record.description && (
                                                <p className="text-xs text-muted-foreground mt-1">{record.description}</p>
                                            )}
                                        </div>
                                        <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
                                            <p className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(record.date_earned)}</p>
                                            {term && (
                                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">{term}</p>
                                            )}
                                            <button
                                                onClick={() => handleToggleVisibility(record)}
                                                title={record.is_public ? "Visible on your public profile — click to hide" : "Hidden from your public profile — click to show"}
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${record.is_public ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                                            >
                                                {record.is_public ? "👁 Public" : "🙈 Hidden"}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}
