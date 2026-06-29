/**
 * Unit tests for Program-Restricted Organizations.
 *
 * These validate the two enforcement points as pure logic (no real database),
 * mirroring the project's existing test style:
 *   1. The join gate in joinOrganization() — server-side security.
 *   2. The get_orgs_for_program RPC filtering semantics — visual list filter.
 *
 * Model: an org with NO restriction rows is open to ALL programs. A missing
 * student row / program (e.g. faculty) is treated as NOT allowed for any
 * restricted org.
 */
import { describe, it, expect } from "vitest";

// ─── Join gate predicate ──────────────────────────────────────────────────────
// Mirrors the guard in src/lib/actions/organizations.ts → joinOrganization().
// Returns true when the user is allowed to join.
function canJoin(restrictions: string[], studentProgram: string | null | undefined): boolean {
    if (restrictions.length === 0) return true; // no rows = open to all
    if (!studentProgram) return false; // missing student row / program
    return restrictions.includes(studentProgram);
}

describe("Join gate — program restriction", () => {
    it("allows any program when the org has no restriction rows", () => {
        expect(canJoin([], "DIT")).toBe(true);
        expect(canJoin([], "DCET")).toBe(true);
        expect(canJoin([], null)).toBe(true);
    });

    it("allows a DIT student to join an org restricted to ['DIT']", () => {
        expect(canJoin(["DIT"], "DIT")).toBe(true);
    });

    it("blocks a DIT student from an org restricted to ['DCET']", () => {
        expect(canJoin(["DCET"], "DIT")).toBe(false);
    });

    it("allows a match within a multi-program restriction", () => {
        expect(canJoin(["DCET", "DIT", "DEET"], "DIT")).toBe(true);
    });

    it("blocks a faculty / no-program user from any restricted org", () => {
        expect(canJoin(["DIT"], null)).toBe(false);
        expect(canJoin(["DIT"], undefined)).toBe(false);
        expect(canJoin(["DIT"], "")).toBe(false);
    });
});

// ─── List filter semantics ────────────────────────────────────────────────────
// Mirrors public.get_orgs_for_program(p_program, p_category): an org is visible
// when it is public AND (unrestricted OR explicitly allows p_program), and when
// p_category is null or matches.
interface OrgFixture {
    id: string;
    visibility: "public" | "private";
    category_id: string | null;
    allowed_programs: string[]; // empty = unrestricted
}

function getOrgsForProgram(
    orgs: OrgFixture[],
    pProgram: string,
    pCategory: string | null = null,
): OrgFixture[] {
    return orgs.filter(
        (o) =>
            o.visibility === "public" &&
            (pCategory === null || o.category_id === pCategory) &&
            (o.allowed_programs.length === 0 || (pProgram !== "" && o.allowed_programs.includes(pProgram))),
    );
}

const ORGS: OrgFixture[] = [
    { id: "open", visibility: "public", category_id: "cat-1", allowed_programs: [] },
    { id: "dit-only", visibility: "public", category_id: "cat-1", allowed_programs: ["DIT"] },
    { id: "dcet-only", visibility: "public", category_id: "cat-2", allowed_programs: ["DCET"] },
    { id: "private-open", visibility: "private", category_id: "cat-1", allowed_programs: [] },
];

describe("get_orgs_for_program — visible set", () => {
    it("for DIT: includes unrestricted + DIT-allowed, excludes other-program", () => {
        const ids = getOrgsForProgram(ORGS, "DIT").map((o) => o.id);
        expect(ids).toContain("open");
        expect(ids).toContain("dit-only");
        expect(ids).not.toContain("dcet-only");
    });

    it("never returns private orgs to non-admins", () => {
        const ids = getOrgsForProgram(ORGS, "DIT").map((o) => o.id);
        expect(ids).not.toContain("private-open");
    });

    it("for an empty/no program, returns only unrestricted public orgs", () => {
        const ids = getOrgsForProgram(ORGS, "").map((o) => o.id);
        expect(ids).toEqual(["open"]);
    });

    it("applies the optional category filter alongside program rules", () => {
        const ids = getOrgsForProgram(ORGS, "DCET", "cat-2").map((o) => o.id);
        expect(ids).toEqual(["dcet-only"]);

        // DIT in cat-2 sees nothing (dcet-only is excluded by program).
        expect(getOrgsForProgram(ORGS, "DIT", "cat-2").map((o) => o.id)).toEqual([]);
    });
});
