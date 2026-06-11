"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { generateEngagementRecord } from "@/lib/actions/engagement-internal";
import crypto from "crypto";

export async function generateAttendanceQR(eventId: string, durationMinutes: number = 15) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: event } = await supabase
        .from("events")
        .select("id, title, created_by, organization_id, organizations(name)")
        .eq("id", eventId)
        .single();

    if (!event) throw new Error("Event not found");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (event.created_by !== user.id && profile?.role !== "admin") {
        throw new Error("Only event creators or admins can generate QR codes");
    }

    await supabase
        .from("event_attendance_sessions")
        .update({ is_active: false })
        .eq("event_id", eventId)
        .eq("is_active", true);

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000).toISOString();

    const { data: session, error } = await supabase
        .from("event_attendance_sessions")
        .insert({
            event_id: eventId,
            created_by: user.id,
            token,
            expires_at: expiresAt,
        })
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath(`/dashboard/events/${eventId}`);
    return { token: session.token, expiresAt: session.expires_at, sessionId: session.id };
}

export async function scanAttendanceQR(token: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: session } = await supabase
        .from("event_attendance_sessions")
        .select("*, events(id, title, organization_id, organizations(name))")
        .eq("token", token)
        .eq("is_active", true)
        .single();

    if (!session) throw new Error("Invalid or expired QR code");

    if (new Date(session.expires_at) < new Date()) {
        await supabase
            .from("event_attendance_sessions")
            .update({ is_active: false })
            .eq("id", session.id);
        throw new Error("This QR code has expired");
    }

    const event = session.events as { id: string; title: string; organization_id: string; organizations: { name: string } | null };

    const { data: existing } = await supabase
        .from("event_participations")
        .select("id, status")
        .eq("event_id", session.event_id)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existing) {
        if (existing.status === "attended") {
            return { success: true, message: "Attendance already recorded", eventTitle: event.title };
        }
        await supabase
            .from("event_participations")
            .update({ status: "attended" })
            .eq("id", existing.id);
    } else {
        await supabase.from("event_participations").insert({
            event_id: session.event_id,
            user_id: user.id,
            status: "attended",
        });
    }

    try {
        await generateEngagementRecord({
            userId: user.id,
            organizationId: event.organization_id,
            eventId: event.id,
            recordType: "event_attended",
            title: `Attended: ${event.title}`,
            organizationName: event.organizations?.name || null,
            hoursCredit: 1,
        });
    } catch (err) {
        console.error("Failed to generate engagement record:", err);
    }

    revalidatePath(`/dashboard/events/${session.event_id}`);
    return { success: true, message: "Attendance recorded!", eventTitle: event.title };
}

export async function closeAttendanceSession(sessionId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: session } = await supabase
        .from("event_attendance_sessions")
        .select("created_by")
        .eq("id", sessionId)
        .single();

    if (!session) throw new Error("Session not found");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (session.created_by !== user.id && profile?.role !== "admin") {
        throw new Error("Only the session creator or an admin can close this session");
    }

    const { error } = await supabase
        .from("event_attendance_sessions")
        .update({ is_active: false })
        .eq("id", sessionId);

    if (error) throw new Error(error.message);
}

export async function markAbsentees(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: event } = await supabase
        .from("events")
        .select("created_by")
        .eq("id", eventId)
        .single();

    if (!event) throw new Error("Event not found");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (event.created_by !== user.id && profile?.role !== "admin") {
        throw new Error("Only the event creator or an admin can mark absentees");
    }

    const { error } = await supabase
        .from("event_participations")
        .update({ status: "absent" })
        .eq("event_id", eventId)
        .eq("status", "registered");

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/events/${eventId}`);
}
