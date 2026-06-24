"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode } from "html5-qrcode";
import { scanAttendanceQR } from "@/lib/actions/attendance";
import { useToast } from "@/components/Toast";

interface AttendanceScanPanelProps {
    eventId: string;
    eventTitle: string;
}

export default function AttendanceScanPanel({ eventId: _eventId, eventTitle }: AttendanceScanPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<"camera" | "upload">("camera");
    const [cameraState, setCameraState] = useState<"idle" | "starting" | "scanning" | "error" | "permission_denied">("idle");
    const [scanningResult, setScanningResult] = useState<{ success: boolean; message: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
    const scannerLockRef = useRef<Promise<void>>(Promise.resolve());
    const { showToast } = useToast();

    // Mount guard for portal (SSR safe)
    useEffect(() => {
        setMounted(true);
    }, []);

    const runScannerAction = (action: () => Promise<void>) => {
        scannerLockRef.current = scannerLockRef.current.then(action).catch((err) => {
            console.error("Scanner action failed:", err);
        });
    };

    // Start/Stop camera scanner depending on modal open state and active tab
    useEffect(() => {
        let active = true;
        const activeCheck = () => active;

        if (!isOpen || activeTab !== "camera") {
            runScannerAction(() => stopScanner());
        } else {
            runScannerAction(() => startScanner(activeCheck));
        }

        return () => {
            active = false;
            runScannerAction(() => stopScanner());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeTab]);

    const startScanner = async (activeCheck: () => boolean) => {
        setCameraState("starting");
        setScanningResult(null);

        // Allow some time for DOM node to render inside the portal
        await new Promise((resolve) => setTimeout(resolve, 400));

        if (!activeCheck()) {
            setCameraState("idle");
            return;
        }

        const element = document.getElementById("qr-camera-reader");
        if (!element) {
            setCameraState("error");
            return;
        }

        try {
            // Ensure any existing scanner instance is cleaned up first
            if (html5QrCodeRef.current) {
                await stopScanner();
            }

            if (!activeCheck()) {
                setCameraState("idle");
                return;
            }

            const html5QrCode = new Html5Qrcode("qr-camera-reader");
            html5QrCodeRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: "environment" },
                {
                    fps: 10,
                    qrbox: (width, height) => {
                        const size = Math.max(50, Math.min(width, height) * 0.7);
                        const finalSize = Math.min(size, width || 250, height || 250);
                        return { width: Math.max(50, finalSize), height: Math.max(50, finalSize) };
                    },
                },
                (decodedText) => {
                    handleQRDecoded(decodedText);
                },
                () => {
                    // Ignore per-frame scan errors
                }
            );

            if (!activeCheck()) {
                await stopScanner();
                return;
            }

            setCameraState("scanning");
        } catch (err) {
            if (!activeCheck()) {
                await stopScanner();
                return;
            }
            console.error("Failed to start QR camera:", err);
            const errMsg = String(err).toLowerCase();
            if (errMsg.includes("permission") || errMsg.includes("notallowederror")) {
                setCameraState("permission_denied");
            } else {
                setCameraState("error");
            }
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try {
                if (html5QrCodeRef.current.isScanning) {
                    await html5QrCodeRef.current.stop();
                }
            } catch (err) {
                const errMsg = String(err).toLowerCase();
                if (!errMsg.includes("no active scanner") && !errMsg.includes("already under transition")) {
                    console.error("Error stopping QR scanner:", err);
                }
            } finally {
                html5QrCodeRef.current = null;
                setCameraState("idle");
            }
        }
    };

    const handleQRDecoded = async (text: string) => {
        if (submitting) return;

        let token = text.trim();
        try {
            const url = new URL(text);
            const tokenParam = url.searchParams.get("token");
            if (tokenParam) token = tokenParam;
        } catch {
            // Not a URL — treat as raw token
        }

        if (!token) {
            showToast("QR code did not contain a valid attendance token", "error");
            return;
        }

        await stopScanner();

        setSubmitting(true);
        try {
            const result = await scanAttendanceQR(token);
            setScanningResult({ success: result.success, message: result.message });
            if (result.success) {
                showToast("Attendance recorded!", "success");
            } else {
                showToast(result.message, "error");
            }
        } catch (err) {
            setScanningResult({
                success: false,
                message: err instanceof Error ? err.message : "Failed to record attendance",
            });
            showToast("Failed to record attendance", "error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setScanningResult(null);
        setSubmitting(true);

        try {
            const readerId = "qr-file-reader-temp";
            let tempElement = document.getElementById(readerId);
            if (!tempElement) {
                tempElement = document.createElement("div");
                tempElement.id = readerId;
                tempElement.style.display = "none";
                document.body.appendChild(tempElement);
            }

            const html5QrCode = new Html5Qrcode(readerId);
            const decodedText = await html5QrCode.scanFile(file, false);
            html5QrCode.clear();
            tempElement.remove();

            await handleQRDecoded(decodedText);
        } catch {
            setSubmitting(false);
            showToast("Could not find a valid QR code in the uploaded image", "error");
        }
    };

    // The modal rendered via portal into document.body — completely isolated from
    // the card's CSS compositing layer (card-hover transforms etc.)
    const modal = mounted && isOpen ? createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 p-4"
            style={{ isolation: "isolate" }}
        >
            <div
                className="relative w-full max-w-md bg-card rounded-2xl border shadow-2xl overflow-hidden animate-scale-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Title Bar */}
                <div className="px-5 py-4 border-b flex items-center justify-between bg-muted/40">
                    <div>
                        <h3 className="font-bold text-foreground">Scan QR Attendance</h3>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                            {eventTitle}
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                {!scanningResult && !submitting && (
                    <div className="flex border-b text-sm">
                        <button
                            onClick={() => setActiveTab("camera")}
                            className={`flex-1 py-3 font-medium border-b-2 transition-colors ${activeTab === "camera" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                            📷 Use Camera
                        </button>
                        <button
                            onClick={() => setActiveTab("upload")}
                            className={`flex-1 py-3 font-medium border-b-2 transition-colors ${activeTab === "upload" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                        >
                            📤 Upload Image
                        </button>
                    </div>
                )}

                {/* Content Body */}
                <div className="p-6">
                    {submitting && (
                        <div className="py-12 text-center space-y-4">
                            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-sm font-medium text-muted-foreground">Verifying attendance token...</p>
                        </div>
                    )}

                    {!submitting && scanningResult && (
                        <div className="text-center py-6 space-y-4">
                            {scanningResult.success ? (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 text-green-600 dark:text-green-400 flex items-center justify-center mx-auto text-3xl">
                                        ✓
                                    </div>
                                    <h4 className="text-lg font-bold text-foreground">Attendance Success!</h4>
                                    <p className="text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/20 border border-green-200/30 rounded-lg py-2 px-4 inline-block">
                                        {scanningResult.message}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-3xl">
                                        ⚠️
                                    </div>
                                    <h4 className="text-lg font-bold text-foreground">Attendance Failed</h4>
                                    <p className="text-sm text-destructive bg-destructive/10 dark:bg-destructive/20 border border-destructive/20 rounded-lg py-2 px-4 inline-block">
                                        {scanningResult.message}
                                    </p>
                                </>
                            )}
                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={() => setScanningResult(null)}
                                    className="flex-1 py-2 rounded-xl border text-sm font-semibold hover:bg-muted transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-95 transition-opacity"
                                >
                                    Got it
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Camera tab */}
                    <div className={!submitting && !scanningResult && activeTab === "camera" ? "block space-y-4" : "hidden"}>
                        {cameraState === "permission_denied" && (
                            <div className="h-64 rounded-xl border border-dashed flex flex-col items-center justify-center p-6 text-center space-y-3">
                                <span className="text-3xl">🔒</span>
                                <h4 className="font-bold text-sm">Camera Permission Denied</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Please enable camera permissions in your browser settings to scan QR codes directly.
                                </p>
                                <button
                                    onClick={() => runScannerAction(() => startScanner(() => true))}
                                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors"
                                >
                                    Retry Camera
                                </button>
                            </div>
                        )}
                        {(cameraState === "error" || (cameraState === "idle" && !html5QrCodeRef.current)) && (
                            <div className="h-64 rounded-xl border border-dashed flex flex-col items-center justify-center p-6 text-center space-y-3">
                                <span className="text-3xl">📷</span>
                                <h4 className="font-bold text-sm">Camera Offline</h4>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Could not access your device camera. You can try uploading a screenshot/image of the QR code instead.
                                </p>
                                <button
                                    onClick={() => runScannerAction(() => startScanner(() => true))}
                                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/95 transition-colors"
                                >
                                    Retry Camera
                                </button>
                            </div>
                        )}

                        {/* Scanner wrapper — static class so React never touches qr-camera-reader internals */}
                        <div
                            className={`relative overflow-hidden rounded-xl border bg-black shadow-inner ${
                                cameraState === "scanning" || cameraState === "starting" ? "block" : "hidden"
                            }`}
                            style={{ height: "260px" }}
                        >
                            {/* html5-qrcode owns everything inside this div — keep className static */}
                            <div id="qr-camera-reader" className="w-full h-full" />

                            {/* Laser scan line */}
                            {cameraState === "scanning" && (
                                <div className="absolute left-0 right-0 h-0.5 bg-gold shadow-[0_0_8px_#C9A227] z-10 animate-scan-laser" />
                            )}

                            {/* Loading overlay — no backdrop-blur to avoid compositing conflicts with video */}
                            {cameraState === "starting" && (
                                <div className="absolute inset-0 bg-[#0c0a09]/95 flex flex-col items-center justify-center text-sm text-zinc-300 z-20 gap-3">
                                    <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                                    <span className="font-medium tracking-wide">Initializing camera...</span>
                                </div>
                            )}
                        </div>

                        <p className="text-[11px] text-center text-muted-foreground">
                            Align the coordinator&apos;s QR code within the frame to scan.
                        </p>
                    </div>

                    {/* Upload tab */}
                    <div className={!submitting && !scanningResult && activeTab === "upload" ? "block space-y-4" : "hidden"}>
                        <label
                            htmlFor="qr-file-upload"
                            className="h-60 rounded-xl border-2 border-dashed border-muted hover:border-primary/40 transition-colors flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-muted/20"
                        >
                            <span className="text-4xl mb-3">🖼️</span>
                            <h4 className="font-semibold text-sm text-foreground">Select QR Code Image</h4>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                                Click to browse or drop an image file containing the QR code.
                            </p>
                            <input
                                id="qr-file-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                        <p className="text-[11px] text-center text-muted-foreground">
                            Supports PNG, JPEG, WEBP and other image formats.
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    ) : null;

    return (
        <div className="rounded-xl border bg-card shadow-sm overflow-hidden card-hover">
            <div className="h-1.5 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
            <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h3 className="font-semibold flex items-center gap-2 text-foreground">
                            📱 Attend Event
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Scan the coordinator&apos;s QR code to record your attendance.
                        </p>
                    </div>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="px-4 py-2 bg-gradient-to-r from-[#800000] to-[#9c1c1c] text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 hover:opacity-95"
                    >
                        📸 Scan QR Code
                    </button>
                </div>
            </div>

            {/* Portal-rendered modal — outside card DOM, immune to card-hover transforms */}
            {modal}
        </div>
    );
}
