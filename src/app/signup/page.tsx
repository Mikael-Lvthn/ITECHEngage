"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LoadingButton } from "@/components/loading/LoadingButton";
import { Eye, EyeOff, ArrowLeft, ChevronRight, GraduationCap, ShieldCheck, User } from "lucide-react";
import { SiteFooterLinks } from "@/components/SiteFooterLinks";
import { customSignUpAndSendEmail } from "@/lib/actions/signup";

type RegistrationType = "student" | "faculty";

export default function SignupPage() {
    const [registrationType, setRegistrationType] = useState<RegistrationType | null>(null);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [studentNumber, setStudentNumber] = useState("");
    const [schoolEmail, setSchoolEmail] = useState("");
    const [personalEmail, setPersonalEmail] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [course, setCourse] = useState("");
    const [section, setSection] = useState("");
    const [yearLevel, setYearLevel] = useState("");
    const [corFile, setCorFile] = useState<File | null>(null);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
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
            if (!studentNumber.trim()) {
                setError("Student number is required");
                return;
            }
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
            if (!course.trim()) {
                setError("Course / Program is required");
                return;
            }
            if (!yearLevel) {
                setError("Year level is required");
                return;
            }
            if (!section.trim()) {
                setError("Section is required");
                return;
            }
            if (!corFile) {
                setError("Your Certificate of Registration (COR) is required");
                return;
            }
            const allowedCorTypes = ["application/pdf", "image/jpeg", "image/png"];
            if (!allowedCorTypes.includes(corFile.type)) {
                setError("Your COR must be a PDF, JPG, or PNG file");
                return;
            }
            if (corFile.size > 5 * 1024 * 1024) {
                setError("Your COR must be 5MB or smaller");
                return;
            }
        }

        setLoading(true);

        const supabase = createClient();

        // Check for duplicates before attempting registration
        if (registrationType === "student") {
            // Check login email
            const { data: emailCheck } = await supabase
                .from("profiles")
                .select("id")
                .eq("email", email.trim().toLowerCase())
                .maybeSingle();
            if (emailCheck) {
                setError("An account with this login email already exists. Please sign in instead.");
                setLoading(false);
                return;
            }

            // Check student number
            const { data: snCheck } = await supabase
                .from("students")
                .select("id")
                .eq("student_number", studentNumber.trim())
                .maybeSingle();
            if (snCheck) {
                setError("This student number is already registered. Please contact administration if you believe this is an error.");
                setLoading(false);
                return;
            }

            // Check school email
            const { data: seCheck } = await supabase
                .from("students")
                .select("id")
                .eq("school_email", schoolEmail.trim().toLowerCase())
                .maybeSingle();
            if (seCheck) {
                setError("This school email is already linked to an existing account.");
                setLoading(false);
                return;
            }

            // Check personal email
            const { data: peCheck } = await supabase
                .from("students")
                .select("id")
                .eq("personal_email", personalEmail.trim().toLowerCase())
                .maybeSingle();
            if (peCheck) {
                setError("This personal email is already linked to an existing account.");
                setLoading(false);
                return;
            }
        }


        try {
            const { success, error } = await customSignUpAndSendEmail(
                email,
                password,
                location.origin,
                {
                    full_name: fullName,
                    registration_type: registrationType,
                    ...(registrationType === "student" && {
                        school_email: schoolEmail,
                        personal_email: personalEmail,
                        contact_number: contactNumber,
                        student_number: studentNumber,
                        course: course,
                        section: section,
                        year_level: yearLevel,
                    }),
                },
                registrationType === "student" ? corFile ?? undefined : undefined
            );

            if (!success) {
                setError(error || "An unexpected error occurred.");
                setLoading(false);
                return;
            }

            router.push("/login?message=Registration successful! Please wait for an administrator to review and verify your account. We will notify you via email once approved.");
        } catch (err: unknown) {
            console.error("Signup error:", err);
            setError(err instanceof Error ? err.message : "An unexpected error occurred during signup.");
            setLoading(false);
        }
    };

    const inputClasses = "flex h-11 w-full rounded-xl border border-input bg-background text-foreground px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all";

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <div className="bg-primary px-6 py-2 text-center">
                <p className="text-xs text-primary-foreground/80">
                    Polytechnic University of the Philippines — Institute of Technology
                </p>
            </div>

            <div className="flex-1 flex items-center justify-center px-4 py-8">
                <div className="w-full max-w-lg animate-slide-up">
                    <div className="bg-card rounded-2xl shadow-xl border border-border p-8 space-y-6">
                        <div className="text-center">
                            <Image
                                src="/logo.png"
                                alt="ITECHEngage Logo"
                                width={72}
                                height={72}
                                className="mx-auto rounded-full shadow-lg"
                            />
                            <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
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
                                        className="group relative rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-primary hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                                    >
                                        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg bg-gradient-to-r from-primary to-[#A52A2A] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                            <GraduationCap className="w-7 h-7 text-primary" aria-hidden="true" />
                                        </div>
                                        <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">Student</h3>
                                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                            For PUP-ITECH students to join organizations, attend events, and participate in elections.
                                        </p>
                                        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                            Select
                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => setRegistrationType("faculty")}
                                        className="group relative rounded-xl border-2 border-border bg-card p-6 text-left transition-all hover:border-gold hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-gold cursor-pointer"
                                    >
                                        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg bg-gradient-to-r from-gold to-[#E6C84D] opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="w-14 h-14 rounded-xl bg-gold/10 flex items-center justify-center mb-4 group-hover:bg-gold/20 transition-colors">
                                            <ShieldCheck className="w-7 h-7 text-gold" aria-hidden="true" />
                                        </div>
                                        <h3 className="font-bold text-lg text-foreground group-hover:text-gold transition-colors">Faculty / Admin</h3>
                                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                                            For faculty advisors and administrators to manage organizations and oversee activities.
                                        </p>
                                        <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                                            Select
                                            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                                        </div>
                                    </button>
                                </div>

                                <div className="relative pt-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-border" />
                                    </div>
                                    <div className="relative flex justify-center text-xs">
                                        <span className="bg-card px-3 text-muted-foreground">Already have an account?</span>
                                    </div>
                                </div>

                                <p className="text-center text-sm">
                                    <Link href="/login" className="text-primary font-semibold hover:underline">
                                        Sign in instead →
                                    </Link>
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-5 animate-fade-in">
                                <div className="flex items-center justify-between">
                                    <button
                                        onClick={() => setRegistrationType(null)}
                                        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                                    >
                                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                                        Change type
                                    </button>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${registrationType === "student"
                                        ? "bg-primary/10 text-primary"
                                        : "bg-gold/10 text-gold"
                                        }`}>
                                        {registrationType === "student" ? (
                                            <><GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> Student</>
                                        ) : (
                                            <><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Faculty / Admin</>
                                        )}
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
                                                    ? "student@iskolarngbayan.pup.edu.ph"
                                                    : "faculty@pup.edu.ph"
                                            }
                                            required
                                            className={inputClasses}
                                        />
                                        <p className="text-xs text-muted-foreground">This will be used to sign in to your account</p>
                                    </div>

                                    {registrationType === "student" && (
                                        <>
                                            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-4">
                                                <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-1.5">
                                                    <User className="w-4 h-4" aria-hidden="true" />
                                                    Student Information
                                                </p>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label htmlFor="studentNumber" className="text-sm font-medium text-foreground">
                                                            Student Number <span className="text-destructive">*</span>
                                                        </label>
                                                        <input
                                                            id="studentNumber"
                                                            type="text"
                                                            value={studentNumber}
                                                            onChange={(e) => setStudentNumber(e.target.value)}
                                                            placeholder="202X-XXXXX-MN-0"
                                                            required
                                                            className={inputClasses}
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label htmlFor="schoolEmail" className="text-sm font-medium text-foreground">
                                                            School Email <span className="text-destructive">*</span>
                                                        </label>
                                                        <input
                                                            id="schoolEmail"
                                                            type="email"
                                                            value={schoolEmail}
                                                            onChange={(e) => setSchoolEmail(e.target.value)}
                                                            placeholder="student@iskolarngbayan.pup.edu.ph"
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
                                                            placeholder="9XX XXX XXXX"
                                                            required
                                                            className={inputClasses}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label htmlFor="course" className="text-sm font-medium text-foreground">
                                                        Course / Program <span className="text-destructive">*</span>
                                                    </label>
                                                    <select
                                                        id="course"
                                                        value={course}
                                                        onChange={(e) => setCourse(e.target.value)}
                                                        required
                                                        className={inputClasses}
                                                    >
                                                        <option value="">Select a program...</option>
                                                        <option value="DCvET">Diploma in Civil Engineering Technology (DCvET)</option>
                                                        <option value="DCET">Diploma in Computer Engineering Technology (DCET)</option>
                                                        <option value="DEET">Diploma in Electrical Engineering Technology (DEET)</option>
                                                        <option value="DECET">Diploma in Electronics Engineering Technology (DECET)</option>
                                                        <option value="DIT">Diploma in Information Technology (DIT)</option>
                                                        <option value="DMET">Diploma in Mechanical Engineering Technology (DMET)</option>
                                                        <option value="DOMT">Diploma in Office Management Technology (DOMT)</option>
                                                        <option value="DRET">Diploma in Railway Engineering Technology (DRET)</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <label htmlFor="yearLevel" className="text-sm font-medium text-foreground">
                                                            Year Level <span className="text-destructive">*</span>
                                                        </label>
                                                        <select
                                                            id="yearLevel"
                                                            value={yearLevel}
                                                            onChange={(e) => setYearLevel(e.target.value)}
                                                            required
                                                            className={inputClasses}
                                                        >
                                                            <option value="">Select</option>
                                                            <option value="1">1st Year</option>
                                                            <option value="2">2nd Year</option>
                                                            <option value="3">3rd Year</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label htmlFor="section" className="text-sm font-medium text-foreground">
                                                            Section <span className="text-destructive">*</span>
                                                        </label>
                                                        <input
                                                            id="section"
                                                            type="text"
                                                            value={section}
                                                            onChange={(e) => setSection(e.target.value)}
                                                            placeholder="e.g. 1, 2, 3..."
                                                            required
                                                            className={inputClasses}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label htmlFor="corFile" className="text-sm font-medium text-foreground">
                                                        Certificate of Registration (COR) <span className="text-destructive">*</span>
                                                    </label>
                                                    <input
                                                        id="corFile"
                                                        type="file"
                                                        accept=".pdf,.png,.jpg,.jpeg"
                                                        onChange={(e) => setCorFile(e.target.files?.[0] ?? null)}
                                                        required
                                                        className="flex w-full rounded-xl border border-input bg-background text-foreground text-sm ring-offset-background file:mr-4 file:border-0 file:bg-primary file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90 file:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                                    />
                                                    <p className="text-xs text-muted-foreground">
                                                        Upload a PDF, JPG, or PNG (max 5MB). An administrator will review this before approving your account.
                                                    </p>
                                                    {corFile && (
                                                        <p className="text-xs text-primary font-medium">Selected: {corFile.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}

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
                                                className="flex h-11 w-full rounded-xl border border-input bg-background text-foreground pl-4 pr-11 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                                            Confirm Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                id="confirmPassword"
                                                type={showConfirm ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                required
                                                className="flex h-11 w-full rounded-xl border border-input bg-background text-foreground pl-4 pr-11 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm((v) => !v)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
                                                aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                                            >
                                                {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <LoadingButton
                                        type="submit"
                                        isLoading={loading}
                                        loadingText="Creating account…"
                                        className={`inline-flex items-center justify-center w-full h-11 rounded-xl font-semibold text-sm transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none cursor-pointer ${registrationType === "student"
                                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                            : "bg-gold text-[#2B2B2B] hover:bg-gold/90"
                                            }`}
                                    >
                                        {`Create ${registrationType === "student" ? "Student" : "Faculty"} Account`}
                                    </LoadingButton>
                                </form>

                                <p className="text-center text-sm text-muted-foreground">
                                    Already have an account?{" "}
                                    <Link href="/login" className="text-primary font-semibold hover:underline">
                                        Sign in
                                    </Link>
                                </p>
                            </div>
                        )}
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
