import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberActions from "./MemberActions";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function MembersPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: org } = await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", id)
        .single();

    if (!org) notFound();

    const { data: myMembership } = await supabase
        .from("memberships")
        .select("role")
        .eq("user_id", user!.id)
        .eq("organization_id", id)
        .eq("status", "approved")
        .maybeSingle();

    if (!myMembership || myMembership.role !== "officer") {
        redirect(`/dashboard/organizations/${id}`);
    }

    const { data: members } = await supabase
        .from("memberships")
        .select("id, role, status, profiles(full_name, email)")
        .eq("organization_id", id)
        .order("status", { ascending: true });

    const pendingMembers = (members || []).filter(
        (m) => m.status === "pending"
    );
    const approvedMembers = (members || []).filter(
        (m) => m.status === "approved"
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <Link
                    href={`/dashboard/organizations/${id}`}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    ← Back
                </Link>
                <span className="text-muted-foreground">/</span>
                <h1 className="text-lg font-semibold">{org.name} — Members</h1>
            </div>

            {pendingMembers.length > 0 && (
                <div className="rounded-xl border bg-card p-5 shadow-sm">
                    <h2 className="font-semibold mb-3">
                        ⏳ Pending Requests ({pendingMembers.length})
                    </h2>
                    <div className="divide-y">
                        {pendingMembers.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-center justify-between py-3"
                            >
                                <div>
                                    <p className="font-medium text-sm">
                                        {(m.profiles as unknown as { full_name: string; email: string })?.full_name ||
                                            "Unknown"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(m.profiles as unknown as { full_name: string; email: string })?.email}
                                    </p>
                                </div>
                                <MemberActions
                                    membershipId={m.id}
                                    orgId={id}
                                    currentStatus={m.status}
                                    currentRole={m.role}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-xl border bg-card p-5 shadow-sm">
                <h2 className="font-semibold mb-3">
                    ✅ Active Members ({approvedMembers.length})
                </h2>
                {approvedMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No approved members yet.</p>
                ) : (
                    <div className="divide-y">
                        {approvedMembers.map((m) => (
                            <div
                                key={m.id}
                                className="flex items-center justify-between py-3"
                            >
                                <div>
                                    <p className="font-medium text-sm">
                                        {(m.profiles as unknown as { full_name: string; email: string })?.full_name ||
                                            "Unknown"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(m.profiles as unknown as { full_name: string; email: string })?.email}
                                    </p>
                                </div>
                                <MemberActions
                                    membershipId={m.id}
                                    orgId={id}
                                    currentStatus={m.status}
                                    currentRole={m.role}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
