/**
 * Canonical list of PUP-ITECH diploma programs.
 *
 * Single source of truth for program codes used across signup, the admin
 * org-restriction UI, and the program-restriction join gate. Previously these
 * were duplicated as <option>s in the signup form.
 */
export const PUP_PROGRAMS = [
    { code: "DCvET", label: "Diploma in Civil Engineering Technology (DCvET)" },
    { code: "DCET", label: "Diploma in Computer Engineering Technology (DCET)" },
    { code: "DEET", label: "Diploma in Electrical Engineering Technology (DEET)" },
    { code: "DECET", label: "Diploma in Electronics Engineering Technology (DECET)" },
    { code: "DIT", label: "Diploma in Information Technology (DIT)" },
    { code: "DMET", label: "Diploma in Mechanical Engineering Technology (DMET)" },
    { code: "DOMT", label: "Diploma in Office Management Technology (DOMT)" },
    { code: "DRET", label: "Diploma in Railway Engineering Technology (DRET)" },
] as const;

export type ProgramCode = (typeof PUP_PROGRAMS)[number]["code"];
export const PROGRAM_CODES = PUP_PROGRAMS.map((p) => p.code) as ProgramCode[];
