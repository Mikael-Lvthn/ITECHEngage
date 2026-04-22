"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function getAuthUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    return { supabase, user };
}

async function requireAdmin(supabase: any) {
    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") {
        throw new Error("Only administrators can perform this action.");
    }
}

export async function createElection(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    // Admin only
    await requireAdmin(supabase);

    const organizationId = formData.get("organization_id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;

    if (!organizationId || !title || !startDate) {
        throw new Error("Organization, title, and start date are required.");
    }

    if (endDate && new Date(endDate) <= new Date(startDate)) {
        throw new Error("End date must be after start date.");
    }

    // Create election in 'draft' status - immediately visible in org's Elections tab
    const { data: election, error } = await supabase.from("elections").insert({
        organization_id: organizationId,
        title: title.trim(),
        description: description?.trim() || null,
        start_date: startDate,
        end_date: endDate || null,
        status: "draft",
        created_by: user.id,
    }).select().single();

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/organizations/${organizationId}`);
    
    return election;
}

export async function publishElection(electionId: string) {
    const { supabase } = await getAuthUser();

    // Admin only
    await requireAdmin(supabase);

    const { data: election } = await supabase
        .from("elections")
        .select("organization_id, status")
        .eq("id", electionId)
        .single();

    if (!election) throw new Error("Election not found");
    if (election.status !== "draft") {
        throw new Error("Only draft elections can be published.");
    }

    // Verify all contestable roles have at least one nominee
    // Exclude: directly-assigned roles AND vacant roles
    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("id, title, assigned_user_id")
        .eq("organization_id", election.organization_id);

    const { data: vacantRoles } = await supabase
        .from("election_vacant_roles")
        .select("role_id")
        .eq("election_id", electionId);

    const vacantRoleIds = new Set((vacantRoles || []).map((v) => v.role_id));

    const { data: candidates } = await supabase
        .from("candidates")
        .select("organization_role_id")
        .eq("election_id", electionId);

    const candidateRoleIds = new Set((candidates || []).map((c) => c.organization_role_id));

    const unfilledRoles = (orgRoles || []).filter(
        (r) => !r.assigned_user_id && !vacantRoleIds.has(r.id) && !candidateRoleIds.has(r.id)
    );

    if (unfilledRoles.length > 0) {
        const names = unfilledRoles.map((r) => r.title).join(", ");
        throw new Error(
            `Cannot publish: the following roles have no nominees — ${names}. All contestable roles must have at least one nominee before publishing.`
        );
    }

    // Transition from draft to published - visible on Homepage
    const { error } = await supabase
        .from("elections")
        .update({ status: "published" })
        .eq("id", electionId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/elections/${electionId}`);
    revalidatePath(`/dashboard/organizations/${election.organization_id}`);
    revalidatePath("/"); // Homepage
}

export async function startVoting(electionId: string) {
    const { supabase } = await getAuthUser();

    // Admin only
    await requireAdmin(supabase);

    const { data: election } = await supabase
        .from("elections")
        .select("organization_id, status")
        .eq("id", electionId)
        .single();

    if (!election) throw new Error("Election not found");
    if (election.status !== "published") {
        throw new Error("Only published elections can start voting.");
    }

    // Transition from published to voting - triggers notification to followers
    const { error } = await supabase
        .from("elections")
        .update({ status: "voting" })
        .eq("id", electionId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/elections/${electionId}`);
    revalidatePath(`/dashboard/organizations/${election.organization_id}`);
    revalidatePath("/"); // Homepage
}

export async function nominateCandidate(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    const electionId = formData.get("election_id") as string;
    const organizationRoleId = formData.get("organization_role_id") as string;
    const platform = formData.get("platform") as string;

    if (!electionId || !organizationRoleId) {
        throw new Error("Election and role are required.");
    }

    const { data: election } = await supabase
        .from("elections")
        .select("organization_id, status")
        .eq("id", electionId)
        .single();

    // Server-side guard: nominations only during draft phase
    if (!election || election.status !== "draft") {
        throw new Error("Nominations are only allowed during the draft phase.");
    }

    // Must be an approved member (not admin)
    const { data: membership } = await supabase
        .from("memberships")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("organization_id", election.organization_id)
        .eq("status", "approved")
        .maybeSingle();

    if (!membership) {
        throw new Error("You must be an approved member of this organization to nominate yourself.");
    }

    // Check admin — admins cannot nominate
    const { data: role } = await supabase.rpc("get_my_role");
    if (role === "admin") {
        throw new Error("Administrators cannot nominate themselves in elections.");
    }

    const { data: existingCandidate } = await supabase
        .from("candidates")
        .select("id")
        .eq("election_id", electionId)
        .eq("organization_role_id", organizationRoleId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (existingCandidate) {
        throw new Error("You have already nominated yourself for this role.");
    }

    const { data: orgRole } = await supabase
        .from("organization_roles")
        .select("title, assigned_user_id")
        .eq("id", organizationRoleId)
        .single();

    // Check if role is directly assigned (locked)
    if (orgRole?.assigned_user_id) {
        throw new Error("This role is directly assigned and cannot accept nominations.");
    }

    // Check if role is marked vacant for this election
    const { data: vacantEntry } = await supabase
        .from("election_vacant_roles")
        .select("role_id")
        .eq("election_id", electionId)
        .eq("role_id", organizationRoleId)
        .maybeSingle();

    if (vacantEntry) {
        throw new Error("This role has been marked as vacant for this election.");
    }

    const { error } = await supabase.from("candidates").insert({
        election_id: electionId,
        user_id: user.id,
        position: orgRole?.title || "Unknown",
        organization_role_id: organizationRoleId,
        platform: platform?.trim() || null,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/elections/${electionId}`);
}

export async function markRoleVacant(electionId: string, roleId: string, vacant: boolean) {
    const { supabase } = await getAuthUser();
    await requireAdmin(supabase);

    const { data: election } = await supabase
        .from("elections")
        .select("organization_id, status")
        .eq("id", electionId)
        .single();

    if (!election) throw new Error("Election not found.");
    if (election.status !== "draft") {
        throw new Error("Roles can only be marked vacant during the draft phase.");
    }

    if (vacant) {
        // Mark as vacant
        const { error } = await supabase
            .from("election_vacant_roles")
            .insert({ election_id: electionId, role_id: roleId });

        if (error && !error.message.includes("duplicate")) throw new Error(error.message);

        // Remove any existing nominees for this role in this election
        await supabase
            .from("candidates")
            .delete()
            .eq("election_id", electionId)
            .eq("organization_role_id", roleId);
    } else {
        // Remove vacant marking
        const { error } = await supabase
            .from("election_vacant_roles")
            .delete()
            .eq("election_id", electionId)
            .eq("role_id", roleId);

        if (error) throw new Error(error.message);
    }

    revalidatePath(`/dashboard/elections/${electionId}`);
    revalidatePath("/dashboard/elections");
}

export async function castVote(electionId: string, candidateId: string, organizationRoleId: string) {
    const { supabase, user } = await getAuthUser();

    // Verify the user is not an admin (admins cannot vote)
    const { data: role } = await supabase.rpc("get_my_role");
    if (role === "admin") {
        throw new Error("Administrators cannot vote in elections.");
    }

    // Get the election
    const { data: election } = await supabase
        .from("elections")
        .select("organization_id, status")
        .eq("id", electionId)
        .single();

    // Only allow voting in 'voting' status
    if (!election || election.status !== "voting") {
        throw new Error("Voting is not currently open for this election.");
    }

    // Verify user is an approved member of the organization
    const { data: membership } = await supabase
        .from("memberships")
        .select("id, role, status")
        .eq("user_id", user.id)
        .eq("organization_id", election.organization_id)
        .eq("status", "approved")
        .maybeSingle();

    if (!membership || membership.status !== "approved") {
        throw new Error("Only approved members can vote in elections.");
    }

    // Prevent voting for yourself: check if the candidate being voted for is the current user
    const { data: candidate } = await supabase
        .from("candidates")
        .select("id, user_id")
        .eq("id", candidateId)
        .single();

    if (!candidate) {
        throw new Error("Candidate not found.");
    }

    if (candidate.user_id === user.id) {
        throw new Error("You cannot vote for yourself.");
    }

    // Cast the vote via RPC (handles duplicate vote prevention)
    const { data, error } = await supabase.rpc("cast_vote", {
        p_election_id: electionId,
        p_candidate_id: candidateId,
        p_organization_role_id: organizationRoleId,
    });

    if (error) throw new Error(error.message);

    const result = data as { error?: string; success?: boolean };
    if (result.error) {
        throw new Error(result.error);
    }

    // ── Auto-close check ──
    // After a successful vote, determine if all members have voted for every
    // votable role.  Directly-assigned roles are exempt from vote counting.
    try {
        // 1. Total approved members in the organization
        const { count: memberCount } = await supabase
            .from("memberships")
            .select("*", { count: "exact", head: true })
            .eq("organization_id", election.organization_id)
            .eq("status", "approved");

        if (memberCount && memberCount > 0) {
            // 2. Get org roles that are NOT directly assigned (i.e. need voting)
            const { data: orgRoles } = await supabase
                .from("organization_roles")
                .select("id, assigned_user_id")
                .eq("organization_id", election.organization_id);

            // 2b. Get vacant roles for this election
            const { data: vacantRoles } = await supabase
                .from("election_vacant_roles")
                .select("role_id")
                .eq("election_id", electionId);

            const vacantRoleIds = new Set((vacantRoles || []).map((v) => v.role_id));

            // Contested roles = not directly assigned AND not vacant
            const votableRoleIds = (orgRoles || [])
                .filter((r) => !r.assigned_user_id && !vacantRoleIds.has(r.id))
                .map((r) => r.id);

            if (votableRoleIds.length > 0) {
                // 3. For each contested role, count total votes cast in this election
                const { data: voteCounts } = await supabase
                    .from("votes")
                    .select("organization_role_id")
                    .eq("election_id", electionId)
                    .in("organization_role_id", votableRoleIds);

                // Group vote counts by role
                const countByRole = new Map<string, number>();
                (voteCounts || []).forEach((v) => {
                    countByRole.set(
                        v.organization_role_id,
                        (countByRole.get(v.organization_role_id) || 0) + 1
                    );
                });

                // 4. Check if ALL contested roles have reached memberCount votes
                // Auto-complete only when the last role hits the threshold
                const allComplete = votableRoleIds.every(
                    (roleId) => (countByRole.get(roleId) || 0) >= memberCount
                );

                if (allComplete) {
                    // Auto-complete the election
                    await supabase
                        .from("elections")
                        .update({ status: "completed", end_date: new Date().toISOString() })
                        .eq("id", electionId);

                    revalidatePath(`/dashboard/organizations/${election.organization_id}`);
                    revalidatePath("/");
                }
            }
        }
    } catch (autoCloseErr) {
        // Don't fail the vote if auto-close check errors — the vote was already recorded
        console.error("Auto-close check failed:", autoCloseErr);
    }

    revalidatePath(`/dashboard/elections/${electionId}`);
    revalidatePath("/dashboard/elections");
}

export async function completeElection(electionId: string) {
    const { supabase } = await getAuthUser();

    // Admin only
    await requireAdmin(supabase);

    const { data: election } = await supabase
        .from("elections")
        .select("organization_id, status")
        .eq("id", electionId)
        .single();

    if (!election) throw new Error("Election not found");
    if (election.status !== "voting") {
        throw new Error("Only elections in voting phase can be completed.");
    }

    // Transition from voting to completed
    const { error } = await supabase
        .from("elections")
        .update({
            status: "completed",
            end_date: new Date().toISOString(),
        })
        .eq("id", electionId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/elections/${electionId}`);
    revalidatePath(`/dashboard/organizations/${election.organization_id}`);
    revalidatePath("/"); // Homepage
}

export async function deleteElection(electionId: string) {
    const { supabase } = await getAuthUser();

    // Admin only
    await requireAdmin(supabase);

    const { data: election } = await supabase
        .from("elections")
        .select("organization_id, status")
        .eq("id", electionId)
        .single();

    if (!election) throw new Error("Election not found");

    // Delete votes first (references candidates)
    await supabase
        .from("votes")
        .delete()
        .eq("election_id", electionId);

    // Delete candidates (references election)
    await supabase
        .from("candidates")
        .delete()
        .eq("election_id", electionId);

    // Delete vacant role entries
    await supabase
        .from("election_vacant_roles")
        .delete()
        .eq("election_id", electionId);

    // Delete the election itself
    const { error } = await supabase
        .from("elections")
        .delete()
        .eq("id", electionId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/organizations/${election.organization_id}`);
    revalidatePath("/");
}

export async function publishElectionResults(electionId: string) {
    const { supabase } = await getAuthUser();

    // Admin only
    await requireAdmin(supabase);

    const { data, error } = await supabase.rpc("publish_election_results", {
        p_election_id: electionId,
    });

    if (error) throw new Error(error.message);

    const result = data as { error?: string; success?: boolean };
    if (result.error) {
        throw new Error(result.error);
    }

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/elections/${electionId}`);
}

export async function withdrawNomination(candidateId: string) {
    const { supabase, user } = await getAuthUser();

    const { data: candidate } = await supabase
        .from("candidates")
        .select("election_id, user_id")
        .eq("id", candidateId)
        .single();

    if (!candidate) throw new Error("Candidate not found.");
    if (candidate.user_id !== user.id) throw new Error("You can only withdraw your own nomination.");

    const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", candidateId);

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/elections/${candidate.election_id}`);
}

export async function getElectionWithDetails(electionId: string) {
    const { supabase, user } = await getAuthUser();

    const { data: election } = await supabase
        .from("elections")
        .select("*, organizations(id, name)")
        .eq("id", electionId)
        .single();

    if (!election) return null;

    const { data: candidates } = await supabase
        .from("candidates")
        .select("*, profiles(full_name, avatar_url)")
        .eq("election_id", electionId);

    const { data: orgRoles } = await supabase
        .from("organization_roles")
        .select("id, title, hierarchy_level")
        .eq("organization_id", election.organization_id)
        .order("hierarchy_level");

    return {
        election,
        candidates: candidates || [],
        roles: orgRoles || [],
    };
}
