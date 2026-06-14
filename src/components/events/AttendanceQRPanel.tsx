"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { generateAttendanceQR, closeAttendanceSession, markAbsentees, getActiveAttendanceSession } from "@/lib/actions/attendance";
import { useToast } from "@/components/Toast";

interface AttendanceQRPanelProps {
    eventId: string;
    eventTitle: string;
}

export default function AttendanceQRPanel({ eventId, eventTitle }: AttendanceQRPanelProps) {
    const [token, setToken] = useState<string | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [scanCount, setScanCount] = useState(0);
    const [duration, setDuration] = useState(15);
    const [generating, setGenerating] = useState(false);
    const [closing, setClosing] = useState(false);
    const [markingAbsent, setMarkingAbsent] = useState(false);
    const { showToast } = useToast();

    // Fetch active session from db on mount
    useEffect(() => {
        async function fetchActiveSession() {
            try {
                const session = await getActiveAttendanceSession(eventId);
                if (session) {
                    setToken(session.token);
                    setSessionId(session.sessionId);
                    setExpiresAt(session.expiresAt);
                    const remaining = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
                    setTimeLeft(remaining);
                }
            } catch (err) {
                console.error("Error loading active attendance session:", err);
            }
        }
        fetchActiveSession();
    }, [eventId]);

    const pollScanCount = useCallback(async () => {
        try {
            const res = await fetch(`/api/attendance-count?eventId=${eventId}`);
            const data = await res.json();
            setScanCount(data.count || 0);
        } catch { /* ignore polling errors */ }
    }, [eventId]);

    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) {
                setToken(null);
                setSessionId(null);
                setExpiresAt(null);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    useEffect(() => {
        if (!token) return;
        pollScanCount();
        const interval = setInterval(pollScanCount, 5000);
        return () => clearInterval(interval);
    }, [token, pollScanCount]);

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const result = await generateAttendanceQR(eventId, duration);
            setToken(result.token);
            setSessionId(result.sessionId);
            setExpiresAt(result.expiresAt);
            setScanCount(0);
            showToast("QR code generated!", "success");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to generate QR", "error");
        } finally {
            setGenerating(false);
        }
    };

    const handleClose = async () => {
        if (!sessionId) return;
        setClosing(true);
        try {
            await closeAttendanceSession(sessionId);
            setToken(null);
            setSessionId(null);
            setExpiresAt(null);
            showToast("Attendance session closed", "success");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to close session", "error");
        } finally {
            setClosing(false);
        }
    };

    const handleMarkAbsentees = async () => {
        if (!confirm("This will mark all registered (non-attended) participants as absent. Continue?")) return;
        setMarkingAbsent(true);
        try {
            await markAbsentees(eventId);
            showToast("Absentees marked", "success");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Failed to mark absentees", "error");
        } finally {
            setMarkingAbsent(false);
        }
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden card-hover">
            <div className="h-1.5 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
            <div className="p-5">
                <h3 className="font-semibold flex items-center gap-2 mb-4">
                    📱 QR Attendance
                </h3>

                {!token ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <label className="text-sm text-muted-foreground whitespace-nowrap">Duration:</label>
                            <select
                                value={duration}
                                onChange={(e) => setDuration(Number(e.target.value))}
                                className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            >
                                <option value={5}>5 minutes</option>
                                <option value={10}>10 minutes</option>
                                <option value={15}>15 minutes</option>
                                <option value={30}>30 minutes</option>
                                <option value={60}>1 hour</option>
                                <option value={120}>2 hours</option>
                            </select>
                        </div>
                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {generating ? "Generating..." : "Generate QR Code"}
                        </button>
                        <div className="pt-2 border-t border-border">
                            <a
                                href={`/api/attendance-export?eventId=${eventId}`}
                                className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 hover:opacity-95"
                            >
                                📊 Export Attendance List (.xlsx)
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={`w-2.5 h-2.5 rounded-full ${timeLeft > 60 ? "bg-green-500" : timeLeft > 0 ? "bg-yellow-500 animate-pulse" : "bg-red-500"}`} />
                                <span className="text-sm font-mono font-bold">{formatTime(timeLeft)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground">Scans:</span>
                                <span className="font-bold text-[#C9A227]">{scanCount}</span>
                            </div>
                        </div>

                        <div className="flex justify-center p-4 bg-white rounded-xl border">
                            <Image
                                src={`/api/attendance-qr?token=${token}`}
                                alt={`QR Code for ${eventTitle}`}
                                width={280}
                                height={280}
                                className="rounded-lg"
                                unoptimized
                            />
                        </div>

                        <div className="flex gap-2">
                            <a
                                href={`/api/attendance-qr?token=${token}`}
                                download={`attendance-${eventTitle.replace(/\s+/g, "-")}.png`}
                                className="flex-1 px-3 py-2 rounded-lg border text-xs font-medium text-center hover:bg-accent transition-colors"
                            >
                                📥 Download QR
                            </a>
                            <button
                                onClick={handleClose}
                                disabled={closing}
                                className="flex-1 px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                                {closing ? "Closing..." : "⏹ Close Session"}
                            </button>
                        </div>

                        <button
                            onClick={handleMarkAbsentees}
                            disabled={markingAbsent}
                            className="w-full px-3 py-2 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-accent transition-colors disabled:opacity-50"
                        >
                            {markingAbsent ? "Marking..." : "Mark remaining as absent"}
                        </button>

                        <div className="pt-2 border-t border-border">
                            <a
                                href={`/api/attendance-export?eventId=${eventId}`}
                                className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 hover:opacity-95"
                            >
                                📊 Export Attendance List (.xlsx)
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
