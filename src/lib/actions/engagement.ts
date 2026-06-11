"use server";

import { createClient } from "@/lib/supabase/server";

export async function getUserEngagementSummary(userId: string) {
    const supabase = await createClient();

    const { data: records, error } = await supabase
        .from("engagement_records")
        .select("*")
        .eq("user_id", userId)
        .order("date_earned", { ascending: false });

    if (error) throw new Error(error.message);

    const summary = {
        totalRecords: records?.length || 0,
        totalHours: 0,
        byType: {} as Record<string, { count: number; hours: number }>,
        records: records || [],
    };

    for (const record of records || []) {
        summary.totalHours += Number(record.hours_credit) || 0;
        const type = record.record_type;
        if (!summary.byType[type]) {
            summary.byType[type] = { count: 0, hours: 0 };
        }
        summary.byType[type].count++;
        summary.byType[type].hours += Number(record.hours_credit) || 0;
    }

    return summary;
}

export async function toggleVerification(recordId: string, verified: boolean) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "admin") throw new Error("Unauthorized");

    const { error } = await supabase
        .from("engagement_records")
        .update({
            verified,
            verified_by: verified ? user.id : null,
            verified_at: verified ? new Date().toISOString() : null,
        })
        .eq("id", recordId);

    if (error) throw new Error(error.message);
}
