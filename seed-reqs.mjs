import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
    // 1. Delete all existing requirements to avoid duplicates
    await supabase.from("accreditation_requirements").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const reqs = [
        { name: 'Constitution and By-Laws (CBL)', description: 'Latest version of the org constitution', order_index: 1 },
        { name: 'General Plan of Activities (GPOA)', description: 'Activities for the academic year', order_index: 2 },
        { name: 'Advocacy Plan', description: 'Organization advocacy plan', order_index: 3 },
        { name: 'Tracker Form', description: 'Completed tracker form', order_index: 4 },
        { name: 'Waiver of Responsibility', description: 'Signed waiver of responsibility', order_index: 5 },
        { name: 'Officer\'s Profile', description: 'Profiles of the officers', order_index: 6 },
        { name: 'Official List of Officers', description: 'Current academic year officers', order_index: 7 },
        { name: 'Resolutions', description: 'Adopted resolutions', order_index: 8 },
        { name: 'Memorandum Order', description: 'Relevant memorandum orders', order_index: 9 },
        { name: 'List of Officers/ Organizational Chart', description: 'Organizational chart or list of officers', order_index: 10 },
        { name: 'Minutes of the Meetings', description: 'Minutes of meetings held', order_index: 11 },
        { name: 'Narrative Reports', description: 'Narrative reports of activities', order_index: 12 },
        { name: 'Financial Report', description: 'Financial report for the year', order_index: 13 },
        { name: 'Turnover Documents', description: 'Documents turned over to the new officers', order_index: 14 },
    ];

    const { error } = await supabase.from("accreditation_requirements").insert(reqs);
    if (error) {
        console.error("Error inserting requirements:", error);
    } else {
        console.log("Requirements seeded successfully!");
    }
}

run();
