import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const eventId = request.nextUrl.searchParams.get("eventId");
    if (!eventId) {
        return NextResponse.json({ error: "eventId required" }, { status: 400 });
    }

    const supabase = await createClient();

    const { count } = await supabase
        .from("event_participations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "attended");

    return NextResponse.json({ count: count || 0 });
}
