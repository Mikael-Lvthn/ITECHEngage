// TEMPORARY auto-approve feature — shared constants/types.
// Kept in a plain module (not a "use server" file) so non-async values can be
// exported. Remove alongside the app_settings table when no longer needed.

// The single account allowed to toggle the auto-approval settings.
export const OWNER_UID = "ef6786b4-75fe-4530-a5d8-3525fab9f867";

export type AppSettings = {
    auto_verify_students: boolean;
    auto_approve_memberships: boolean;
};
