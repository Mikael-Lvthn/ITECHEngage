"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingSpinner } from "@/components/loading/LoadingSpinner";
import { LoadingButton } from "@/components/loading/LoadingButton";

export default function ResetPasswordPage() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [sessionReady, setSessionReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setSessionReady(true);
            } else {
                router.push("/login?message=Invalid or expired reset link. Please request a new one.");
            }
        });
    }, [router]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
            password: password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setSuccess(true);
        setLoading(false);

        setTimeout(() => {
            router.push("/dashboard");
        }, 3000);
    };

    if (!sessionReady) {
        return (
            <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
                <div className="bg-[#800000] px-6 py-2 text-center">
                    <p className="text-xs text-white/80">
                        Polytechnic University of the Philippines — Institute of Technology
                    </p>
                </div>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <LoadingSpinner size="lg" label="Verifying reset link…" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
            <div className="bg-[#800000] px-6 py-2 text-center">
                <p className="text-xs text-white/80">
                    Polytechnic University of the Philippines — Institute of Technology
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md animate-slide-up">
                    <div className="bg-white rounded-2xl shadow-xl border border-border/50 p-8 space-y-6">
                        <div className="text-center">
                            <Image
                                src="/logo.png"
                                alt="ITECHEngage Logo"
                                width={72}
                                height={72}
                                className="mx-auto rounded-full shadow-lg"
                            />
                            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#2B2B2B]">
                                Set new password
                            </h1>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Choose a strong password for your account
                            </p>
                        </div>

                        {success ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <h3 className="font-semibold text-green-800 mb-1">Password updated!</h3>
                                    <p className="text-sm text-green-700">
                                        Your password has been successfully changed. Redirecting to dashboard...
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {error && (
                                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-scale-in">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleReset} className="space-y-5">
                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-foreground">
                                            New Password
                                        </label>
                                        <input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                                            Confirm New Password
                                        </label>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            minLength={6}
                                            className="flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                        />
                                    </div>

                                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
                                        <p className="text-xs text-amber-800">
                                            <strong>Password requirements:</strong> At least 6 characters. Use a mix of letters, numbers, and symbols for a stronger password.
                                        </p>
                                    </div>

                                    <LoadingButton
                                        type="submit"
                                        isLoading={loading}
                                        loadingText="Updating password…"
                                        className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#800000] text-white font-semibold text-sm hover:bg-[#700000] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        Update Password
                                    </LoadingButton>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
