export type RSVPResponse = 'going' | 'maybe' | 'not_going';

export interface CalendarEvent {
    id: string;
    organization_id: string;
    title: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string | null;
    location: string | null;
    max_participants: number | null;
    status: 'draft' | 'pending' | 'published' | 'cancelled' | 'completed';
    created_by: string;
    created_at: string;
    color: string;
    is_all_day: boolean;
    recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
    recurrence_end_date: string | null;
}

export interface EventRSVP {
    id: string;
    event_id: string;
    user_id: string;
    response: RSVPResponse;
    created_at: string;
}

export interface RSVPCounts {
    going: number;
    maybe: number;
    not_going: number;
}
