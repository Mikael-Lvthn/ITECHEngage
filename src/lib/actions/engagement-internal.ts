import { createClient } from "@/lib/supabase/server";
import type { EngagementRecordType } from "@/lib/types";

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
}) {
    const supabase = await createClient();

    const { error } = await supabase.from("engagement_records").insert({
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
    });

    if (error) {
        console.error("Failed to create engagement record:", error.message);
    }
}
