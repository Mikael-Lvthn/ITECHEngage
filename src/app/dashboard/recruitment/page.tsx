import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecruitmentPageClient from "@/app/dashboard/recruitment/RecruitmentPageClient";

export default async function RecruitmentPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");
    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("id, title, organization_id, organizations(id, name)")
        .eq("assigned_user_id", user.id)
        .limit(10);

    const hasOrgRole = orgRoles && orgRoles.length > 0;

    if (!hasOrgRole) redirect("/dashboard");

    const positions = orgRoles.map((r) => ({
        id: r.id,
        title: r.title,
        organization_id: r.organization_id,
        organization: Array.isArray(r.organizations)
            ? (r.organizations[0] as { id: string; name: string })
            : (r.organizations as { id: string; name: string } | null),
    }));

    // Fetch active recruitment posts for these orgs
    const orgIds = positions.map((p) => p.organization_id).filter(Boolean) as string[];

    const { data: activeRecruitments } = await supabase
        .from("recruitment_requests")
        .select("id, title, description, is_active, created_at, organization_id, organizations(name)")
        .in("organization_id", orgIds)
        .order("created_at", { ascending: false })
        .limit(20);

    const recruitments = (activeRecruitments || []).map((r) => ({
        ...r,
        organizations: Array.isArray(r.organizations)
            ? (r.organizations[0] as { name: string })
            : (r.organizations as { name: string } | null),
    }));

    return (
        <RecruitmentPageClient
            positions={positions.filter((p) => p.organization !== null) as {
                id: string;
                title: string;
                organization_id: string;
                organization: { id: string; name: string };
            }[]}
            recruitments={recruitments}
        />
    );
}
