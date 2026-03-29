"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/loading/LoadingButton";

type RegistrationType = "student" | "faculty";

export default function SignupPage() {
    const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [schoolEmail, setSchoolEmail] = useState("");
    const [personalEmail, setPersonalEmail] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [lrn, setLrn] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        if (registrationType === "student") {
            if (!schoolEmail.trim()) {
                setError("School email is required");
                return;
            }
            if (!personalEmail.trim()) {
                setError("Personal email is required");
                return;
            }
            if (!contactNumber.trim()) {
                setError("Contact number is required");
                return;
            }
            if (!lrn.trim()) {
                setError("LRN is required");
                return;
            }
        }

        setLoading(true);

        const supabase = createClient();
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    registration_type: registrationType,
                    ...(registrationType === "student" && {
                        school_email: schoolEmail,
                        personal_email: personalEmail,
                        contact_number: contactNumber,
                        lrn: lrn,
                    }),
                },
            },
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        router.push("/login?message=Check your email to confirm your account");
    };

    const inputClasses = "flex h-11 w-full rounded-xl border border-input bg-white px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all";

    return (
        <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
            <div className="bg-[#800000] px-6 py-2 text-center">
                <p className="text-xs text-white/80">
                    Polytechnic University of the Philippines — Institute of Technology
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-lg animate-slide-up">
                    <div className="bg-white rounded-2xl shadow-xl border border-border/50 p-8 space-y-6">
                        <div className="text-center">
                            <Image
                                src="/logo.png"
                                alt="ITECHEngage Logo"
                                width={72}
                                height={72}
                                className="mx-auto rounded-full shadow-lg"
                            />
                            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#2B2B2B]">Create your account</h1>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Join the ITECHEngage campus community
                            </p>
                        </div>

                        {!registrationType ? (
                            <div className="space-y-4 animate-fade-in">
                                <p className="text-center text-sm font-medium text-foreground">
                                    Choose your account type
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setRegistrationType("student")}
                                        className="group relative rounded-xl border-2 border-border bg-white p-6 text-left transition-all hover:border-[#800000] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                    >
                                        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg bg-gradient-to-r from-[#800000] to-[#A52A2A] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-14 h-14 rounded-xl bg-[#800000]/10 flex items-center justify-center mb-4 group-hover:bg-[#800000]/20 transition-colors">
                                            <span className="text-3xl">🎓</span>
                                        </div>
                                        <h3 className="font-bold text-lg text-[#2B2B2B] group-hover:text-[#800000] transition-colors">Student</h3>
                                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                            For PUP-ITECH students to join organizations, attend events, and participate in elections.
                                        </p>
                                        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#800000] opacity-0 group-hover:opacity-100 transition-opacity">
                                            Select
                                            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setRegistrationType("faculty")}
                                        className="group relative rounded-xl border-2 border-border bg-white p-6 text-left transition-all hover:border-[#C9A227] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
                                    >
                                        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg bg-gradient-to-r from-[#C9A227] to-[#E6C84D] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-14 h-14 rounded-xl bg-[#C9A227]/10 flex items-center justify-center mb-4 group-hover:bg-[#C9A227]/20 transition-colors">
                                            <span className="text-3xl">🛡️</span>
                                        </div>
                                        <h3 className="font-bold text-lg text-[#2B2B2B] group-hover:text-[#C9A227] transition-colors">Faculty / Admin</h3>
                                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                            For faculty advisors and administrators to manage organizations and oversee activities.
                                        </p>
                                        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#C9A227] opacity-0 group-hover:opacity-100 transition-opacity">
                                            Select
                                            <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </button>
                                </div>

                                <div className="relative pt-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="bg-white px-3 text-muted-foreground">Already have an account?</span>
                                    </div>
                                </div>

                                <p className="text-center text-sm">
                                    <Link href="/login" className="text-[#800000] font-semibold hover:underline">
                                        Sign in instead →
                                    </Link>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setRegistrationType(null)}
                                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Change type
                                    </button>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${registrationType === "student"
                                        ? "bg-[#800000]/10 text-[#800000]"
                                        : "bg-[#C9A227]/10 text-[#C9A227]"
                                        }`}>
                                        {registrationType === "student" ? "🎓 Student" : "🛡️ Faculty / Admin"}
                                    </span>
                                </div>

                                {error && (
                                    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive animate-scale-in">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSignup} className="space-y-4">
                                    <div className="space-y-2">
                                        <label htmlFor="fullName" className="text-sm font-medium text-foreground">
                                            Full Name
                                        </label>
                                        <input
                                            id="fullName"
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Juan Dela Cruz"
                                            required
                                            className={inputClasses}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="email" className="text-sm font-medium text-foreground">
                                            Login Email
                                        </label>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder={
                                                registrationType === "student"
                                                    ? "student@iskolar.pup.edu.ph"
                                                    : "faculty@pup.edu.ph"
                                            }
                                            required
                                            className={inputClasses}
                                        />
                                        <p className="text-xs text-muted-foreground">This will be used to sign in to your account</p>
                                    </div>

                                    {registrationType === "student" && (
                                        <>
                                            <div className="rounded-xl border border-[#800000]/20 bg-[#800000]/5 p-4 space-y-4">
                                                <p className="text-xs font-semibold text-[#800000] uppercase tracking-wider flex items-center gap-1.5">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    Student Information
                                                </p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label htmlFor="schoolEmail" className="text-sm font-medium text-foreground">
                                                            School Email <span className="text-destructive">*</span>
                                                        </label>
                                                        <input
                                                            id="schoolEmail"
                                                            type="email"
                                                            value={schoolEmail}
                                                            onChange={(e) => setSchoolEmail(e.target.value)}
                                                            placeholder="student@iskolar.pup.edu.ph"
                                                            required
                                                            className={inputClasses}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label htmlFor="personalEmail" className="text-sm font-medium text-foreground">
                                                            Personal Email <span className="text-destructive">*</span>
                                                        </label>
                                                        <input
                                                            id="personalEmail"
                                                            type="email"
                                                            value={personalEmail}
                                                            onChange={(e) => setPersonalEmail(e.target.value)}
                                                            placeholder="name@gmail.com"
                                                            required
                                                            className={inputClasses}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label htmlFor="contactNumber" className="text-sm font-medium text-foreground">
                                                            Contact Number <span className="text-destructive">*</span>
                                                        </label>
                                                        <input
                                                            id="contactNumber"
                                                            type="tel"
                                                            value={contactNumber}
                                                            onChange={(e) => setContactNumber(e.target.value)}
                                                            placeholder="+63 9XX XXX XXXX"
                                                            required
                                                            className={inputClasses}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label htmlFor="lrn" className="text-sm font-medium text-foreground">
                                                            LRN <span className="text-destructive">*</span>
                                                        </label>
                                                        <input
                                                            id="lrn"
                                                            type="text"
                                                            value={lrn}
                                                            onChange={(e) => setLrn(e.target.value)}
                                                            placeholder="12-digit LRN"
                                                            required
                                                            maxLength={12}
                                                            className={inputClasses}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}

                                    <div className="space-y-2">
                                        <label htmlFor="password" className="text-sm font-medium text-foreground">
                                            Password
                                        </label>
                                        <input
                                            id="password"
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className={inputClasses}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                                            Confirm Password
                                        </label>
                                        <input
                                            id="confirmPassword"
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            required
                                            className={inputClasses}
                                        />
                                    </div>

                                    <LoadingButton
                                        type="submit"
                                        isLoading={loading}
                                        loadingText="Creating account…"
                                        className={`inline-flex items-center justify-center w-full h-11 rounded-xl text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none ${registrationType === "student"
                                            ? "bg-[#800000] hover:bg-[#700000]"
                                            : "bg-[#C9A227] text-[#2B2B2B] hover:bg-[#b8911f]"
                                            }`}
                                    >
                                        {`Create ${registrationType === "student" ? "Student" : "Faculty"} Account`}
                                    </LoadingButton>
                                </form>

                                <p className="text-center text-sm text-muted-foreground">
                                    Already have an account?{" "}
                                    <Link href="/login" className="text-[#800000] font-semibold hover:underline">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        )}
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
