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
        const { data: membership } = await supabase
            .from("memberships")
            .select("id, role")
            .eq("user_id", user.id)
            .eq("organization_id", formData.organizationId)
            .eq("role", "officer")
            .eq("status", "approved")
            .single();

        if (!membership) {
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
        const { data: membership } = await supabase
            .from("memberships")
            .select("id")
            .eq("user_id", user.id)
            .eq("organization_id", event.organization_id)
            .eq("role", "officer")
            .eq("status", "approved")
            .single();

        if (membership) isAuthorized = true;
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
