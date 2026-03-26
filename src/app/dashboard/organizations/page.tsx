import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import JoinButton from "./JoinButton";
import CreateOrgDialog from "../admin/CreateOrgDialog";
import EditOrgDialog from "../admin/EditOrgDialog";
import DeleteOrgButton from "../admin/DeleteOrgButton";

export default async function OrganizationsPage() {
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
        // Technically, regular students only see public orgs in this list. 
        // Memberships handles private ones they are part of.
        orgQuery = orgQuery.eq("visibility", "public");
    }

    const { data: organizations } = await orgQuery;

    const { data: memberships } = await supabase
        .from("memberships")
        .select("organization_id, status")
        .eq("user_id", user!.id);

    const membershipMap = new Map(
        (memberships || []).map((m) => [m.organization_id, m.status])
    );

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
                        const status = membershipMap.get(org.id) || "none";
                        return (
                            <div
                                key={org.id}
                                className="rounded-xl border bg-card flex flex-col overflow-hidden card-hover animate-slide-up relative"
                                style={{ animationDelay: `${i * 80}ms` }}
                            >
                                <div className="h-1.5 bg-gradient-to-r from-[#800000] to-[#C9A227] shrink-0" />

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
                                                core_values: org.core_values
                                            }}
                                        />
                                        <DeleteOrgButton
                                            organizationId={org.id}
                                            orgName={org.name}
                                        />
                                    </div>
                                )}

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-14 h-14 rounded-xl border border-border/50 bg-[#800000]/5 flex flex-col items-center justify-center overflow-hidden shrink-0 relative">
                                            {org.logo_url ? (
                                                <img src={org.logo_url} alt={org.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-2xl">🏢</span>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <Link
                                                href={`/dashboard/organizations/${org.id}`}
                                                className="font-semibold text-base hover:text-primary transition-colors block truncate pr-16"
                                                title={org.name}
                                            >
                                                {org.name}
                                            </Link>
                                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${org.visibility === 'public'
                                                        ? 'bg-green-50 text-green-700 border-green-200'
                                                        : 'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}>
                                                    {org.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize border ${org.accreditation_status === 'approved'
                                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                    }`}>
                                                    {org.accreditation_status === 'approved' ? '✓ Official' : '⏳ ' + org.accreditation_status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                                        {org.description || "No description provided."}
                                    </p>

                                    <div className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3 shrink-0">
                                        <Link
                                            href={`/dashboard/organizations/${org.id}`}
                                            className="text-sm text-primary font-semibold hover:underline"
                                        >
                                            View Details →
                                        </Link>

                                        {!isAdmin && (
                                            <JoinButton
                                                organizationId={org.id}
                                                membershipStatus={status as "none" | "pending" | "approved"}
                                            />
                                        )}
                                        {isAdmin && (
                                            <div className="text-xs text-muted-foreground font-medium px-2 py-1 bg-muted rounded-md">
                                                Admin View
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
