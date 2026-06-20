import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { EngagementRecordType } from "@/lib/types";

function getAdminClient(): SupabaseClient | null {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error("Missing Supabase environment variables for generating engagement record.");
        return null;
    }
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}

export async function generateEngagementRecord(params: {
    userId: string;
    organizationId?: string | null;
    eventId?: string | null;
    recordType: EngagementRecordType;
    title: string;
    description?: string | null;
    organizationName?: string | null;
    roleTitle?: string | null;
    hoursCredit?: number;
    academicYear?: string | null;
    semester?: string | null;
    isPublic?: boolean;
}) {
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) return;

    const { error } = await supabaseAdmin.from("engagement_records").insert({
        user_id: params.userId,
        organization_id: params.organizationId || null,
        event_id: params.eventId || null,
        record_type: params.recordType,
        title: params.title,
        description: params.description || null,
        organization_name: params.organizationName || null,
        role_title: params.roleTitle || null,
        hours_credit: params.hoursCredit ?? 1,
        academic_year: params.academicYear || null,
        semester: params.semester || null,
        is_public: params.isPublic ?? true,
    });

    if (error) {
        console.error("Failed to create engagement record:", error.message);
    }
}

/**
 * Idempotently creates a "membership" engagement record for an approved
 * membership. Safe to call from every approval path — it skips if a membership
 * record already exists for the (user, organization) pair. Private-org
 * memberships default to hidden (is_public = false); the student can reveal them.
 */
export async function recordMembershipEngagement(membershipId: string) {
    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) return;

    const { data: membership, error: membershipError } = await supabaseAdmin
        .from("memberships")
        .select("user_id, organization_id, organizations(name, visibility)")
        .eq("id", membershipId)
        .single();

    if (membershipError || !membership) {
        console.error("Failed to load membership for engagement record:", membershipError?.message);
        return;
    }

    const org = membership.organizations as unknown as { name: string; visibility: string } | null;

    // Skip if a membership record already exists for this user + organization.
    const { data: existing } = await supabaseAdmin
        .from("engagement_records")
        .select("id")
        .eq("user_id", membership.user_id)
        .eq("organization_id", membership.organization_id)
        .eq("record_type", "membership")
        .limit(1)
        .maybeSingle();

    if (existing) return;

    await generateEngagementRecord({
        userId: membership.user_id,
        organizationId: membership.organization_id,
        recordType: "membership",
        title: `Joined: ${org?.name || "Organization"}`,
        organizationName: org?.name || null,
        hoursCredit: 0,
        isPublic: org?.visibility !== "private",
    });
}
