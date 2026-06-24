import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSiteContent } from "@/lib/actions/legal";
import LegalEditor from "./LegalEditor";

export const dynamic = "force-dynamic";

export default async function AdminLegalPage() {
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

    const [terms, privacy] = await Promise.all([
        getSiteContent("terms"),
        getSiteContent("privacy"),
    ]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <Link
                    href="/dashboard/admin"
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
                >
                    <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Admin Panel
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Legal Pages</h1>
                <p className="text-muted-foreground mt-1">
                    Edit the Terms &amp; Agreement and Privacy Policy shown to all users.
                </p>
            </div>

            <LegalEditor
                terms={{ title: terms?.title || "Terms & Agreement", content: terms?.content || "" }}
                privacy={{ title: privacy?.title || "Privacy Policy", content: privacy?.content || "" }}
            />
        </div>
    );
}
