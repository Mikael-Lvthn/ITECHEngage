"use client";

import { useEffect, useState } from "react";
import { updateProfile } from "@/lib/actions/profile";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";
import { LoadingButton } from "@/components/loading/LoadingButton";

export default function ProfilePage() {
    const [profile, setProfile] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string>("");
    const [socialLinks, setSocialLinks] = useState({ facebook: "", twitter: "", linkedin: "" });

    const supabase = createClient();
    const { showToast } = useToast();

    useEffect(() => {
        async function loadProfile() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
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
        } catch (error: any) {
            console.error(error);
            showToast(error.message || "Failed to update profile", "error");
        } finally {
            setSaving(false);
        }
    }

    if (loading) return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="animate-pulse space-y-4">
                <div className="h-8 bg-gray-200 rounded w-48" />
                <div className="bg-white rounded-xl border p-6 space-y-4">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gray-200" />
                        <div className="space-y-2">
                            <div className="h-5 bg-gray-200 rounded w-32" />
                            <div className="h-4 bg-gray-200 rounded w-48" />
                        </div>
                    </div>
                    <div className="h-10 bg-gray-200 rounded" />
                    <div className="h-24 bg-gray-200 rounded" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Edit Profile</h1>

            <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="mb-6 flex items-center gap-6">
                    <div className="relative">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border" />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 border">
                                No Avatar
                            </div>
                        )}
                        <label className="absolute bottom-0 right-0 bg-[#800000] text-white p-1.5 rounded-full cursor-pointer hover:bg-[#600000] transition-colors">
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
                        <p className="text-sm text-gray-500">{profile?.email}</p>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">{profile?.role}</p>
                        {uploading && <p className="text-sm text-[#C9A227] mt-2">Uploading...</p>}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="full_name"
                            defaultValue={profile?.full_name}
                            required
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                        <textarea
                            name="bio"
                            defaultValue={profile?.bio || ""}
                            rows={4}
                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                            placeholder="Tell us about yourself..."
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                name="phone_number"
                                defaultValue={profile?.phone_number || ""}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                placeholder="+63 9XX XXX XXXX"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
                            <input
                                type="url"
                                name="website_url"
                                defaultValue={profile?.website_url || ""}
                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                placeholder="https://yourwebsite.com"
                            />
                        </div>
                    </div>

                    {student && (
                        <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                                <svg className="w-4 h-4 text-[#800000]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Student Information
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">School Email</label>
                                    <input
                                        type="email"
                                        name="school_email"
                                        defaultValue={student?.school_email || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        placeholder="student@iskolar.pup.edu.ph"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Personal Email</label>
                                    <input
                                        type="email"
                                        name="personal_email"
                                        defaultValue={student?.personal_email || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        placeholder="name@gmail.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Contact Number</label>
                                    <input
                                        type="tel"
                                        name="contact_number"
                                        defaultValue={student?.contact_number || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        placeholder="+63 9XX XXX XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">LRN (Learner Reference Number)</label>
                                    <input
                                        type="text"
                                        name="lrn"
                                        defaultValue={student?.lrn || ""}
                                        maxLength={12}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        placeholder="12-digit LRN"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Student Number</label>
                                    <input
                                        type="text"
                                        name="student_number"
                                        defaultValue={student?.student_number || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        placeholder="20XX-XXXXX-MN-X"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Program</label>
                                    <input
                                        type="text"
                                        name="program"
                                        defaultValue={student?.program || ""}
                                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                        placeholder="BSIT, BSCS, etc."
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700 mb-3">Social Links</label>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <span className="w-20 text-sm text-gray-500">Facebook</span>
                                <input
                                    type="url"
                                    value={socialLinks.facebook}
                                    onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                    placeholder="https://facebook.com/username"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-20 text-sm text-gray-500">Twitter (X)</span>
                                <input
                                    type="url"
                                    value={socialLinks.twitter}
                                    onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
                                    placeholder="https://twitter.com/username"
                                />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-20 text-sm text-gray-500">LinkedIn</span>
                                <input
                                    type="url"
                                    value={socialLinks.linkedin}
                                    onChange={(e) => setSocialLinks({ ...socialLinks, linkedin: e.target.value })}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]"
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
                            className="bg-[#800000] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#600000] disabled:opacity-50 transition-colors"
                        >
                            Save Changes
                        </LoadingButton>
                    </div>
                </form>
            </div>
        </div>
    );
}
