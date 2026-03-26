"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { updateOrganization } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/client";

interface EditOrgDialogProps {
    org: {
        id: string;
        name: string;
        description: string | null;
        visibility: string;
        logo_url?: string | null;
        cover_photo_url?: string | null;
        mission?: string | null;
        vision?: string | null;
        core_values?: string | null;
    };
}

export default function EditOrgDialog({ org }: EditOrgDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [logoUrl, setLogoUrl] = useState(org.logo_url || "");
    const [coverPhotoUrl, setCoverPhotoUrl] = useState(org.cover_photo_url || "");
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [mounted, setMounted] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') {
        if (!event.target.files || event.target.files.length === 0) return;

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${type}_${Math.random()}.${fileExt}`;

        try {
            if (type === 'logo') setUploadingLogo(true);
            else setUploadingCover(true);

            const { error: uploadError } = await supabase.storage
                .from('organization-assets')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('organization-assets').getPublicUrl(fileName);

            if (type === 'logo') setLogoUrl(data.publicUrl);
            else setCoverPhotoUrl(data.publicUrl);
        } catch (error) {
            console.error(`Error uploading ${type}:`, error);
            setError(`Error uploading ${type} image`);
        } finally {
            if (type === 'logo') setUploadingLogo(false);
            else setUploadingCover(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const formData = new FormData(e.currentTarget);
            formData.set("logo_url", logoUrl);
            formData.set("cover_photo_url", coverPhotoUrl);

            await updateOrganization(formData);
            setOpen(false);
            window.location.reload();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update organization");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="px-3 py-1.5 rounded-lg border text-xs font-medium hover:bg-accent transition-colors flex items-center gap-1.5"
            >
                ✏️ Edit
            </button>

            {open && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <div className="relative bg-white border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="h-2 bg-gradient-to-r from-[#C9A227] to-[#800000] rounded-t-2xl" />
                        <div className="p-6 sm:p-8">
                            <h2 className="text-2xl font-bold mb-1 text-gray-900">Edit Organization</h2>
                            <p className="text-sm text-gray-500 mb-8 pb-4 border-b">
                                Update organization details, images, and core statements.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <input type="hidden" name="id" value={org.id} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Organization Name <span className="text-[#800000]">*</span>
                                            </label>
                                            <input
                                                name="name"
                                                required
                                                defaultValue={org.name}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                                            <textarea
                                                name="description"
                                                rows={3}
                                                defaultValue={org.description || ""}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Visibility Level</label>
                                            <select
                                                name="visibility"
                                                defaultValue={org.visibility}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors"
                                            >
                                                <option value="public">Public (Visible to everyone)</option>
                                                <option value="private">Private (Invite only)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column - Images */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Logo</label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                                                    {logoUrl ? (
                                                        <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[#C9A227] text-2xl">🏢</span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(e, 'logo')}
                                                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C9A227]/10 file:text-[#800000] hover:file:bg-[#C9A227]/20 transition-all cursor-pointer"
                                                    />
                                                    {uploadingLogo && <p className="text-xs text-[#800000] mt-1">Uploading logo...</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Banner</label>
                                            <div className="w-full h-24 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden mb-3 relative group">
                                                {coverPhotoUrl ? (
                                                    <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover group-hover:brightness-90 transition-all" />
                                                ) : (
                                                    <span className="text-gray-400 text-sm">Upload a cover image</span>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, 'cover')}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            {uploadingCover && <p className="text-xs text-[#800000]">Uploading cover photo...</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Full width text areas */}
                                <div className="space-y-5 pt-4 border-t">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Mission</label>
                                        <textarea name="mission" defaultValue={org.mission || ""} rows={2} className="w-full px-4 py-3 text-sm border border-gray-300 bg-gray-50 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Vision</label>
                                        <textarea name="vision" defaultValue={org.vision || ""} rows={2} className="w-full px-4 py-3 text-sm border border-gray-300 bg-gray-50 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Core Values</label>
                                        <textarea name="core_values" defaultValue={org.core_values || ""} rows={2} className="w-full px-4 py-3 text-sm border border-gray-300 bg-gray-50 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors" />
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-sm font-medium text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100 flex items-center gap-2">
                                        <span className="text-lg">⚠️</span> {error}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-6 border-t mt-8">
                                    <button
                                        type="submit"
                                        disabled={loading || uploadingLogo || uploadingCover}
                                        className="flex-1 px-4 py-3 rounded-xl bg-[#800000] text-white text-sm font-bold shadow-md hover:bg-[#600000] focus:ring-4 focus:ring-[#800000]/20 transition-all disabled:opacity-50"
                                    >
                                        {loading ? "Saving..." : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
                , document.body)}
        </>
    );
}
