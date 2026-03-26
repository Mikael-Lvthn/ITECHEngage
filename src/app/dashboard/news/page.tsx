import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewsManagerClient from "./NewsManagerClient";

export default async function NewsManagementPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: role } = await supabase.rpc("get_my_role");

    // Admins see all pending news to accredit
    if (role === "admin") {
        const { data: pendingNews } = await supabase
            .from("news")
            .select("*, organizations(name, logo_url), creator:profiles(full_name)")
            .eq("status", "pending")
            .order("created_at", { ascending: false });

        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">News Accreditation Queue</h1>
                        <p className="text-gray-500 mt-1">Review and approve news submissions from student organizations.</p>
                    </div>
                </div>
                <NewsManagerClient initialNews={pendingNews || []} userRole="admin" />
            </div>
        );
    }

    // Officers see news for organizations they manage
    const { data: memberships } = await supabase
        .from("memberships")
        .select("organization_id, organizations(name)")
        .eq("user_id", user.id)
        .eq("role", "officer")
        .eq("status", "approved");

    const isOfficer = memberships && memberships.length > 0;

    if (!isOfficer) {
        return (
            <div className="p-12 text-center text-gray-500 border rounded-xl bg-gray-50">
                You must be an organization officer to create and manage news.
            </div>
        );
    }

    const orgIds = memberships.map(m => m.organization_id);

    const { data: orgNews } = await supabase
        .from("news")
        .select("*, organizations(name)")
        .in("organization_id", orgIds)
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Manage News</h1>
                    <p className="text-gray-500 mt-1">Create and track announcements for your organizations.</p>
                </div>
            </div>

            <NewsManagerClient
                initialNews={orgNews || []}
                userRole="officer"
                userOrganizations={memberships.map(m => ({
                    id: m.organization_id,
                    name: (m.organizations as any)?.name
                }))}
            />
        </div>
    );
}
