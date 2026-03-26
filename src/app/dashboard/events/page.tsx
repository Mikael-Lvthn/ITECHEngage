import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";
import CreateEventDialog from "./CreateEventDialog";
import { ApproveEventButton, RejectEventButton } from "./EventActions";

export default async function EventsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    let userRole: UserRole = (profile?.role as UserRole) || "student";
    if (!profile) {
        const { data: rpcRole } = await supabase.rpc("get_my_role");
        if (rpcRole) userRole = rpcRole as UserRole;
    }

    const isAdmin = userRole === "admin";
    const isOfficer = userRole === "officer";

    let userOrgs: { id: string; name: string }[] = [];
    if (isOfficer) {
        const { data: memberships } = await supabase
            .from("memberships")
            .select("organizations(id, name)")
            .eq("user_id", user.id)
            .eq("status", "approved");

        userOrgs = (memberships || [])
            .map((m) => m.organizations as unknown as { id: string; name: string })
            .filter(Boolean);
    } else if (isAdmin) {
        const { data: orgs } = await supabase
            .from("organizations")
            .select("id, name")
            .order("name");
        userOrgs = orgs || [];
    }

    const { data: publishedEvents } = await supabase
        .from("events")
        .select("id, title, description, start_datetime, end_datetime, location, status, created_at, organizations(id, name), profiles:created_by(full_name)")
        .eq("status", "published")
        .order("start_datetime", { ascending: true });

    let pendingEvents: typeof publishedEvents = [];
    if (isAdmin) {
        const { data } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, organizations(id, name), profiles:created_by(full_name)")
            .eq("status", "draft")
            .order("created_at", { ascending: false });
        pendingEvents = data;
    }

    let myDraftEvents: typeof publishedEvents = [];
    if (isOfficer) {
        const { data } = await supabase
            .from("events")
            .select("id, title, description, start_datetime, end_datetime, location, status, created_at, organizations(id, name), profiles:created_by(full_name)")
            .eq("created_by", user.id)
            .eq("status", "draft")
            .order("created_at", { ascending: false });
        myDraftEvents = data;
    }

    const published = publishedEvents || [];
    const pending = pendingEvents || [];
    const myDrafts = myDraftEvents || [];

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Events</h1>
                    <p className="text-muted-foreground mt-1">
                        {isAdmin
                            ? "Manage and approve campus events."
                            : isOfficer
                                ? "Create and manage events for your organization."
                                : "Browse upcoming campus events."}
                    </p>
                </div>
                {(isOfficer || isAdmin) && userOrgs.length > 0 && (
                    <CreateEventDialog organizations={userOrgs} />
                )}
            </div>

            {isAdmin && pending.length > 0 && (
                <div className="animate-slide-up">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        Pending Approval ({pending.length})
                    </h2>
                    <div className="space-y-3">
                        {pending.map((ev, i) => {
                            const org = ev.organizations as unknown as { id: string; name: string } | null;
                            const creator = ev.profiles as unknown as { full_name: string } | null;
                            return (
                                <div
                                    key={ev.id}
                                    className="rounded-xl border bg-card overflow-hidden card-hover"
                                    style={{ animationDelay: `${i * 60}ms` }}
                                >
                                    <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                                    <div className="p-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold text-sm">{ev.title}</h3>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                                                    Draft
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {org?.name} • by {creator?.full_name || "Unknown"}
                                            </p>
                                            {ev.description && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                                            )}
                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                <span>📅 {formatDate(ev.start_datetime)}</span>
                                                <span>📍 {ev.location}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <ApproveEventButton eventId={ev.id} />
                                            <RejectEventButton eventId={ev.id} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {isOfficer && myDrafts.length > 0 && (
                <div className="animate-slide-up">
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        My Pending Events ({myDrafts.length})
                    </h2>
                    <div className="space-y-3">
                        {myDrafts.map((ev) => {
                            const org = ev.organizations as unknown as { id: string; name: string } | null;
                            return (
                                <div key={ev.id} className="rounded-xl border bg-card overflow-hidden opacity-80">
                                    <div className="h-1 bg-gradient-to-r from-yellow-400 to-yellow-500" />
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-semibold text-sm">{ev.title}</h3>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                                                ⏳ Awaiting Approval
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">{org?.name}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                            <span>📅 {formatDate(ev.start_datetime)}</span>
                                            <span>📍 {ev.location}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="animate-slide-up delay-2">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Upcoming Events ({published.length})
                </h2>
                {published.length === 0 ? (
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-[#2B6CB0] to-[#4299E1]" />
                        <div className="text-center py-16 px-6">
                            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2B6CB0]/10 flex items-center justify-center mb-4">
                                <span className="text-3xl animate-float">📅</span>
                            </div>
                            <p className="font-semibold">No upcoming events</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {isOfficer
                                    ? "Create an event for your organization to get started."
                                    : "Check back later for upcoming campus events."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {published.map((ev, i) => {
                            const org = ev.organizations as unknown as { id: string; name: string } | null;
                            return (
                                <div
                                    key={ev.id}
                                    className="rounded-xl border bg-card overflow-hidden card-hover"
                                    style={{ animationDelay: `${i * 80}ms` }}
                                >
                                    <div className="h-1.5 bg-gradient-to-r from-[#2B6CB0] to-[#4299E1]" />
                                    <div className="p-5">
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-lg bg-[#2B6CB0]/10 flex flex-col items-center justify-center shrink-0">
                                                <span className="text-xs font-bold text-[#2B6CB0] uppercase">
                                                    {new Date(ev.start_datetime).toLocaleDateString("en-US", { month: "short" })}
                                                </span>
                                                <span className="text-lg font-bold text-[#2B6CB0] leading-none">
                                                    {new Date(ev.start_datetime).getDate()}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-semibold">{ev.title}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">{org?.name}</p>
                                                {ev.description && (
                                                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{ev.description}</p>
                                                )}
                                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span>🕐 {formatDate(ev.start_datetime)}</span>
                                                    <span>📍 {ev.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
