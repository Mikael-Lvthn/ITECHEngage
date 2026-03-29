"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "email" | "otp" | "done";

export default function ForgotPasswordPage() {
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error } = await supabase.auth.resetPasswordForEmail(email);

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setStep("otp");
        setLoading(false);
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: "recovery",
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.push("/reset-password");
    };

    const inputClasses = "flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all";

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
                                {step === "email" ? "Forgot your password?" : "Enter verification code"}
                            </h1>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {step === "email"
                                    ? "Enter your email and we'll send you a verification code"
                                    : `We sent a 6-digit code to ${email}`}
                            </p>
                        </div>

                        {error && (
                            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-scale-in">
                                {error}
                            </div>
                        )}

                        {step === "email" && (
                            <form onSubmit={handleSendOtp} className="space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                                        Email Address
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com"
                                        required
                                        className={inputClasses}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Enter the email address you used to create your account
                                    </p>
                                </div>

                                <div className="rounded-xl border border-[#800000]/15 bg-[#800000]/5 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#800000]/10 flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-[#800000]">Get code via email</p>
                                            <p className="text-xs text-muted-foreground">We&apos;ll send a 6-digit verification code to your email</p>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#800000] text-white font-semibold text-sm hover:bg-[#700000] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Sending code...
                                        </span>
                                    ) : (
                                        "Continue"
                                    )}
                                </button>
                            </form>
                        )}

                        {step === "otp" && (
                            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
                                <div className="space-y-2">
                                    <label htmlFor="otp" className="text-sm font-medium text-foreground">
                                        Verification Code
                                    </label>
                                    <input
                                        id="otp"
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                                        placeholder="000000"
                                        required
                                        autoFocus
                                        className={`${inputClasses} text-center text-2xl font-bold tracking-[0.5em]`}
                                    />
                                    <p className="text-xs text-muted-foreground text-center">
                                        Check your email inbox and spam folder
                                    </p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || otp.length !== 6}
                                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#800000] text-white font-semibold text-sm hover:bg-[#700000] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                                >
                                    {loading ? (
                                        <span className="flex items-center gap-2">
                                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Verifying...
                                        </span>
                                    ) : (
                                        "Verify & Reset Password"
                                    )}
                                </button>

                                <p className="text-center text-sm text-muted-foreground">
                                    Didn&apos;t receive the code?{" "}
                                    <button
                                        type="button"
                                        onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                                        className="text-[#800000] font-semibold hover:underline"
                                    >
                                        Try again
                                    </button>
                                </p>
                            </form>
                        )}

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-border" />
                            </div>
                            <div className="relative flex justify-center text-xs">
                                <span className="bg-white px-3 text-muted-foreground">Remember your password?</span>
                            </div>
                        </div>

                        <p className="text-center text-sm text-muted-foreground">
                            <Link href="/login" className="text-[#800000] font-semibold hover:underline">
                                ← Back to Sign In
                            </Link>
                        </p>
                    </div>

                    <div className="text-center mt-6">
                        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Homepage
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
