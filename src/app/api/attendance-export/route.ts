import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
    const eventId = request.nextUrl.searchParams.get("eventId");
    if (!eventId) {
        return NextResponse.json({ error: "eventId required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Auth check — only event creator or admin can export
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: event } = await supabase
        .from("events")
        .select("id, title, created_by, start_datetime")
        .eq("id", eventId)
        .single();

    if (!event) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (event.created_by !== user.id && profile?.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Use admin client to query across profiles & student tables to bypass RLS policies
    const adminSupabase = createAdminClient();

    // Fetch all attended participations with profile + student info
    const { data: participations, error } = await adminSupabase
        .from("event_participations")
        .select(`
            status,
            registered_at,
            profiles:user_id (
                full_name,
                email,
                students (
                    student_number,
                    program,
                    course,
                    section,
                    year_level
                )
            )
        `)
        .eq("event_id", eventId)
        .eq("status", "attended")
        .order("registered_at", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Build Excel rows
    const eventDate = new Date(event.start_datetime);
    const rows = (participations || []).map((p, index) => {
        const profileData = p.profiles as unknown as {
            full_name: string;
            email: string;
            students: {
                student_number: string;
                program: string;
                course: string;
                section: string;
                year_level: number;
            } | {
                student_number: string;
                program: string;
                course: string;
                section: string;
                year_level: number;
            }[] | null;
        } | null;

        const studentData = profileData?.students;
        const student = Array.isArray(studentData) ? studentData[0] : studentData;
        const scannedAt = new Date(p.registered_at);

        return {
            "#": index + 1,
            "Full Name": profileData?.full_name || "—",
            "Student #": student?.student_number || "—",
            "Program": student?.program || "—",
            "Course": student?.course || "—",
            "Section": student?.section || "—",
            "Year Level": student?.year_level ?? "—",
            "Email": profileData?.email || "—",
            "Event Date": eventDate.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
            "Time Attended": scannedAt.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
            }),
            "Date Attended": scannedAt.toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
        };
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Title / Header rows
    const titleRow = [`Attendance List — ${event.title}`];
    const dateRow = [`Event Date: ${eventDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`];
    const totalRow = [`Total Attendees: ${rows.length}`];
    const emptyRow: string[] = [];

    const headers = ["#", "Full Name", "Student #", "Program", "Course", "Section", "Year Level", "Email", "Event Date", "Time Attended", "Date Attended"];

    const wsData: (string | number | undefined)[][] = [
        titleRow,
        dateRow,
        totalRow,
        emptyRow,
        headers,
        ...rows.map((r) => headers.map((h) => r[h as keyof typeof r] as string | number)),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Style column widths
    ws["!cols"] = [
        { wch: 4 },   // #
        { wch: 28 },  // Full Name
        { wch: 14 },  // Student #
        { wch: 18 },  // Program
        { wch: 14 },  // Course
        { wch: 10 },  // Section
        { wch: 12 },  // Year Level
        { wch: 30 },  // Email
        { wch: 22 },  // Event Date
        { wch: 16 },  // Time Attended
        { wch: 22 },  // Date Attended
    ];

    // Merge title cells across all columns
    ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: headers.length - 1 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const safeName = event.title.replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, "-");
    const filename = `attendance-${safeName}-${eventDate.toISOString().slice(0, 10)}.xlsx`;

    return new NextResponse(buf, {
        status: 200,
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${filename}"`,
        },
    });
}
