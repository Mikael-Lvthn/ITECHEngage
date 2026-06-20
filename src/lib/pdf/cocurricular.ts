"use client";

import jsPDF from "jspdf";
import autoTable, { type CellHookData } from "jspdf-autotable";
import type { EngagementRecord } from "@/lib/types";

interface StudentInfo {
    fullName: string;
    studentNumber: string;
    program: string;
    yearLevel: number;
}

declare module "jspdf" {
    interface jsPDF {
        lastAutoTable: { finalY: number };
    }
}

const MAROON: [number, number, number] = [128, 0, 0];

// Resume sections, mirroring the on-screen layout in the My Resume page.
const SECTIONS: {
    heading: string;
    types: EngagementRecord["record_type"][];
    primary: (r: EngagementRecord) => string;
    secondary: (r: EngagementRecord) => string;
}[] = [
    {
        heading: "Leadership & Roles",
        types: ["officer_role", "election_winner"],
        primary: (r) => r.role_title || r.title,
        secondary: (r) => r.organization_name || "",
    },
    {
        heading: "Organizations & Memberships",
        types: ["membership"],
        primary: (r) => r.organization_name || r.title,
        secondary: (r) => r.role_title || "Member",
    },
    {
        heading: "Events Attended",
        types: ["event_attended"],
        primary: (r) => r.title,
        secondary: (r) => r.organization_name || "",
    },
    {
        heading: "Recognitions",
        types: ["accreditation"],
        primary: (r) => r.title,
        secondary: (r) => r.organization_name || "",
    },
];

function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTerm(r: EngagementRecord): string {
    if (r.academic_year && r.semester) return `${r.semester} Sem, AY ${r.academic_year}`;
    if (r.academic_year) return `AY ${r.academic_year}`;
    if (r.semester) return `${r.semester} Sem`;
    return "";
}

export function generateCocurricularPDF(records: EngagementRecord[], student: StudentInfo) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header — personal resume style (name first, no institutional letterhead).
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text(student.fullName, 20, 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    const subParts = [
        student.program && student.program !== "N/A" ? student.program : null,
        student.yearLevel ? `${student.yearLevel} Year` : null,
        student.studentNumber && student.studentNumber !== "N/A" ? `Student No. ${student.studentNumber}` : null,
    ].filter(Boolean);
    doc.text(subParts.join("   ·   "), 20, 31);
    doc.setTextColor(0);

    doc.setDrawColor(...MAROON);
    doc.setLineWidth(0.8);
    doc.line(20, 35, pageWidth - 20, 35);

    let cursorY = 44;

    for (const section of SECTIONS) {
        const items = records.filter((r) => section.types.includes(r.record_type));
        if (items.length === 0) continue;

        // Section heading.
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(...MAROON);
        doc.text(section.heading.toUpperCase(), 20, cursorY);
        doc.setTextColor(0);

        // Two rows per entry: a bold "primary" row, then a muted detail row.
        const body: string[][] = [];
        for (const r of items) {
            body.push([section.primary(r), formatDate(r.date_earned)]);
            const detail = [section.secondary(r), r.description || ""].filter(Boolean).join(" — ");
            body.push([detail, formatTerm(r)]);
        }

        autoTable(doc, {
            startY: cursorY + 3,
            body,
            theme: "plain",
            styles: { font: "helvetica", fontSize: 9, cellPadding: { top: 1, bottom: 1, left: 0, right: 0 }, valign: "top" },
            columnStyles: {
                0: { cellWidth: pageWidth - 40 - 45 },
                1: { cellWidth: 45, halign: "right", textColor: [90, 90, 90] },
            },
            // Even rows are the bold primary line; odd rows are muted details.
            didParseCell: (data: CellHookData) => {
                const isPrimaryRow = data.row.index % 2 === 0;
                if (isPrimaryRow) {
                    if (data.column.index === 0) data.cell.styles.fontStyle = "bold";
                    data.cell.styles.cellPadding = { top: 2.5, bottom: 0.5, left: 0, right: 0 };
                } else {
                    data.cell.styles.textColor = [110, 110, 110];
                    data.cell.styles.fontSize = 8.5;
                }
            },
            margin: { left: 20, right: 20 },
        });

        cursorY = doc.lastAutoTable.finalY + 8;
    }

    // Footer on every page.
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
            `Generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} via ITECHEngage`,
            20,
            doc.internal.pageSize.getHeight() - 10
        );
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: "right" }
        );
        doc.setTextColor(0);
    }

    doc.save(`Resume-${student.studentNumber}.pdf`);
}
