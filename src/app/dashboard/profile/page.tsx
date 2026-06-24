"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { updateProfile } from "@/lib/actions/profile";
import { getCorSignedUrl, updateStudentCor } from "@/lib/actions/cor";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { LoadingButton } from "@/components/loading/LoadingButton";
import { getErrorMessage } from "@/lib/utils/error";
import DocumentViewerModal from "@/components/accreditation/DocumentViewerModal";

interface Profile {
    full_name: string;
    email: string;
    role: string;
    avatar_url: string | null;
    bio: string | null;
    phone_number: string | null;
    track_record: string | null;
    social_links: { facebook?: string; twitter?: string; linkedin?: string } | null;
}

interface Student {
    school_email: string | null;
    personal_email: string | null;
    contact_number: string | null;

    student_number: string | null;
    program: string | null;
    course: string | null;
    section: string | null;
    year_level: number | null;
    cor_url: string | null;
}

// Mirrors the Course/Program options on the signup form; the registered value
// is stored as a code (e.g. "DIT") in students.course.
const PROGRAM_LABELS: Record<string, string> = {
    DCvET: "Diploma in Civil Engineering Technology (DCvET)",
    DCET: "Diploma in Computer Engineering Technology (DCET)",
    DEET: "Diploma in Electrical Engineering Technology (DEET)",
    DECET: "Diploma in Electronics Engineering Technology (DECET)",
    DIT: "Diploma in Information Technology (DIT)",
    DMET: "Diploma in Mechanical Engineering Technology (DMET)",
    DOMT: "Diploma in Office Management Technology (DOMT)",
    DRET: "Diploma in Railway Engineering Technology (DRET)",
};

function yearLevelLabel(year: number | null | undefined): string {
    if (!year) return "—";
    const suffix = year === 1 ? "st" : year === 2 ? "nd" : year === 3 ? "rd" : "th";
    return `${year}${suffix} Year`;
}

export default function ProfilePage() {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [socialLinks, setSocialLinks] = useState({ facebook: "", twitter: "", linkedin: "" });
    const [userId, setUserId] = useState<string>("");
    const [corUploading, setCorUploading] = useState(false);
    const [corViewing, setCorViewing] = useState<{ url: string; name: string } | null>(null);
    const [corLoading, setCorLoading] = useState(false);

    const supabase = createClient();
    const { showToast } = useToast();

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserId(user.id);
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (profileData) {
                    setProfile(profileData);
                    setAvatarUrl(profileData.avatar_url || "");
                    if (profileData.social_links) {
                        setSocialLinks({
                            facebook: profileData.social_links.facebook || "",
                            twitter: profileData.social_links.twitter || "",
                            linkedin: profileData.social_links.linkedin || ""
                        });
                    }
                }

                const { data: studentData } = await supabase
                    .from("students")
                    .select("*")
                    .eq("id", user.id)
                    .single();

                if (studentData) {
                    setStudent(studentData);
                }
            }
            setLoading(false);
        }
        loadProfile();
    }, [supabase]);

    async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
        if (!event.target.files || event.target.files.length === 0) return;

        try {
            setUploading(true);
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            setAvatarUrl(data.publicUrl);
        } catch (error) {
            console.error('Error uploading avatar:', error);
            showToast('Error uploading avatar', 'error');
        } finally {
            setUploading(false);
        }
    }

    async function handleViewCor() {
        if (!userId) return;
        try {
            setCorLoading(true);
            const url = await getCorSignedUrl(userId);
            setCorViewing({ url, name: "Certificate of Registration.pdf" });
        } catch (error) {
            console.error('Error loading COR:', error);
            showToast(getErrorMessage(error) || 'Could not load your COR', 'error');
        } finally {
            setCorLoading(false);
        }
    }

    async function handleCorUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;

        const allowed = ["application/pdf", "image/jpeg", "image/png"];
        if (!allowed.includes(file.type)) {
            showToast('COR must be a PDF, JPG, or PNG', 'error');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToast('COR must be 5MB or smaller', 'error');
            return;
        }

        try {
            setCorUploading(true);
            const formData = new FormData();
            formData.append("file", file);
            await updateStudentCor(formData);
            setStudent((prev) => (prev ? { ...prev, cor_url: "updated" } : prev));
            showToast('Certificate of Registration updated', 'success');
        } catch (error) {
            console.error('Error uploading COR:', error);
            showToast(getErrorMessage(error) || 'Error uploading COR', 'error');
        } finally {
            setCorUploading(false);
        }
    }

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData(event.currentTarget);
            formData.set("avatar_url", avatarUrl);
            formData.set("social_links", JSON.stringify(socialLinks));
            formData.set("is_student", student ? "true" : "false");
            await updateProfile(formData);
            showToast("Profile updated successfully!", "success");
        } catch (error) {
            console.error(error);
            showToast(getErrorMessage(error) || "Failed to update profile", "error");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-48" />
                <div className="bg-card rounded-xl border p-6 space-y-4">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-muted" />
                        <div className="space-y-2">
                            <div className="h-5 bg-muted rounded w-32" />
                            <div className="h-4 bg-muted rounded w-48" />
                        </div>
                    </div>
                    <div className="h-10 bg-muted rounded" />
                    <div className="h-24 bg-muted rounded" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

            <div className="bg-card rounded-xl shadow-sm border p-6">
                <div className="mb-6 flex items-center gap-6">
                    <div className="relative">
                        {avatarUrl ? (
                            <div className="relative w-24 h-24 rounded-full overflow-hidden border">
                                <Image src={avatarUrl} alt="Avatar" fill className="object-cover" />
                            </div>
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-muted-foreground border">
                                No Avatar
                            </div>
                        )}
                        <label className="absolute bottom-0 right-0 bg-primary text-white p-1.5 rounded-full cursor-pointer hover:bg-primary/90 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                                disabled={uploading}
                                className="hidden"
                            />
                        </label>
                    </div>
                    <div>
                        <h3 className="font-semibold">{profile?.full_name}</h3>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                        {student && (student.year_level || student.section) && (
                            <p className="text-sm text-muted-foreground">
                                {yearLevelLabel(student.year_level)}
                                {student.section ? ` · Section ${student.section}` : ""}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-wider">{profile?.role}</p>
                        {uploading && <p className="text-sm text-gold mt-2">Uploading...</p>}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
                        <p className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground">
                            {profile?.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Contact an administrator to change your name.</p>
                        <input type="hidden" name="full_name" value={profile?.full_name || ""} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Bio</label>
                        <textarea
                            name="bio"
                            defaultValue={profile?.bio || ""}
                            rows={4}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-1">Phone Number</label>
                            <input
                                type="tel"
                                name="phone_number"
                                defaultValue={profile?.phone_number || ""}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="+63 9XX XXX XXXX"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground mb-1">Track Record / Portfolio</label>
                        <textarea
                            name="track_record"
                            defaultValue={profile?.track_record || ""}
                            rows={4}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            placeholder="Describe your academic achievements, extracurricular activities, projects, or any relevant experience..."
                        />
                    </div>

                    {student && (
                        <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Student Information
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Student Number</label>
                                    <p className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground">
                                        {student?.student_number || "—"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Course / Program</label>
                                    <p className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground">
                                        {student?.course ? (PROGRAM_LABELS[student.course] || student.course) : "—"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Year Level</label>
                                    <p className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground">
                                        {yearLevelLabel(student?.year_level)}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Section</label>
                                    <p className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground">
                                        {student?.section || "—"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">School Email</label>
                                    <p className="px-3 py-2.5 rounded-xl border border-border bg-muted/50 text-sm text-foreground break-all">
                                        {student?.school_email || "—"}
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Personal Email</label>
                                    <input
                                        type="email"
                                        name="personal_email"
                                        defaultValue={student?.personal_email || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="name@gmail.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-muted-foreground mb-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        name="contact_number"
                                        defaultValue={student?.contact_number || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                        placeholder="+63 9XX XXX XXXX"
                                    />
                                </div>
                                <p className="md:col-span-2 text-xs text-muted-foreground">
                                    Student number, course/program, year level, section, and school email are set at registration. Contact an administrator to correct them.
                                </p>
                            </div>

                            <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div>
                                        <p className="text-sm font-medium text-foreground">Certificate of Registration (COR)</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {student?.cor_url
                                                ? "Only you and administrators can view this document."
                                                : "No COR on file. Upload your Certificate of Registration."}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {student?.cor_url && (
                                            <button
                                                type="button"
                                                onClick={handleViewCor}
                                                disabled={corLoading}
                                                className="px-3 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
                                            >
                                                {corLoading ? "Loading..." : "📄 View COR"}
                                            </button>
                                        )}
                                        <label className={`px-3 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer ${corUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                            {corUploading ? "Uploading..." : student?.cor_url ? "Update COR" : "Upload COR"}
                                            <input
                                                type="file"
                                                accept=".pdf,.png,.jpg,.jpeg"
                                                onChange={handleCorUpload}
                                                disabled={corUploading}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t">
                        <label className="block text-sm font-medium text-muted-foreground mb-3">Social Links</label>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-20 text-sm text-muted-foreground">Facebook</span>
                                <input
                                    type="url"
                                    value={socialLinks.facebook}
                                    onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="https://facebook.com/username"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-20 text-sm text-muted-foreground">Twitter (X)</span>
                                <input
                                    type="url"
                                    value={socialLinks.twitter}
                                    onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="https://twitter.com/username"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-20 text-sm text-muted-foreground">LinkedIn</span>
                                <input
                                    type="url"
                                    value={socialLinks.linkedin}
                                    onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="https://linkedin.com/in/username"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 flex justify-end">
                        <LoadingButton
                            type="submit"
                            isLoading={saving}
                            loadingText="Saving…"
                            disabled={saving || uploading}
                            className="bg-primary text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            Save Changes
                        </LoadingButton>
                    </div>
                </form>
            </div>

            {corViewing && (
                <DocumentViewerModal
                    fileUrl={corViewing.url}
                    fileName={corViewing.name}
                    onClose={() => setCorViewing(null)}
                />
            )}
        </div>
    );
}
