"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { AnnouncementVisibility } from "@/lib/types";

async function requireOfficerOrAdmin(organizationId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: role } = await supabase.rpc("get_my_role");
    if (role === "admin") return { supabase, user };

    const { data: structuralRole } = await supabase
        .from("organization_roles")
        .select("id")
        .eq("assigned_user_id", user.id)
        .eq("organization_id", organizationId)
        .limit(1)
        .maybeSingle();

    if (structuralRole) return { supabase, user };

    throw new Error("Unauthorized: Officer or Admin role required");
}

export async function createAnnouncement(formData: FormData) {
    const organizationId = formData.get("organization_id") as string;
    const title = formData.get("title") as string;
    const body = formData.get("body") as string;
    const visibility = (formData.get("visibility") as AnnouncementVisibility) || "members";

    if (!organizationId || !title?.trim() || !body?.trim()) {
        throw new Error("Organization, title, and body are required");
    }

    const { supabase, user } = await requireOfficerOrAdmin(organizationId);

    const { error } = await supabase.from("org_announcements").insert({
        organization_id: organizationId,
        created_by: user.id,
        title: title.trim(),
        body: body.trim(),
        visibility,
    });

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${organizationId}`);
}

export async function togglePinAnnouncement(announcementId: string, pinned: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: announcement } = await supabase
        .from("org_announcements")
        .select("organization_id")
        .eq("id", announcementId)
        .single();

    if (!announcement) throw new Error("Announcement not found");

    const { supabase: verifiedClient } = await requireOfficerOrAdmin(announcement.organization_id);

    const { error } = await verifiedClient
        .from("org_announcements")
        .update({ pinned })
        .eq("id", announcementId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${announcement.organization_id}`);
}

export async function deleteAnnouncement(announcementId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: announcement } = await supabase
        .from("org_announcements")
        .select("organization_id")
        .eq("id", announcementId)
        .single();

    if (!announcement) throw new Error("Announcement not found");

    const { supabase: verifiedClient } = await requireOfficerOrAdmin(announcement.organization_id);

    const { error } = await verifiedClient
        .from("org_announcements")
        .delete()
        .eq("id", announcementId);

    if (error) throw new Error(error.message);
    revalidatePath(`/dashboard/organizations/${announcement.organization_id}`);
}

export async function getOrgAnnouncements(organizationId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("org_announcements")
        .select("*, profiles:created_by(full_name, avatar_url)")
        .eq("organization_id", organizationId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}
