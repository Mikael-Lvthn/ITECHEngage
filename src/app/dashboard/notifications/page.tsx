import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationItem from "./NotificationItem";
import { markAllAsRead } from "@/lib/actions/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

    const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-500 text-sm mt-1">
                        You have {unreadCount} unread message{unreadCount !== 1 ? "s" : ""}
                    </p>
                </div>

                {unreadCount > 0 && (
                    <form action={markAllAsRead}>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm font-semibold text-[#800000] bg-[#800000]/10 hover:bg-[#800000]/20 rounded-lg transition-colors border border-[#800000]/20"
                        >
                            Mark all as read
                        </button>
                    </form>
                )}
            </div>

            <div className="space-y-4">
                {!notifications || notifications.length === 0 ? (
                    <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
                        <div className="w-16 h-16 mx-auto bg-gray-50 rounded-full flex items-center justify-center text-3xl mb-4 border border-gray-100">
                            📭
                        </div>
                        <h2 className="text-lg font-bold text-gray-900">No notifications</h2>
                        <p className="text-gray-500 mt-2 text-sm max-w-sm mx-auto">
                            You don't have any notifications right now. When you follow organizations or when an election starts, you'll see them here.
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
