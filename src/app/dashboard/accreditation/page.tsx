import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AccreditationClient from "./AccreditationClient";
import { getAccreditationFileUrl } from "@/lib/actions/accreditation";

/** Pre-generate signed download URLs for a list of accreditation documents. */
async function attachDownloadUrls<T extends { id: string; storage_path: string }>(docs: T[]) {
    return Promise.all(
        docs.map(async (doc) => {
            try {
                const url = await getAccreditationFileUrl(doc.storage_path);
                return { ...doc, downloadUrl: url };
            } catch (err: unknown) {
                console.error("Failed to generate signed URL for doc:", doc.id, (err as Error).message);
                return doc;
            }
        })
    );
}

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

    const [membershipOrgsResult, structuralRoleOrgsResult] = await Promise.all([
        supabase
            .from("memberships")
            .select("organization_id, organizations(id, name)")
            .eq("user_id", user.id)
            .eq("status", "approved"),
        supabase
            .from("organization_roles")
            .select("organization_id, organizations(id, name)")
            .eq("assigned_user_id", user.id),
    ]);

    const collectOrg = (
        item: {
            organization_id: string | null;
            organizations?: { id?: string | null; name?: string | null } | { id?: string | null; name?: string | null }[] | null;
        },
        orgMap: Map<string, { id: string; name: string }>
    ) => {
        const org = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations;
        const id = org?.id || item.organization_id;
        if (!id) return;
        if (!orgMap.has(id)) {
            orgMap.set(id, { id, name: org?.name || "Unknown" });
        }
    };

    const orgMap = new Map<string, { id: string; name: string }>();
    (membershipOrgsResult.data || []).forEach((item) => collectOrg(item, orgMap));
    (structuralRoleOrgsResult.data || []).forEach((item) => collectOrg(item, orgMap));

    const officerOrgs = Array.from(orgMap.values());
    // Admins are never treated as officers for UI purposes — they have their own review view
    const isOfficer = !isAdmin && officerOrgs.length > 0;

    // Redirect students (non-officers, non-admins) away
    if (!isAdmin && !isOfficer) {
        redirect("/dashboard");
    }

    // Fetch pending accreditations
    let pendingQuery = supabase
        .from("accreditations")
        .select("id, organization_id, academic_year, status, documents_url, notes, submitted_at, submitted_by, reviewed_at, organizations(name), profiles!accreditations_submitted_by_fkey(full_name), accreditation_documents(id, file_name, storage_path, requirement_id)")
        .in("status", ["pending", "forwarded", "deliberating", "decision_received"])
        .order("submitted_at", { ascending: false });

    // Officers only see their own orgs' accreditations
    if (!isAdmin) {
        const orgIds = officerOrgs.map((o) => o.id);
        pendingQuery = pendingQuery.in("organization_id", orgIds);
    }

    const { data: rawPendingData, error: pendingError } = await pendingQuery;
    if (pendingError) {
        console.error("PENDING QUERY ERROR:", pendingError);
    }

    const pendingData = await Promise.all(
        (rawPendingData || []).map(async (acc) => ({
            ...acc,
            accreditation_documents: await attachDownloadUrls(acc.accreditation_documents || []),
        }))
    );

    // Fetch accreditation history
    let historyQuery = supabase
        .from("accreditations")
        .select("id, organization_id, academic_year, status, documents_url, notes, submitted_at, submitted_by, reviewed_at, organizations(name), profiles!accreditations_submitted_by_fkey(full_name), accreditation_documents(id, file_name, storage_path, requirement_id)")
        .in("status", ["approved", "rejected", "revalidation_required"])
        .order("reviewed_at", { ascending: false })
        .limit(50);

    if (!isAdmin) {
        const orgIds = officerOrgs.map((o) => o.id);
        historyQuery = historyQuery.in("organization_id", orgIds);
    }

    const { data: rawHistoryData } = await historyQuery;

    const historyData = await Promise.all(
        (rawHistoryData || []).map(async (acc) => ({
            ...acc,
            accreditation_documents: await attachDownloadUrls(acc.accreditation_documents || []),
        }))
    );

    // Fetch accreditation requirements
    const { data: requirementsData } = await supabase
        .from("accreditation_requirements")
        .select("*")
        .order("order_index", { ascending: true });

    const pendingAccreditations = (pendingData || []).map((item) => {
        const rawProfile = (item as Record<string, unknown>)['profiles!accreditations_submitted_by_fkey'] || (item as Record<string, unknown>).profiles;
        const submitter = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
        return {
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
            submitter: submitter as { full_name: string } | null,
        };
    });

    const accreditationHistory = (historyData || []).map((item) => {
        const rawProfile = (item as Record<string, unknown>)['profiles!accreditations_submitted_by_fkey'] || (item as Record<string, unknown>).profiles;
        const submitter = Array.isArray(rawProfile) ? rawProfile[0] : rawProfile;
        return {
            ...item,
            organizations: Array.isArray(item.organizations) ? item.organizations[0] : item.organizations,
            submitter: submitter as { full_name: string } | null,
        };
    });

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
                requirements={requirementsData || []}
            />
        </div>
    );
}
