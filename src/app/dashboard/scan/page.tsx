"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { scanAttendanceQR } from "@/lib/actions/attendance";

export default function ScanPage() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [isPending, startTransition] = useTransition();
    const [result, setResult] = useState<{ success: boolean; message: string; eventTitle?: string } | null>(null);
    const hasScannedRef = useRef(false);

    useEffect(() => {
        if (!token || hasScannedRef.current) return;
        hasScannedRef.current = true;

        startTransition(async () => {
            try {
                const res = await scanAttendanceQR(token);
                setResult(res);
            } catch (error) {
                setResult({
                    success: false,
                    message: error instanceof Error ? error.message : "Failed to record attendance"
                });
            }
        });
    }, [token]);

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

    if (isPending || !result) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-muted-foreground font-medium">Recording your attendance, please wait...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full animate-scale-in">
                {result.success ? (
                    <div className="rounded-2xl overflow-hidden shadow-lg border">
                        <div className="h-3 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                        <div className="p-8 text-center space-y-4 bg-card">
                            <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                                <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-foreground">Attendance Recorded!</h1>
                            {result.eventTitle && (
                                <p className="text-muted-foreground text-sm font-semibold">{result.eventTitle}</p>
                            )}
                            <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 border border-green-200/30 rounded-lg px-4 py-2">
                                {result.message}
                            </p>
                            <Link href="/dashboard" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden shadow-lg border">
                        <div className="h-3 bg-gradient-to-r from-red-500 to-red-700" />
                        <div className="p-8 text-center space-y-4 bg-card">
                            <div className="w-20 h-20 mx-auto rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center">
                                <span className="text-4xl">⚠️</span>
                            </div>
                            <h1 className="text-xl font-bold text-foreground">Attendance Failed</h1>
                            <p className="text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 rounded-lg px-4 py-2">
                                {result.message}
                            </p>
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
