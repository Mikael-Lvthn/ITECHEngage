"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { recordMembershipEngagement } from "@/lib/actions/engagement-internal";
import { issueMembershipCertificate } from "@/lib/pdf/certificate";
import { checkNotificationPreference } from "@/lib/utils/notifications";

export async function approveMembership(membershipId: string) {
    const supabase = await createClient();

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") throw new Error("Unauthorized: Admin role required");

    const { data: membership } = await supabase
        .from("memberships")
        .select("user_id")
        .eq("id", membershipId)
        .single();

    if (!membership) throw new Error("Membership not found");

    const { error } = await supabase
        .from("memberships")
        .update({ status: "approved" })
        .eq("id", membershipId);

    if (error) throw new Error(error.message);

    await supabase
        .from("profiles")
        .update({ role: "officer" })
        .eq("id", membership.user_id)
        .eq("role", "student");

    const { data: membershipRow } = await supabase
        .from("memberships")
        .select("organization_id, organizations(name)")
        .eq("id", membershipId)
        .single();

    if (membershipRow) {
        const org = membershipRow.organizations as unknown as { name: string } | null;
        try {
            await recordMembershipEngagement(membershipId);
        } catch (err) {
            console.error("Failed to generate engagement record:", err);
        }

        // Issue the membership certificate (if the org has a template). Isolated
        // so a cert failure can never block the approval.
        try {
            await issueMembershipCertificate(membershipId);
        } catch (err) {
            console.error("Failed to issue certificate:", err);
        }

        const shouldNotify = await checkNotificationPreference(membership.user_id, "membership_updates");
        if (shouldNotify) {
            await supabase.from("notifications").insert({
                user_id: membership.user_id,
                type: "membership_approved",
                title: "Membership Approved",
                message: `Your membership in ${org?.name || "an organization"} has been approved.`,
                link: `/dashboard/organizations/${membershipRow.organization_id}`,
            });
        }
    }

    revalidatePath("/dashboard", "layout");
}

export async function rejectMembership(membershipId: string) {
    const supabase = await createClient();

    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") throw new Error("Unauthorized: Admin role required");

    const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", membershipId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard", "layout");
}
