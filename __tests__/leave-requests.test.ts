/**
 * Unit tests for leave request business logic.
 *
 * Tests validate hierarchy lookup, self-skip for President, admin escalation,
 * and profile role revert rules.
 */
import { describe, it, expect } from "vitest";

// ─── Hierarchy Approval Lookup ──────────────────────────────────────────────
describe("Hierarchy Approval Lookup", () => {
    it("should select the highest-ranked officer (lowest hierarchy_level) as approver", () => {
        const roles = [
            { assigned_user_id: "user-pres", hierarchy_level: 1, title: "President" },
            { assigned_user_id: "user-vp", hierarchy_level: 2, title: "Vice President" },
            { assigned_user_id: "user-sec", hierarchy_level: 3, title: "Secretary" },
        ];

        const requestingUserId = "user-sec"; // Secretary wants to leave
        const sorted = roles
            .filter(r => r.assigned_user_id && r.assigned_user_id !== requestingUserId)
            .sort((a, b) => a.hierarchy_level - b.hierarchy_level);

        expect(sorted[0].assigned_user_id).toBe("user-pres");
    });

    it("should self-skip when the President requests to leave", () => {
        const roles = [
            { assigned_user_id: "user-pres", hierarchy_level: 1, title: "President" },
            { assigned_user_id: "user-vp", hierarchy_level: 2, title: "Vice President" },
            { assigned_user_id: "user-sec", hierarchy_level: 3, title: "Secretary" },
        ];

        const requestingUserId = "user-pres"; // President wants to leave
        const candidates = roles
            .filter(r => r.assigned_user_id && r.assigned_user_id !== requestingUserId)
            .sort((a, b) => a.hierarchy_level - b.hierarchy_level);

        // Should skip to rank 2 (VP)
        expect(candidates[0].assigned_user_id).toBe("user-vp");
        expect(candidates[0].title).toBe("Vice President");
    });

    it("should escalate to admin when no other officer exists", () => {
        const roles = [
            { assigned_user_id: "user-pres", hierarchy_level: 1, title: "President" },
            { assigned_user_id: null, hierarchy_level: 2, title: "Vice President" },
            { assigned_user_id: null, hierarchy_level: 3, title: "Secretary" },
        ];

        const requestingUserId = "user-pres";
        const candidates = roles
            .filter(r => r.assigned_user_id && r.assigned_user_id !== requestingUserId)
            .sort((a, b) => a.hierarchy_level - b.hierarchy_level);

        // No candidates → escalate to admin
        expect(candidates).toHaveLength(0);

        // Simulate admin fallback
        const adminUsers = [{ id: "admin-1" }, { id: "admin-2" }];
        const approver = candidates.length > 0 ? candidates[0].assigned_user_id : adminUsers[0].id;
        expect(approver).toBe("admin-1");
    });

    it("should handle orgs with only unassigned roles by escalating", () => {
        const roles = [
            { assigned_user_id: null, hierarchy_level: 1, title: "President" },
            { assigned_user_id: null, hierarchy_level: 2, title: "VP" },
        ];

        const requestingUserId = "user-member";
        const candidates = roles
            .filter(r => r.assigned_user_id && r.assigned_user_id !== requestingUserId)
            .sort((a, b) => a.hierarchy_level - b.hierarchy_level);

        expect(candidates).toHaveLength(0);
    });
});

// ─── Profile Role Revert ────────────────────────────────────────────────────
describe("Profile Role Revert on Leave", () => {
    it("should revert to student when no structural roles remain", () => {
        const remainingStructuralRoles = 0;
        const currentProfileRole = "officer";

        const shouldRevert = remainingStructuralRoles === 0 && currentProfileRole === "officer";
        const newRole = shouldRevert ? "student" : currentProfileRole;

        expect(newRole).toBe("student");
    });

    it("should NOT revert when the user holds structural roles in other orgs", () => {
        // User leaves Org A but still has a role in Org B
        const remainingStructuralRoles = 1;
        const currentProfileRole = "officer";

        const shouldRevert = remainingStructuralRoles === 0 && currentProfileRole === "officer";
        const newRole = shouldRevert ? "student" : currentProfileRole;

        expect(newRole).toBe("officer");
    });

    it("should not touch admin role during revert", () => {
        const remainingStructuralRoles = 0;
        const currentProfileRole = "admin";

        // Trigger only checks role === "officer"
        const shouldRevert = remainingStructuralRoles === 0 && currentProfileRole === "officer";
        const newRole = shouldRevert ? "student" : currentProfileRole;

        expect(newRole).toBe("admin");
    });
});

// ─── Leave Request Deduplication ────────────────────────────────────────────
describe("Leave Request Deduplication", () => {
    it("should prevent duplicate pending requests for same user+org", () => {
        const existingRequests = [
            { user_id: "user-1", organization_id: "org-1", status: "pending" },
        ];

        const newRequest = { user_id: "user-1", organization_id: "org-1" };
        const hasPending = existingRequests.some(
            r => r.user_id === newRequest.user_id
                && r.organization_id === newRequest.organization_id
                && r.status === "pending"
        );

        expect(hasPending).toBe(true);
    });

    it("should allow a new request if the previous was resolved", () => {
        const existingRequests = [
            { user_id: "user-1", organization_id: "org-1", status: "rejected" },
        ];

        const newRequest = { user_id: "user-1", organization_id: "org-1" };
        const hasPending = existingRequests.some(
            r => r.user_id === newRequest.user_id
                && r.organization_id === newRequest.organization_id
                && r.status === "pending"
        );

        expect(hasPending).toBe(false);
    });
});

// ─── Membership Cleanup on Approval ─────────────────────────────────────────
describe("Membership Cleanup on Leave Approval", () => {
    it("should unassign all roles for the departing user in that org", () => {
        const orgRoles = [
            { id: "r1", assigned_user_id: "user-1", organization_id: "org-1" },
            { id: "r2", assigned_user_id: "user-1", organization_id: "org-1" },
            { id: "r3", assigned_user_id: "user-2", organization_id: "org-1" },
        ];

        const userId = "user-1";
        const orgId = "org-1";
        const rolesToUnassign = orgRoles.filter(
            r => r.assigned_user_id === userId && r.organization_id === orgId
        );

        expect(rolesToUnassign).toHaveLength(2);
        expect(rolesToUnassign.map(r => r.id)).toEqual(["r1", "r2"]);
    });

    it("should remove nominations in active elections for the departing user", () => {
        const candidates = [
            { user_id: "user-1", election_id: "e1" },
            { user_id: "user-1", election_id: "e2" },
            { user_id: "user-2", election_id: "e1" },
        ];
        const activeElectionIds = ["e1", "e2"]; // draft/published elections in this org

        const toRemove = candidates.filter(
            c => c.user_id === "user-1" && activeElectionIds.includes(c.election_id)
        );

        expect(toRemove).toHaveLength(2);
    });
});
