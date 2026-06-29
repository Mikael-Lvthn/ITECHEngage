export type UserRole = "student" | "officer" | "admin";
export type MembershipRole = "member" | "officer";
export type MembershipStatus = "pending" | "approved";
export type OrgVisibility = "public" | "private";
export type AccreditationStatus = "pending" | "approved" | "rejected" | "expired";
export type EventStatus = "draft" | "pending" | "published" | "cancelled" | "completed";
export type ElectionStatus = "draft" | "published" | "voting" | "completed";
export type NotificationStatus = "unread" | "read" | "archived";
export type ParticipationStatus = "registered" | "attended" | "absent";
export type NewsStatus = "draft" | "pending" | "published" | "rejected";
export type AccountStatus = "pending_verification" | "verified" | "rejected";
export type BulletinPostType = "news" | "event" | "recruitment" | "system" | "special";

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    bio?: string | null;
    phone_number?: string | null;
    website_url?: string | null;
    social_links?: Record<string, string> | null;
    role: UserRole;
    account_status: AccountStatus;
    track_record?: string | null;
    created_at: string;
}

export interface Student {
    id: string;
    student_number: string;
    program: string;
    course?: string | null;
    section?: string | null;
    year_level: number;
    school_email?: string | null;
    personal_email?: string | null;
    contact_number?: string | null;
    cor_url?: string | null;
}

export interface Organization {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    cover_photo_url?: string | null;
    mission?: string | null;
    vision?: string | null;
    core_values?: string | null;
    visibility: OrgVisibility;
    accreditation_status: AccreditationStatus;
    created_at: string;
    allowed_programs?: string[] | null; // hydrated from junction; null/[] = open to all programs
}

export interface Membership {
    id: string;
    user_id: string;
    organization_id: string;
    role: MembershipRole;
    status: MembershipStatus;
    created_at: string;
    profiles?: Profile;
    organizations?: Organization;
}

export interface Event {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string | null;
    location: string;
    max_participants: number | null;
    status: EventStatus;
    created_by: string;
    created_at: string;
    organizations?: Organization;
}

export interface EventParticipation {
    id: string;
    event_id: string;
    user_id: string;
    status: ParticipationStatus;
    registered_at: string;
    profiles?: Profile;
    events?: Event;
}

export interface OrganizationRole {
    id: string;
    organization_id: string;
    title: string;
    hierarchy_level: number;
    can_manage_roles: boolean;
    assigned_user_id: string | null;
    created_at: string;
    profiles?: Profile;
    organizations?: Organization;
}

export interface Election {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    start_date: string;
    end_date: string;
    status: ElectionStatus;
    created_by: string | null;
    created_at: string;
    organizations?: Organization;
}

export interface Candidate {
    id: string;
    election_id: string;
    user_id: string;
    position: string;
    organization_role_id: string | null;
    platform: string | null;
    created_at: string;
    profiles?: Profile;
    organization_roles?: OrganizationRole;
}

export interface Vote {
    id: string;
    election_id: string;
    membership_id: string;
    candidate_id: string;
    organization_role_id: string | null;
    created_at: string;
}

export interface Accreditation {
    id: string;
    organization_id: string;
    academic_year: string;
    status: AccreditationStatus;
    documents_url: string | null;
    uploaded_files: AccreditationFile[];
    notes: string | null;
    submitted_at: string;
    submitted_by: string | null;
    reviewed_at: string | null;
    reviewed_by: string | null;
    organizations?: Organization;
    submitter?: Profile;
    reviewer?: Profile;
}

export interface News {
    id: string;
    organization_id: string;
    title: string;
    content: string;
    image_url: string | null;
    status: NewsStatus;
    created_by: string;
    created_at: string;
    published_at: string | null;
    organizations?: Organization;
    creator?: Profile;
}

export interface Notification {
    id: string;
    user_id: string;
    type: string;
    title: string;
    message: string | null;
    link: string | null;
    status: NotificationStatus;
    created_at: string;
}

export type AttendanceSessionStatus = "active" | "expired" | "closed";

export interface AttendanceSession {
    id: string;
    event_id: string;
    created_by: string;
    token: string;
    expires_at: string;
    is_active: boolean;
    created_at: string;
}

export type EngagementRecordType = "membership" | "officer_role" | "event_attended" | "election_winner" | "accreditation";

export interface EngagementRecord {
    id: string;
    user_id: string;
    organization_id: string | null;
    event_id: string | null;
    record_type: EngagementRecordType;
    title: string;
    description: string | null;
    organization_name: string | null;
    role_title: string | null;
    hours_credit: number;
    date_earned: string;
    academic_year: string | null;
    semester: string | null;
    verified: boolean;
    verified_by: string | null;
    verified_at: string | null;
    is_public: boolean;
    created_at: string;
}

export interface CertificateTemplate {
    organization_id: string;
    template_path: string;
    name_x: number;
    name_y: number;
    font_size: number;
    color: string;
    align: string;
    updated_at: string | null;
}

export interface Certificate {
    id: string;
    membership_id: string | null;
    user_id: string;
    organization_id: string;
    cert_path: string;
    verification_code: string;
    issued_at: string;
    organizations?: Organization;
}

export interface AccreditationFile {
    name: string;
    path: string;
    size: number;
    type: string;
    uploadedAt: string;
}

export type AnnouncementVisibility = "members" | "members_and_followers";

export interface OrgAnnouncement {
    id: string;
    organization_id: string;
    created_by: string;
    title: string;
    body: string;
    pinned: boolean;
    visibility: AnnouncementVisibility;
    created_at: string;
    profiles?: Profile;
}

export interface NotificationPreferences {
    user_id: string;
    election_started: boolean;
    membership_updates: boolean;
    event_reminders: boolean;
    org_announcements: boolean;
    admin_announcements: boolean;
    updated_at: string | null;
}

export interface BulletinBoardPost {
    id: string;
    type: BulletinPostType;
    title: string;
    body: string | null;
    link: string | null;
    reference_id: string | null;
    pinned: boolean;
    created_by: string | null;
    organization_id: string | null;
    expires_at: string | null;
    created_at: string;
}

