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

    // Allow nominations in draft, published, and voting phases
    if (!election || !["draft", "published", "voting"].includes(election.status)) {
        throw new Error("Nominations are not open for this election.");
    }

    // Must be an approved officer member (not admin)
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

    if (membership.role !== "officer") {
        throw new Error("Only student officers can nominate themselves.");
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
        .select("title")
        .eq("id", organizationRoleId)
        .single();

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

export async function castVote(electionId: string, candidateId: string, organizationRoleId: string) {
    const { supabase, user } = await getAuthUser();

    // Verify the user is an officer, not an admin
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

    // Verify user is an approved officer member
    const { data: membership } = await supabase
        .from("memberships")
        .select("id, role")
        .eq("user_id", user.id)
        .eq("organization_id", election.organization_id)
        .eq("status", "approved")
        .maybeSingle();

    if (!membership || membership.role !== "officer") {
        throw new Error("Only officers can vote in elections.");
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

    revalidatePath(`/dashboard/elections/${electionId}`);
    revalidatePath("/dashboard/elections");
}

export async function closeElection(electionId: string) {
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
        throw new Error("Only elections in voting phase can be closed.");
    }

    // Transition from voting to closed - triggers notification to members
    const { error } = await supabase
        .from("elections")
        .update({
            status: "closed",
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
    if (election.status !== "closed") {
        throw new Error("Only closed elections can be deleted.");
    }

    // Delete candidates first (foreign key constraint)
    await supabase
        .from("candidates")
        .delete()
        .eq("election_id", electionId);

    // Delete votes via the election's candidates (already deleted above, but clean up)
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
