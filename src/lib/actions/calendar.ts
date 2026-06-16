"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CalendarEvent } from "@/lib/types/calendar";

// ─── Auth helpers ──────────────────────────────────────────────────────────

async function getAuthUser() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return { supabase, user };
}

async function requireOfficerOrAdmin(
    supabase: Awaited<ReturnType<typeof createClient>>,
    userId: string,
    organizationId: string
) {
    // Check admin role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

    if (profile?.role === "admin") return true;

    // Check organization officer role assignment
    const { data: orgRole } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("assigned_user_id", userId)
        .eq("organization_id", organizationId)
        .maybeSingle();

    if (orgRole) return true;

    throw new Error("Only officers or admins can manage calendar events.");
}

// ─── Add recurrence offset ─────────────────────────────────────────────────

function addRecurrenceOffset(
    date: Date,
    recurrence: "daily" | "weekly" | "monthly" | "yearly",
    count: number
): Date {
    const d = new Date(date);
    if (recurrence === "daily") d.setDate(d.getDate() + count);
    else if (recurrence === "weekly") d.setDate(d.getDate() + count * 7);
    else if (recurrence === "monthly") d.setMonth(d.getMonth() + count);
    else if (recurrence === "yearly") d.setFullYear(d.getFullYear() + count);
    return d;
}

// ─── Server Actions ────────────────────────────────────────────────────────

export async function createCalendarEvent(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    const organizationId = formData.get("organization_id") as string;
    await requireOfficerOrAdmin(supabase, user.id, organizationId);

    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const color = (formData.get("color") as string) || "#800000";
    const isAllDay = formData.get("is_all_day") === "true";
    const startDatetime = formData.get("start_datetime") as string;
    const endDatetime = (formData.get("end_datetime") as string) || null;
    const location = (formData.get("location") as string)?.trim() || null;
    const status = (formData.get("status") as string) || "draft";
    const recurrence = (formData.get("recurrence") as string) || null;
    const recurrenceEndDate = (formData.get("recurrence_end_date") as string) || null;

    if (!title) throw new Error("Title is required.");
    if (!startDatetime) throw new Error("Start date/time is required.");
    if (endDatetime && new Date(endDatetime) <= new Date(startDatetime)) {
        throw new Error("End date must be after start date.");
    }
    if (recurrence && recurrence !== "null" && !recurrenceEndDate) {
        throw new Error("Recurrence end date is required when recurrence is set.");
    }

    const baseEvent = {
        organization_id: organizationId,
        title,
        description,
        color,
        is_all_day: isAllDay,
        location,
        status,
        created_by: user.id,
        recurrence: recurrence === "null" ? null : recurrence,
        recurrence_end_date: recurrence && recurrence !== "null" ? recurrenceEndDate : null,
    };

    // Calculate duration
    const startDate = new Date(startDatetime);
    const endDate = endDatetime ? new Date(endDatetime) : null;
    const durationMs = endDate ? endDate.getTime() - startDate.getTime() : 0;

    // Insert base event
    const { data: createdEvent, error } = await supabase
        .from("events")
        .insert({
            ...baseEvent,
            start_datetime: startDatetime,
            end_datetime: endDatetime,
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    // Generate recurring instances (max 365)
    if (recurrence && recurrence !== "null" && recurrenceEndDate) {
        const recurrenceEnd = new Date(recurrenceEndDate);
        const instances = [];
        let count = 1;

        while (count < 365) {
            const instanceStart = addRecurrenceOffset(startDate, recurrence as "daily" | "weekly" | "monthly" | "yearly", count);
            if (instanceStart > recurrenceEnd) break;

            const instanceEnd = endDate
                ? new Date(instanceStart.getTime() + durationMs)
                : null;

            instances.push({
                ...baseEvent,
                title: `${title}`,
                start_datetime: instanceStart.toISOString(),
                end_datetime: instanceEnd?.toISOString() || null,
            });

            count++;
            if (instances.length >= 364) break;
        }

        if (instances.length > 0) {
            await supabase.from("events").insert(instances);
        }
    }

    // Notify org members if published
    if (status === "published" && createdEvent) {
        const { data: members } = await supabase
            .from("memberships")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("status", "approved");

        if (members && members.length > 0) {
            const notifications = members.map((m) => ({
                user_id: m.user_id,
                type: "event_published",
                title: `New Event: ${title}`,
                message: `A new event has been added to the calendar.`,
                link: `/dashboard/organizations/${organizationId}/calendar`,
                status: "unread",
            }));

            await supabase.from("notifications").insert(notifications);
        }
    }

    revalidatePath(`/dashboard/organizations/${organizationId}/calendar`);
    return createdEvent;
}

export async function updateCalendarEvent(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    const eventId = formData.get("event_id") as string;
    const organizationId = formData.get("organization_id") as string;
    await requireOfficerOrAdmin(supabase, user.id, organizationId);

    const title = (formData.get("title") as string).trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const color = (formData.get("color") as string) || "#800000";
    const isAllDay = formData.get("is_all_day") === "true";
    const startDatetime = formData.get("start_datetime") as string;
    const endDatetime = (formData.get("end_datetime") as string) || null;
    const location = (formData.get("location") as string)?.trim() || null;
    const newStatus = (formData.get("status") as string) || "draft";

    if (!title) throw new Error("Title is required.");
    if (endDatetime && new Date(endDatetime) <= new Date(startDatetime)) {
        throw new Error("End date must be after start date.");
    }

    // Check prior status for notification logic
    const { data: existingEvent } = await supabase
        .from("events")
        .select("status")
        .eq("id", eventId)
        .single();

    const { error } = await supabase
        .from("events")
        .update({
            title,
            description,
            color,
            is_all_day: isAllDay,
            start_datetime: startDatetime,
            end_datetime: endDatetime,
            location,
            status: newStatus,
        })
        .eq("id", eventId);

    if (error) throw new Error(error.message);

    // Notify members if status changed to published
    if (existingEvent?.status !== "published" && newStatus === "published") {
        const { data: members } = await supabase
            .from("memberships")
            .select("user_id")
            .eq("organization_id", organizationId)
            .eq("status", "approved");

        if (members && members.length > 0) {
            const notifications = members.map((m) => ({
                user_id: m.user_id,
                type: "event_published",
                title: `Event Published: ${title}`,
                message: `An event has been published to the calendar.`,
                link: `/dashboard/organizations/${organizationId}/calendar`,
                status: "unread",
            }));
            await supabase.from("notifications").insert(notifications);
        }
    }

    revalidatePath(`/dashboard/organizations/${organizationId}/calendar`);
}

export async function deleteCalendarEvent(eventId: string, orgId: string, hardDelete = false) {
    const { supabase, user } = await getAuthUser();
    await requireOfficerOrAdmin(supabase, user.id, orgId);

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const isAdmin = profile?.role === "admin";

    if (hardDelete && isAdmin) {
        const { error } = await supabase.from("events").delete().eq("id", eventId);
        if (error) throw new Error(error.message);
    } else {
        const { error } = await supabase
            .from("events")
            .update({ status: "cancelled" })
            .eq("id", eventId);
        if (error) throw new Error(error.message);
    }

    revalidatePath(`/dashboard/organizations/${orgId}/calendar`);
}

export async function rsvpToEvent(
    eventId: string,
    response: "going" | "maybe" | "not_going"
) {
    const { supabase, user } = await getAuthUser();

    const { error } = await supabase
        .from("event_rsvp")
        .upsert(
            { event_id: eventId, user_id: user.id, response },
            { onConflict: "event_id,user_id" }
        );

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard");
}

export async function getCalendarEvents(
    orgId: string,
    year: number,
    month: number
): Promise<CalendarEvent[]> {
    const { supabase, user } = await getAuthUser();

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
        .eq("organization_id", orgId)
        .maybeSingle();

    const isOfficer = !!orgRole || isAdmin;

    // Month ± 1 buffer
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month + 2, 0);

    let query = supabase
        .from("events")
        .select("*")
        .eq("organization_id", orgId)
        .gte("start_datetime", firstDay.toISOString())
        .lte("start_datetime", lastDay.toISOString())
        .order("start_datetime", { ascending: true });

    if (!isOfficer) {
        query = query.eq("status", "published");
    } else {
        query = query.in("status", ["draft", "published", "cancelled"]);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    return (data || []).map((e) => ({
        ...e,
        color: e.color || "#800000",
        is_all_day: e.is_all_day || false,
        recurrence: e.recurrence || null,
        recurrence_end_date: e.recurrence_end_date || null,
    })) as CalendarEvent[];
}
