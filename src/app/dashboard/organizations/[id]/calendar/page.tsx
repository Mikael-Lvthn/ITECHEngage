import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import CalendarGrid from "./CalendarGrid";
import type { CalendarEvent, RSVPCounts } from "@/lib/types/calendar";

interface Props {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ year?: string; month?: string }>;
}

export default async function OrganizationCalendarPage({ params, searchParams }: Props) {
    const { id } = await params;
    const sp = searchParams ? await searchParams : {};
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return notFound();

    // Fetch org
    const { data: org } = await supabase
        .from("organizations")
        .select("id, name, logo_url")
        .eq("id", id)
        .single();

    if (!org) notFound();

    // Check user role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const isAdmin = profile?.role === "admin";

    const { data: orgRole } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("assigned_user_id", user.id)
        .eq("organization_id", id)
        .maybeSingle();

    const isOfficer = !!orgRole || isAdmin;

    // Determine current month window
    const now = new Date();
    const year = sp.year ? parseInt(sp.year) : now.getFullYear();
    const month = sp.month ? parseInt(sp.month) : now.getMonth(); // 0-indexed

    // Fetch events: prev month → next month buffer
    const bufferStart = new Date(year, month - 1, 1);
    const bufferEnd = new Date(year, month + 2, 0, 23, 59, 59);

    let eventsQuery = supabase
        .from("events")
        .select("*")
        .eq("organization_id", id)
        .gte("start_datetime", bufferStart.toISOString())
        .lte("start_datetime", bufferEnd.toISOString())
        .order("start_datetime", { ascending: true });

    if (!isOfficer) {
        eventsQuery = eventsQuery.eq("status", "published");
    } else {
        eventsQuery = eventsQuery.in("status", ["draft", "published", "cancelled"]);
    }

    const { data: rawEvents } = await eventsQuery;

    const events: CalendarEvent[] = (rawEvents || []).map((e) => ({
        ...e,
        color: e.color || "#800000",
        is_all_day: e.is_all_day || false,
        recurrence: e.recurrence || null,
        recurrence_end_date: e.recurrence_end_date || null,
        location: e.location || null,
    }));

    // Fetch user's RSVPs for these events
    const eventIds = events.map((e) => e.id);
    const { data: userRsvps } = eventIds.length > 0
        ? await supabase
            .from("event_rsvp")
            .select("event_id, response")
            .eq("user_id", user.id)
            .in("event_id", eventIds)
        : { data: [] };

    const myRsvps: Record<string, string> = {};
    (userRsvps || []).forEach((r) => { myRsvps[r.event_id] = r.response; });

    // Fetch RSVP counts per event
    const { data: rsvpRows } = eventIds.length > 0
        ? await supabase
            .from("event_rsvp")
            .select("event_id, response")
            .in("event_id", eventIds)
        : { data: [] };

    const rsvpCounts: Record<string, RSVPCounts> = {};
    (rsvpRows || []).forEach((r) => {
        if (!rsvpCounts[r.event_id]) {
            rsvpCounts[r.event_id] = { going: 0, maybe: 0, not_going: 0 };
        }
        if (r.response === "going") rsvpCounts[r.event_id].going++;
        else if (r.response === "maybe") rsvpCounts[r.event_id].maybe++;
        else if (r.response === "not_going") rsvpCounts[r.event_id].not_going++;
    });

    return (
        <div className="space-y-4 pb-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Link href="/dashboard/organizations" className="hover:text-foreground transition-colors">
                    Organizations
                </Link>
                <span>/</span>
                <Link href={`/dashboard/organizations/${id}`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
                    {org.logo_url && (
                        <Image src={org.logo_url} alt={org.name} width={16} height={16} className="rounded object-cover" />
                    )}
                    {org.name}
                </Link>
                <span>/</span>
                <span className="text-foreground font-medium">Calendar</span>
            </div>

            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Event Calendar</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">{org.name}</p>
                </div>
            </div>

            {/* Calendar */}
            <CalendarGrid
                events={events}
                isOfficer={isOfficer}
                isAdmin={isAdmin}
                organizationId={id}
                initialYear={year}
                initialMonth={month}
                rsvpCounts={rsvpCounts}
                myRsvps={myRsvps}
                currentUserId={user.id}
            />
        </div>
    );
}
