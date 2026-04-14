import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationItem from "./NotificationItem";
import NotificationFilters from "./NotificationFilters";

export const dynamic = "force-dynamic";

interface Props {
    searchParams: Promise<{ filter?: string }>;
}

export default async function NotificationsPage({ searchParams }: Props) {
    const params = await searchParams;
    const filter = params.filter || "all";
    
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    if (filter === "unread") {
        query = query.eq("status", "unread");
    } else if (filter === "read") {
        query = query.eq("status", "read");
    } else if (filter === "archived") {
        query = query.eq("status", "archived");
    }
    // "all" shows everything except archived by default
    if (filter === "all") {
        query = query.neq("status", "archived");
    }

    const { data: notifications } = await query;

    const { count: unreadCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "unread");

    const { count: readCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "read");

    const { count: archivedCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "archived");

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        You have {unreadCount || 0} unread notification{unreadCount !== 1 ? "s" : ""}
                    </p>
                </div>
            </div>

            <NotificationFilters
                currentFilter={filter}
                counts={{
                    all: (unreadCount || 0) + (readCount || 0),
                    unread: unreadCount || 0,
                    read: readCount || 0,
                    archived: archivedCount || 0,
                }}
            />

            <div className="space-y-4">
                {!notifications || notifications.length === 0 ? (
                    <div className="rounded-xl border bg-card p-12 text-center shadow-sm">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center text-3xl mb-4 border border-border">
                            {filter === "archived" ? "📦" : "📭"}
                        </div>
                        <h2 className="text-lg font-bold text-foreground">
                            {filter === "archived" ? "No archived notifications" : "No notifications"}
                        </h2>
                        <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">
                            {filter === "archived"
                                ? "Notifications you archive will appear here."
                                : filter === "unread"
                                    ? "You're all caught up! No unread notifications."
                                    : "You don't have any notifications right now. When you follow organizations or when an election starts, you'll see them here."}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <NotificationItem key={notification.id} notification={notification} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
