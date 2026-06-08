import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccreditationClient from "./AccreditationClient";

export default async function AccreditationPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    let userRole = profile?.role || "student";
    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) userRole = rpcRole;
    }

    const isAdmin = userRole === "admin";

    // Check if user is officer in any org
    const { data: officerMemberships } = await supabase
        .from("memberships")
        .select("organization_id, organizations(id, name)")
        .eq("user_id", user.id)
        .eq("role", "officer")
        .eq("status", "approved");

    const isOfficer = (officerMemberships && officerMemberships.length > 0) || false;

    const officerOrgs = (officerMemberships || []).map((m) => {
        const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
        return { id: org?.id || m.organization_id, name: org?.name || "Unknown" };
    });

    // Redirect students (non-officers, non-admins) away
    if (!isAdmin && !isOfficer) {
        redirect("/dashboard");
    }

    // Fetch pending accreditations
    let pendingQuery = supabase
        .from("accreditations")
        .select("id, organization_id, academic_year, status, documents_url, notes, submitted_at, submitted_by, reviewed_at, organizations(name), profiles!accreditations_submitted_by_fkey(full_name)")
        .eq("status", "pending")
        .order("submitted_at", { ascending: false });

    // Officers only see their own orgs' accreditations
    if (!isAdmin) {
        const orgIds = officerOrgs.map((o) => o.id);
        pendingQuery = pendingQuery.in("organization_id", orgIds);
    }

    const { data: pendingData } = await pendingQuery;

    // Fetch accreditation history
    let historyQuery = supabase
        .from("accreditations")
        .select("id, organization_id, academic_year, status, documents_url, notes, submitted_at, submitted_by, reviewed_at, organizations(name)")
        .neq("status", "pending")
        .order("reviewed_at", { ascending: false })
        .limit(50);

    if (!isAdmin) {
        const orgIds = officerOrgs.map((o) => o.id);
        historyQuery = historyQuery.in("organization_id", orgIds);
    }

    const { data: historyData } = await historyQuery;

    const pendingAccreditations = (pendingData || []).map((item) => ({
        ...item,
        organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
        submitter: Array.isArray((item as Record<string, unknown>).profiles)
            ? ((item as Record<string, unknown>).profiles as { full_name: string }[])[0]
            : (item as Record<string, unknown>).profiles as { full_name: string } | null,
    }));

    const accreditationHistory = (historyData || []).map((item) => ({
        ...item,
        organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
    }));

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Accreditation</h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin
                            ? "Review and manage organization accreditation applications."
                            : "Submit and track your organization's accreditation status."}
                    </p>
                </div>
            </div>

            <AccreditationClient
                isAdmin={isAdmin}
                isOfficer={isOfficer}
                pendingAccreditations={pendingAccreditations}
                accreditationHistory={accreditationHistory}
                officerOrgs={officerOrgs}
            />
        </div>
    );
}
