"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/loading/LoadingButton";
import { Eye, EyeOff } from "lucide-react";

function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const message = searchParams.get("message");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        const redirectTo = searchParams.get("redirectTo");
        router.push(redirectTo ? decodeURIComponent(redirectTo) : "/dashboard");
        router.refresh();
    };

    return (
        <>
            {/* Success/Error message */}
            {message && (
                <div className={`rounded-xl border p-4 text-sm animate-scale-in ${
                    message.toLowerCase().includes("error") || 
                    message.toLowerCase().includes("invalid") || 
                    message.toLowerCase().includes("could not") ||
                    message.toLowerCase().includes("no code") ||
                    message.toLowerCase().includes("not found") ||
                    message.toLowerCase().includes("pkce")
                        ? "border-destructive/30 bg-destructive/5 text-destructive"
                        : "border-green-200 bg-green-50 text-green-700"
                }`}>
                    {message.toLowerCase().includes("error") || 
                     message.toLowerCase().includes("invalid") || 
                     message.toLowerCase().includes("not found") || 
                     message.toLowerCase().includes("pkce") ? "❌" : "✅"} {message}
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-scale-in">
                    {error}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium text-foreground">
                        Email
                    </label>
                    <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="student@iskolarngbayan.pup.edu.ph"
                        required
                        className="flex h-11 w-full rounded-xl border border-input bg-white text-gray-900 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                    />
                </div>
                <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium text-foreground">
                        Password
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="flex h-11 w-full rounded-xl border border-input bg-white text-gray-900 pl-4 pr-11 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
                <div className="flex justify-end">
                    <Link href="/forgot-password" className="text-xs text-[#800000] font-medium hover:underline transition-colors">
                        Forgot Password?
                    </Link>
                </div>
                <LoadingButton
                    type="submit"
                    isLoading={loading}
                    loadingText="Signing in…"
                    className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#800000] text-white font-semibold text-sm hover:bg-[#700000] transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none"
                >
                    Sign In
                </LoadingButton>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-3 text-muted-foreground">New here?</span>
                </div>
            </div>

            <p className="text-center text-sm text-muted-foreground">
                <Link href="/signup" className="text-[#800000] font-semibold hover:underline">
                    Create an account →
                </Link>
            </p>
        </>
    );
}

export default function LoginPage() {
    return (
        <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
            {/* PUP Header Strip */}
            <div className="bg-[#800000] px-6 py-2 text-center">
                <p className="text-xs text-white/80">
                    Polytechnic University of the Philippines — Institute of Technology
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full max-w-md animate-slide-up">
                    <div className="bg-white rounded-2xl shadow-xl border border-border/50 p-8 space-y-6">
                        {/* Logo */}
                        <div className="text-center">
                            <Image
                                src="/logo.png"
                                alt="ITECHEngage Logo"
                                width={72}
                                height={72}
                                className="mx-auto rounded-full shadow-lg"
                            />
                            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#2B2B2B]">Welcome back</h1>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Sign in to your ITECHEngage account
                            </p>
                        </div>

                        <Suspense fallback={<div className="text-center text-sm text-muted-foreground">Loading...</div>}>
                            <LoginForm />
                        </Suspense>
                    </div>

                    {/* Back to homepage */}
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
