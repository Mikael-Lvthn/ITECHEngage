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

export async function createElection(formData: FormData) {
    const { supabase, user } = await getAuthUser();

    const organizationId = formData.get("organization_id") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const startDate = formData.get("start_date") as string;
    const endDate = formData.get("end_date") as string;

    if (!organizationId || !title || !startDate || !endDate) {
        throw new Error("All fields are required.");
    }

    if (new Date(endDate) <= new Date(startDate)) {
        throw new Error("End date must be after start date.");
    }

    const { data: role } = await supabase.rpc("get_my_role");
    const isAdmin = role === "admin";

    let canManage = isAdmin;
    if (!isAdmin) {
        const { data: managerRole } = await supabase
            .from("organization_roles")
            .select("id")
            .eq("organization_id", organizationId)
            .eq("assigned_user_id", user.id)
            .eq("can_manage_roles", true)
            .limit(1);

        canManage = !!(managerRole && managerRole.length > 0);
    }

    if (!canManage) {
        throw new Error("You are not authorized to create elections for this organization.");
    }

    const { error } = await supabase.from("elections").insert({
        organization_id: organizationId,
        title: title.trim(),
        description: description?.trim() || null,
        start_date: startDate,
        end_date: endDate,
        status: "active",
        created_by: user.id,
    });

    if (error) throw new Error(error.message);

    revalidatePath("/dashboard/elections");
    revalidatePath(`/dashboard/organizations/${organizationId}`);
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

    if (!election || election.status !== "active") {
        throw new Error("Election is not currently active.");
    }

    const { data: membership } = await supabase
        .from("memberships")
        .select("id")
        .eq("user_id", user.id)
        .eq("organization_id", election.organization_id)
        .eq("status", "approved")
        .maybeSingle();

    if (!membership) {
        throw new Error("You must be an approved member of this organization to nominate yourself.");
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
    const { supabase } = await getAuthUser();

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

export async function publishElectionResults(electionId: string) {
    const { supabase } = await getAuthUser();

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
