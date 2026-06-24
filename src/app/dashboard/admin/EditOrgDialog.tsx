"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
        category_id?: string | null;
    };
}

interface Category {
    id: string;
    name: string;
}

export default function EditOrgDialog({ org }: EditOrgDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [categories, setCategories] = useState<Category[]>([]);

    const [logoUrl, setLogoUrl] = useState(org.logo_url || "");
    const [coverPhotoUrl, setCoverPhotoUrl] = useState(org.cover_photo_url || "");
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [mounted, setMounted] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        if (open) {
            fetchCategories();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function fetchCategories() {
        const { data, error: _error } = await supabase
            .from("organization_categories")
            .select("id, name")
            .order("name");

        if (data) setCategories(data);
    }

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
                    <div className="relative bg-card border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="h-2 bg-gradient-to-r from-[#C9A227] to-[#800000] rounded-t-2xl" />
                        <div className="p-6 sm:p-8">
                            <h2 className="text-2xl font-bold mb-1 text-foreground">Edit Organization</h2>
                            <p className="text-sm text-muted-foreground mb-8 pb-4 border-b">
                                Update organization details, images, and core statements.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <input type="hidden" name="id" value={org.id} />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-muted-foreground mb-2">
                                                Organization Name <span className="text-primary">*</span>
                                            </label>
                                            <input
                                                name="name"
                                                required
                                                defaultValue={org.name}
                                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Description</label>
                                            <textarea
                                                name="description"
                                                rows={3}
                                                defaultValue={org.description || ""}
                                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Organization Category</label>
                                            <select
                                                name="category_id"
                                                defaultValue={org.category_id || ""}
                                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                            >
                                                <option value="">No Category</option>
                                                {categories.map((cat) => (
                                                    <option key={cat.id} value={cat.id}>
                                                        {cat.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Visibility Level</label>
                                            <select
                                                name="visibility"
                                                defaultValue={org.visibility}
                                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                                            >
                                                <option value="public">Public (Visible to everyone)</option>
                                                <option value="private">Private (Invite only)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column - Images */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Logo</label>
                                            <div className="flex items-center gap-4">
                                                <div className="relative w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                    {logoUrl ? (
                                                        <Image src={logoUrl} alt="Logo" fill className="object-cover" />
                                                    ) : (
                                                        <span className="text-gold text-2xl">🏢</span>
                                                    )}
                                                </div>
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => handleFileUpload(e, 'logo')}
                                                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gold/10 file:text-primary hover:file:bg-gold/20 transition-all cursor-pointer"
                                                    />
                                                    {uploadingLogo && <p className="text-xs text-primary mt-1">Uploading logo...</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-muted-foreground mb-2">Cover Banner</label>
                                            <div className="w-full h-24 rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden mb-3 relative group">
                                                {coverPhotoUrl ? (
                                                    <Image src={coverPhotoUrl} alt="Cover" fill className="object-cover group-hover:brightness-90 transition-all" />
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Upload a cover image</span>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleFileUpload(e, 'cover')}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            {uploadingCover && <p className="text-xs text-primary">Uploading cover photo...</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Full width text areas */}
                                <div className="space-y-5 pt-4 border-t">
                                    <div>
                                        <label className="block text-sm font-semibold text-muted-foreground mb-2">Mission</label>
                                        <textarea name="mission" defaultValue={org.mission || ""} rows={2} className="w-full px-4 py-3 text-sm border border-border bg-muted rounded-xl focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-muted-foreground mb-2">Vision</label>
                                        <textarea name="vision" defaultValue={org.vision || ""} rows={2} className="w-full px-4 py-3 text-sm border border-border bg-muted rounded-xl focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-muted-foreground mb-2">Core Values</label>
                                        <textarea name="core_values" defaultValue={org.core_values || ""} rows={2} className="w-full px-4 py-3 text-sm border border-border bg-muted rounded-xl focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors" />
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
                                        className="flex-1 px-4 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-md hover:bg-primary/90 focus:ring-4 focus:ring-primary/20 transition-all disabled:opacity-50"
                                    >
                                        {loading ? "Saving..." : "Save Changes"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-6 py-3 rounded-xl border-2 border-border text-muted-foreground text-sm font-bold hover:bg-muted hover:border-border transition-all"
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
