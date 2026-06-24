import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getFeedback } from "@/lib/actions/feedback";
import FeedbackAdminClient from "./FeedbackAdminClient";

export const dynamic = "force-dynamic";

export default async function AdminFeedbackPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
    if (!profile || profile.role !== "admin") redirect("/dashboard");

    const feedback = await getFeedback();

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div>
                <Link
                    href="/dashboard/admin"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Admin Panel
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Feedback &amp; Suggestions</h1>
                <p className="text-muted-foreground mt-1">
                    Submissions from students, officers, and visitors.
                </p>
            </div>

            <FeedbackAdminClient items={feedback} />
        </div>
    );
}
