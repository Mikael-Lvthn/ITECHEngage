import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { scanAttendanceQR } from "@/lib/actions/attendance";

interface Props {
    searchParams: Promise<{ token?: string }>;
}

export default async function ScanPage({ searchParams }: Props) {
    const { token } = await searchParams;

    if (!token) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
                        <span className="text-3xl">❌</span>
                    </div>
                    <h1 className="text-xl font-bold">Invalid QR Code</h1>
                    <p className="text-muted-foreground text-sm">No attendance token was provided.</p>
                    <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                        Go to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        const redirectTo = encodeURIComponent(`/dashboard/scan?token=${token}`);
        redirect(`/login?redirectTo=${redirectTo}`);
    }

    let result: { success: boolean; message: string; eventTitle?: string };
    try {
        result = await scanAttendanceQR(token);
    } catch (error) {
        result = { success: false, message: error instanceof Error ? error.message : "Failed to record attendance" };
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                {result.success ? (
                    <div className="rounded-2xl overflow-hidden shadow-lg border animate-scale-in">
                        <div className="h-3 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                        <div className="p-8 text-center space-y-4 bg-card">
                            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold">Attendance Recorded!</h1>
                            {result.eventTitle && (
                                <p className="text-muted-foreground text-sm">{result.eventTitle}</p>
                            )}
                            <p className="text-sm text-green-700 bg-green-50 rounded-lg px-4 py-2">{result.message}</p>
                            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden shadow-lg border animate-scale-in">
                        <div className="h-3 bg-gradient-to-r from-red-500 to-red-700" />
                        <div className="p-8 text-center space-y-4 bg-card">
                            <div className="w-20 h-20 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                                <span className="text-4xl">⚠️</span>
                            </div>
                            <h1 className="text-xl font-bold">Attendance Failed</h1>
                            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2">{result.message}</p>
                            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
