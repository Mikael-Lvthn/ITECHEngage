export type UserRole = "student" | "officer" | "admin";
export type MembershipRole = "member" | "officer";
export type MembershipStatus = "pending" | "approved";
export type OrgVisibility = "public" | "private";
export type AccreditationStatus = "pending" | "approved" | "rejected" | "expired";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type ElectionStatus = "draft" | "active" | "closed";
export type ParticipationStatus = "registered" | "attended" | "absent";
export type NewsStatus = "draft" | "pending" | "published" | "rejected";

export interface Profile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string | null;
    bio?: string | null;
    phone_number?: string | null;
    website_url?: string | null;
    social_links?: any;
    role: UserRole;
    created_at: string;
}

export interface Student {
    id: string;
    student_number: string;
    program: string;
    year_level: number;
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

export interface Election {
    id: string;
    organization_id: string;
    title: string;
    start_date: string;
    end_date: string;
    status: ElectionStatus;
    created_at: string;
    organizations?: Organization;
}

export interface Candidate {
    id: string;
    election_id: string;
    user_id: string;
    position: string;
    created_at: string;
    profiles?: Profile;
}

export interface Vote {
    id: string;
    election_id: string;
    membership_id: string;
    candidate_id: string;
    created_at: string;
}

export interface Accreditation {
    id: string;
    organization_id: string;
    academic_year: string;
    status: AccreditationStatus;
    documents_url: string | null;
    notes: string | null;
    submitted_at: string;
    reviewed_at: string | null;
    reviewed_by: string | null;
    organizations?: Organization;
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
