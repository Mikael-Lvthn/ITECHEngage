import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import CreateOrgDialog from "../admin/CreateOrgDialog";
import EditOrgDialog from "../admin/EditOrgDialog";
import DeleteOrgButton from "../admin/DeleteOrgButton";
import CategoryDropdown from "./CategoryDropdown";

export default async function OrganizationsPage({
    searchParams,
}: {
    searchParams: Promise<{ category?: string }>;
}) {
    const params = await searchParams;
    const currentCategory = params.category || null;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user!.id)
        .single();

    // Check RPC if profile role is not clearly defined
    let isAdmin = profile?.role === "admin";
    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole === "admin") isAdmin = true;
    }

    let orgQuery = supabase.from("organizations").select("*").order("name");

    // Non-admins only see public orgs unless it's their own membership
    if (!isAdmin) {
        orgQuery = orgQuery.eq("visibility", "public");
    }

    // Apply category filter if present
    if (currentCategory) {
        orgQuery = orgQuery.eq("category_id", currentCategory);
    }

    const [{ data: organizations }, { data: categories }] = await Promise.all([
        orgQuery,
        supabase.from("organization_categories").select("id, name").order("name"),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
                    <p className="text-muted-foreground mt-1">
                        Discover and join student organizations.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isAdmin && <CreateOrgDialog />}
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-card text-sm font-medium hover:bg-accent transition-colors card-hover"
                    >
                        <span>🏠</span> Home
                    </Link>
                </div>
            </div>

            {/* Category filter dropdown */}
            {(categories && categories.length > 0) && (
                <CategoryDropdown categories={categories} currentCategory={currentCategory} />
            )}

            {!organizations || organizations.length === 0 ? (
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-[#800000] to-[#A52A2A]" />
                    <div className="text-center py-20 px-6">
                        <div className="w-20 h-20 mx-auto rounded-2xl bg-[#800000]/10 flex items-center justify-center mb-5">
                            <span className="text-4xl animate-float">🏢</span>
                        </div>
                        <p className="font-bold text-xl">No organizations yet</p>
                        <p className="text-sm text-muted-foreground mt-2">
                            Organizations will appear here once created by admins.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {organizations.map((org, i) => {
                        return (
                            <div
                                key={org.id}
                                className="rounded-xl border bg-card flex flex-col overflow-hidden card-hover animate-slide-up relative"
                                style={{ animationDelay: `${i * 80}ms` }}
                            >
                                {isAdmin && (
                                    <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/80 backdrop-blur border rounded-lg p-1 shadow-sm z-10">
                                        <EditOrgDialog
                                            org={{
                                                id: org.id,
                                                name: org.name,
                                                description: org.description,
                                                visibility: org.visibility,
                                                logo_url: org.logo_url,
                                                cover_photo_url: org.cover_photo_url,
                                                mission: org.mission,
                                                vision: org.vision,
                                                core_values: org.core_values,
                                                category_id: org.category_id
                                            }}
                                        />
                                        <DeleteOrgButton
                                            organizationId={org.id}
                                            orgName={org.name}
                                        />
                                    </div>
                                )}
                                <Link
                                    href={`/dashboard/organizations/${org.id}`}
                                    className="p-6 flex-1 flex flex-col items-center justify-center text-center min-h-[180px]"
                                >
                                    <div className="w-24 h-24 rounded-full bg-[#800000]/5 border border-border flex items-center justify-center shrink-0 overflow-hidden mb-4 relative shadow-sm">
                                        {org.logo_url ? (
                                            <Image src={org.logo_url} alt={org.name} fill className="object-cover" />
                                        ) : (
                                            <span className="text-4xl">🏢</span>
                                        )}
                                    </div>
                                    <h3 className="font-medium text-foreground hover:text-[#800000] transition-colors text-base line-clamp-2">
                                        {org.name}
                                    </h3>
                                </Link>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
