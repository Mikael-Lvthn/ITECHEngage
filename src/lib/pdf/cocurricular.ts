"use client";

import jsPDF from "jspdf";
import "jspdf-autotable";
import type { EngagementRecord } from "@/lib/types";

interface StudentInfo {
    fullName: string;
    studentNumber: string;
    program: string;
    yearLevel: number;
}

declare module "jspdf" {
    interface jsPDF {
        autoTable: (options: Record<string, unknown>) => jsPDF;
        lastAutoTable: { finalY: number };
    }
}

export function generateCocurricularPDF(records: EngagementRecord[], student: StudentInfo) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("POLYTECHNIC UNIVERSITY OF THE PHILIPPINES", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(11);
    doc.text("Institute of Technology", pageWidth / 2, 27, { align: "center" });

    doc.setFontSize(9);
    doc.setFont("times", "normal");
    doc.text("Anonas Street, Sta. Mesa, Manila 1016", pageWidth / 2, 33, { align: "center" });

    doc.setDrawColor(128, 0, 0);
    doc.setLineWidth(0.8);
    doc.line(20, 37, pageWidth - 20, 37);

    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("CO-CURRICULAR ENGAGEMENT RECORD", pageWidth / 2, 46, { align: "center" });

    doc.setFont("times", "normal");
    doc.setFontSize(10);
    const infoY = 56;
    const labelX = 25;
    const valueX = 70;

    doc.setFont("times", "bold");
    doc.text("Name:", labelX, infoY);
    doc.setFont("times", "normal");
    doc.text(student.fullName, valueX, infoY);

    doc.setFont("times", "bold");
    doc.text("Student No.:", labelX, infoY + 7);
    doc.setFont("times", "normal");
    doc.text(student.studentNumber, valueX, infoY + 7);

    doc.setFont("times", "bold");
    doc.text("Program:", labelX, infoY + 14);
    doc.setFont("times", "normal");
    doc.text(student.program || "N/A", valueX, infoY + 14);

    doc.setFont("times", "bold");
    doc.text("Year Level:", labelX, infoY + 21);
    doc.setFont("times", "normal");
    doc.text(String(student.yearLevel), valueX, infoY + 21);

    const totalHours = records.reduce((sum, r) => sum + Number(r.hours_credit || 0), 0);
    const verifiedCount = records.filter((r) => r.verified).length;

    doc.setFillColor(248, 244, 236);
    doc.setDrawColor(128, 0, 0);
    doc.roundedRect(20, infoY + 28, pageWidth - 40, 16, 2, 2, "FD");
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    const summaryY = infoY + 38;
    doc.text(`Total Records: ${records.length}`, 30, summaryY);
    doc.text(`Total Hours: ${totalHours.toFixed(1)}`, pageWidth / 2 - 15, summaryY);
    doc.text(`Verified: ${verifiedCount}/${records.length}`, pageWidth - 60, summaryY);

    const typeLabels: Record<string, string> = {
        membership: "Membership",
        officer_role: "Officer Role",
        event_attended: "Event Attended",
        election_winner: "Election Winner",
        accreditation: "Accreditation",
    };

    const tableData = records.map((r, i) => [
        String(i + 1),
        new Date(r.date_earned).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        typeLabels[r.record_type] || r.record_type,
        r.title,
        r.organization_name || "—",
        String(r.hours_credit),
        r.verified ? "✓" : "—",
    ]);

    doc.autoTable({
        startY: infoY + 48,
        head: [["#", "Date", "Type", "Activity", "Organization", "Hours", "Verified"]],
        body: tableData,
        theme: "grid",
        headStyles: {
            fillColor: [128, 0, 0],
            textColor: [255, 255, 255],
            fontStyle: "bold",
            font: "times",
            fontSize: 8,
        },
        bodyStyles: {
            font: "times",
            fontSize: 8,
        },
        alternateRowStyles: {
            fillColor: [252, 249, 245],
        },
        columnStyles: {
            0: { cellWidth: 10, halign: "center" },
            1: { cellWidth: 25 },
            2: { cellWidth: 25 },
            3: { cellWidth: 50 },
            4: { cellWidth: 35 },
            5: { cellWidth: 15, halign: "center" },
            6: { cellWidth: 15, halign: "center" },
        },
        margin: { left: 20, right: 20 },
    });

    const finalY = doc.lastAutoTable.finalY + 15;

    doc.setFont("times", "italic");
    doc.setFontSize(9);
    doc.text(
        "This is to certify that the above records accurately reflect the co-curricular activities of the above-named student.",
        pageWidth / 2,
        finalY,
        { align: "center", maxWidth: pageWidth - 50 }
    );

    const signatureY = finalY + 25;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(pageWidth - 80, signatureY, pageWidth - 25, signatureY);
    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.text("Authorized Signatory", pageWidth - 52.5, signatureY + 5, { align: "center" });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFont("times", "normal");
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
            `Generated on ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} via ITECHEngage`,
            pageWidth / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: "center" }
        );
        doc.text(
            `Page ${i} of ${pageCount}`,
            pageWidth - 20,
            doc.internal.pageSize.getHeight() - 10,
            { align: "right" }
        );
        doc.setTextColor(0);
    }

    doc.save(`Co-Curricular-Record-${student.studentNumber}.pdf`);
}
