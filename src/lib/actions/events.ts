"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createEvent(formData: {
    organizationId: string;
    title: string;
    description: string;
    location: string;
    startDatetime: string;
    endDatetime: string;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    const isAdmin = profile?.role === "admin";

    if (!isAdmin) {
        // Check structural roles (organization_roles) instead of memberships.role
        const { data: structuralRole } = await supabase
            .from("organization_roles")
            .select("id")
            .eq("assigned_user_id", user.id)
            .eq("organization_id", formData.organizationId)
            .limit(1)
            .maybeSingle();

        if (!structuralRole) {
            throw new Error("Only officers or admins can create events");
        }
    }

    const { error } = await supabase.from("events").insert({
        organization_id: formData.organizationId,
        title: formData.title,
        description: formData.description || null,
        location: formData.location,
        start_datetime: formData.startDatetime,
        end_datetime: formData.endDatetime || null,
        status: "draft",
        created_by: user.id,
    });

    if (error) throw new Error(error.message);

    // Notify admins about new event submission
    const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin");

    if (admins && admins.length > 0) {
        await supabase.from("notifications").insert(
            admins.map((admin) => ({
                user_id: admin.id,
                type: "content_submission",
                title: "New Event Submission",
                message: `A new event "${formData.title}" has been submitted for review.`,
                link: "/dashboard/news-and-events",
                status: "unread",
            }))
        );
    }

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/news-and-events");
    revalidatePath("/");
}

export async function approveEvent(eventId: string) {
    const supabase = await createClient();

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") throw new Error("Unauthorized: Admin role required");

    const { error } = await supabase
        .from("events")
        .update({ status: "published" })
        .eq("id", eventId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/news-and-events");
    revalidatePath("/");
}

export async function rejectEvent(eventId: string) {
    const supabase = await createClient();

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") throw new Error("Unauthorized: Admin role required");

    const { error } = await supabase
        .from("events")
        .update({ status: "cancelled" })
        .eq("id", eventId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/news-and-events");
    revalidatePath("/");
}

export async function deleteEvent(eventId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { data: event } = await supabase
        .from("events")
        .select("organization_id, created_by")
        .eq("id", eventId)
        .single();

    if (!event) throw new Error("Event not found");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    let isAuthorized = false;

    if (profile?.role === "admin" || event.created_by === user.id) {
        isAuthorized = true;
    } else {
        // Check structural roles (organization_roles) instead of memberships.role
        const { data: structuralRole } = await supabase
            .from("organization_roles")
            .select("id")
            .eq("assigned_user_id", user.id)
            .eq("organization_id", event.organization_id)
            .limit(1)
            .maybeSingle();

        if (structuralRole) isAuthorized = true;
    }

    if (!isAuthorized) throw new Error("Not authorized to delete this event");

    const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/news-and-events");
    revalidatePath("/");
}

export async function registerForEvent(eventId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("event_participations")
        .insert({
            event_id: eventId,
            user_id: user.id,
            status: "registered",
        });

    if (error) {
        if (error.code === "23505") {
            throw new Error("You are already registered for this event");
        }
        throw new Error(error.message);
    }

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/news-and-events");
}

export async function unregisterFromEvent(eventId: string) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
        .from("event_participations")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/news-and-events");
}

export async function updateParticipationStatus(
    participationId: string,
    status: "registered" | "attended" | "absent",
    orgId: string
) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("Not authenticated");

    // Check if admin
    const { data: role } = await supabase.rpc("get_my_role");
    const isAdmin = role === "admin";

    if (!isAdmin) {
        // Check structural roles (organization_roles) instead of memberships.role
        const { data: structuralRole } = await supabase
            .from("organization_roles")
            .select("id")
            .eq("assigned_user_id", user.id)
            .eq("organization_id", orgId)
            .limit(1)
            .maybeSingle();

        if (!structuralRole) {
            throw new Error("Only officers or admins can update participation status");
        }
    }

    const { error } = await supabase
        .from("event_participations")
        .update({ status })
        .eq("id", participationId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/events");
    revalidatePath("/dashboard/news-and-events");
}
