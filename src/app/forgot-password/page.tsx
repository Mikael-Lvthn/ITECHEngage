"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/loading/LoadingButton";
import { Mail, Info, ArrowLeft } from "lucide-react";
import { SiteFooterLinks } from "@/components/SiteFooterLinks";

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
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        setStep("otp"); // Keep as otp for those who want to enter code manually, but clarify in UI
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

    const inputClasses = "flex h-11 w-full rounded-xl border border-input bg-background text-foreground px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <div className="bg-primary px-6 py-2 text-center">
                <p className="text-xs text-primary-foreground/80">
                    Polytechnic University of the Philippines — Institute of Technology
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md animate-slide-up">
                    <div className="bg-card rounded-2xl shadow-xl border border-border p-8 space-y-6">
                        <div className="text-center">
                            <Image
                                src="/logo.png"
                                alt="ITECHEngage Logo"
                                width={72}
                                height={72}
                                className="mx-auto rounded-full shadow-lg"
                            />
                            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
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

                                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                            <Mail className="w-5 h-5 text-primary" aria-hidden="true" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-primary">Get code via email</p>
                                            <p className="text-xs text-muted-foreground">We&apos;ll send a 6-digit verification code to your email</p>
                                        </div>
                                    </div>
                                </div>

                                <LoadingButton
                                    type="submit"
                                    isLoading={loading}
                                    loadingText="Sending code…"
                                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    Continue
                                </LoadingButton>
                            </form>
                        )}

                        {step === "otp" && (
                            <form onSubmit={handleVerifyOtp} className="space-y-5 animate-fade-in">
                                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 mb-4 dark:border-blue-500/30 dark:bg-blue-500/10">
                                    <div className="flex gap-3">
                                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5 dark:bg-blue-500/20">
                                            <Info className="w-3 h-3 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                                        </div>
                                        <p className="text-sm text-blue-800 dark:text-blue-200">
                                            We&apos;ve sent a <strong>reset link</strong> to your email. You can click that link to reset your password directly, or enter the 6-digit code below.
                                        </p>
                                    </div>
                                </div>

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

                                <LoadingButton
                                    type="submit"
                                    isLoading={loading}
                                    loadingText="Verifying…"
                                    disabled={loading || otp.length !== 6}
                                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                                >
                                    Verify &amp; Reset Password
                                </LoadingButton>

                                <p className="text-center text-sm text-muted-foreground">
                                    Didn&apos;t receive the code?{" "}
                                    <button
                                        type="button"
                                        onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                                        className="text-primary font-semibold hover:underline cursor-pointer"
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
                                <span className="bg-card px-3 text-muted-foreground">Remember your password?</span>
                            </div>
                        </div>

                        <p className="text-center text-sm text-muted-foreground">
                            <Link href="/login" className="text-primary font-semibold hover:underline">
                                ← Back to Sign In
                            </Link>
                        </p>
                    </div>

                    <div className="text-center mt-6">
                        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                            Back to Homepage
                        </Link>
                    </div>

                    <SiteFooterLinks className="justify-center mt-4 text-xs text-muted-foreground" />
                </div>
            </div>
        </div>
    );
}
