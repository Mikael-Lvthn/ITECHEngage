import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import LikeShareButtons from "@/components/LikeShareButtons";
import AttendanceQRPanel from "@/components/events/AttendanceQRPanel";
import AttendanceScanPanel from "@/components/events/AttendanceScanPanel";

interface EventWithDetails {
    id: string;
    title: string;
    description: string | null;
    start_datetime: string;
    end_datetime: string | null;
    location: string;
    status: string;
    created_by: string;
    created_at: string;
    organizations: {
        name: string;
        logo_url: string | null;
    } | null;
    profiles: {
        full_name: string;
    } | null;
}

interface Props {
    params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const { data: rawEvent } = await supabase
        .from("events")
        .select("*, organizations(name, logo_url), profiles:created_by(full_name)")
        .eq("id", id)
        .single();

    if (!rawEvent) notFound();

    const event = rawEvent as unknown as EventWithDetails;

    const startDate = new Date(event.start_datetime);
    const endDate = event.end_datetime ? new Date(event.end_datetime) : null;

    let likeCount = 0;
    let userLiked = false;

    const { count } = await supabase
        .from("event_likes")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id);

    likeCount = count || 0;

    if (user) {
        const { data: likeRow } = await supabase
            .from("event_likes")
            .select("id")
            .eq("event_id", id)
            .eq("user_id", user.id)
            .maybeSingle();

        userLiked = !!likeRow;
    }

    let canManageAttendance = false;
    let hasActiveSession = false;
    if (user) {
        const { data: userProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();
        canManageAttendance = (rawEvent as unknown as { created_by: string }).created_by === user.id || userProfile?.role === "admin";

        const { data: activeSession } = await supabase
            .from("event_attendance_sessions")
            .select("id")
            .eq("event_id", id)
            .eq("is_active", true)
            .limit(1)
            .maybeSingle();
        hasActiveSession = !!activeSession;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <Link
                href="/dashboard/news-and-events"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
                ← Back to News & Events
            </Link>

            <article className="rounded-xl border bg-card shadow-sm overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-[#800000] to-[#600000] flex items-center justify-center relative">
                    <div className="text-center text-white">
                        <p className="text-sm font-bold uppercase tracking-wider opacity-80">
                            {startDate.toLocaleString("default", { month: "long" })}
                        </p>
                        <p className="text-5xl font-black">{startDate.getDate()}</p>
                        <p className="text-sm opacity-80">{startDate.getFullYear()}</p>
                    </div>
                </div>

                <div className="p-6 sm:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        {event.organizations?.logo_url ? (
                            <div className="relative w-10 h-10 rounded-lg overflow-hidden border">
                                <Image
                                    src={event.organizations.logo_url}
                                    alt=""
                                    fill
                                    className="object-cover"
                                />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <span className="text-lg">🏢</span>
                            </div>
                        )}
                        <div>
                            <p className="text-sm font-semibold text-foreground">
                                {event.organizations?.name || "Unknown Organization"}
                            </p>
                            <p className="text-xs text-muted-foreground">Event Organizer</p>
                        </div>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                        {event.title}
                    </h1>

                    <div className="flex items-center gap-3 mb-6">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${event.status === "published"
                                ? "bg-green-100 text-green-800 border border-green-200"
                                : event.status === "draft"
                                    ? "bg-muted text-muted-foreground border border-border"
                                    : event.status === "cancelled"
                                        ? "bg-red-100 text-red-700 border border-red-200"
                                        : "bg-yellow-100 text-yellow-800 border border-yellow-200"
                            }`}>
                            {event.status}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 rounded-lg bg-muted border">
                        <div className="flex items-start gap-3">
                            <span className="text-lg">🕐</span>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start</p>
                                <p className="text-sm font-medium text-foreground">
                                    {startDate.toLocaleDateString("en-US", {
                                        weekday: "long",
                                        month: "long",
                                        day: "numeric",
                                        year: "numeric",
                                    })}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </p>
                            </div>
                        </div>
                        {endDate && (
                            <div className="flex items-start gap-3">
                                <span className="text-lg">🏁</span>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">End</p>
                                    <p className="text-sm font-medium text-foreground">
                                        {endDate.toLocaleDateString("en-US", {
                                            weekday: "long",
                                            month: "long",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                            </div>
                        )}
                        <div className="flex items-start gap-3">
                            <span className="text-lg">📍</span>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Location</p>
                                <p className="text-sm font-medium text-foreground">{event.location}</p>
                            </div>
                        </div>
                        {event.profiles?.full_name && (
                            <div className="flex items-start gap-3">
                                <span className="text-lg">👤</span>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Created by</p>
                                    <p className="text-sm font-medium text-foreground">
                                        {event.profiles.full_name}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {event.description && (
                        <div className="mb-6">
                            <h2 className="text-lg font-bold text-foreground mb-3">About This Event</h2>
                            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                {event.description}
                            </div>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t">
                        <LikeShareButtons
                            itemId={id}
                            itemType="event"
                            initialLikeCount={likeCount}
                            initialLiked={userLiked}
                            title={event.title}
                        />
                    </div>
                </div>
            </article>

            {canManageAttendance && event.status === "published" && (
                <AttendanceQRPanel eventId={id} eventTitle={event.title} />
            )}

            {!canManageAttendance && hasActiveSession && event.status === "published" && (
                <AttendanceScanPanel eventId={id} eventTitle={event.title} />
            )}
        </div>
    );
}
