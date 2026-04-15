"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createOrganization } from "@/lib/actions/admin";
import { createClient } from "@/lib/supabase/client";

export default function CreateOrgDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<string>("");
    const [studentSearch, setStudentSearch] = useState("");
    const [showStudentDropdown, setShowStudentDropdown] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [logoUrl, setLogoUrl] = useState("");
    const [coverPhotoUrl, setCoverPhotoUrl] = useState("");
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [mounted, setMounted] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        setMounted(true);
        if (open) {
            fetchStudents();
        }
    }, [open]);

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setShowStudentDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    async function fetchStudents() {
        // Fetch ALL students system-wide (not just those in an org)
        const { data, error } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("role", "student")
            .order("full_name");

        if (data) setStudents(data);
    }

    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return students;
        const q = studentSearch.toLowerCase();
        return students.filter(
            (s) =>
                s.full_name?.toLowerCase().includes(q) ||
                s.email?.toLowerCase().includes(q)
        );
    }, [students, studentSearch]);

    const selectedStudentName = useMemo(() => {
        if (!selectedStudent) return "";
        const found = students.find((s) => s.id === selectedStudent);
        return found ? `${found.full_name} (${found.email})` : "";
    }, [selectedStudent, students]);

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

        if (!logoUrl || !coverPhotoUrl) {
            setError("Logo and cover photo are required.");
            setLoading(false);
            return;
        }

        try {
            const formData = new FormData(e.currentTarget);
            if (selectedStudent) {
                formData.append("initial_student_id", selectedStudent);
            }
            formData.append("logo_url", logoUrl);
            formData.append("cover_photo_url", coverPhotoUrl);

            await createOrganization(formData);

            setOpen(false);
            // Reset form
            setLogoUrl("");
            setCoverPhotoUrl("");
            setSelectedStudent("");
            setStudentSearch("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create organization");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#800000] text-white text-sm font-medium hover:bg-[#600000] transition-colors"
            >
                Create Organization
            </button>

            {open && mounted && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
                    <div className="relative bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-scale-in">
                        <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227] rounded-t-2xl" />
                        <div className="p-6 sm:p-8">
                            <h2 className="text-2xl font-bold mb-1 text-foreground">Create New Organization</h2>
                            <p className="text-sm text-muted-foreground mb-8 pb-4 border-b border-border">
                                Initialize a fresh student organization space by providing essential details and aesthetics.
                            </p>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-foreground mb-2">
                                                Organization Name <span className="text-[#800000] dark:text-[#C9A227]">*</span>
                                            </label>
                                            <input
                                                name="name"
                                                required
                                                placeholder="e.g. Society of Computer Engineers"
                                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-foreground text-sm placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors"
                                            />
                                        </div>
                                        <div ref={dropdownRef} className="relative">
                                            <label className="block text-sm font-semibold text-foreground mb-2">
                                                Initial Student Officer <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                                            </label>
                                            {selectedStudent ? (
                                                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm">
                                                    <span className="flex-1 text-foreground truncate">{selectedStudentName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedStudent("");
                                                            setStudentSearch("");
                                                        }}
                                                        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ) : (
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    value={studentSearch}
                                                    onChange={(e) => {
                                                        setStudentSearch(e.target.value);
                                                        setShowStudentDropdown(true);
                                                    }}
                                                    onFocus={() => setShowStudentDropdown(true)}
                                                    placeholder="Search by name or email..."
                                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-foreground text-sm placeholder:text-muted-foreground focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors"
                                                />
                                            )}
                                            {showStudentDropdown && !selectedStudent && (
                                                <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-xl border border-border bg-popover shadow-lg">
                                                    {filteredStudents.length > 0 ? (
                                                        filteredStudents.slice(0, 20).map((student) => (
                                                            <button
                                                                type="button"
                                                                key={student.id}
                                                                onClick={() => {
                                                                    setSelectedStudent(student.id);
                                                                    setStudentSearch("");
                                                                    setShowStudentDropdown(false);
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 text-sm text-popover-foreground hover:bg-accent transition-colors border-b border-border last:border-0"
                                                            >
                                                                <span className="font-medium">{student.full_name}</span>
                                                                <span className="text-muted-foreground ml-2 text-xs">{student.email}</span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                                                            No students found
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-foreground mb-2">Visibility Level</label>
                                            <select
                                                name="visibility"
                                                defaultValue="public"
                                                className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-foreground text-sm focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors"
                                            >
                                                <option value="public">Public (Visible to everyone)</option>
                                                <option value="private">Private (Invite only)</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Right Column - Images */}
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-semibold text-foreground mb-2">Logo <span className="text-[#800000] dark:text-[#C9A227]">*</span></label>
                                            <div className="flex items-center gap-4">
                                                <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden shrink-0">
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
                                                        required={!logoUrl}
                                                        onChange={(e) => handleFileUpload(e, 'logo')}
                                                        className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#C9A227]/10 file:text-[#800000] dark:file:text-[#C9A227] hover:file:bg-[#C9A227]/20 transition-all cursor-pointer"
                                                    />
                                                    {uploadingLogo && <p className="text-xs text-[#800000] dark:text-[#C9A227] mt-1">Uploading logo...</p>}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-semibold text-foreground mb-2">Cover Banner <span className="text-[#800000] dark:text-[#C9A227]">*</span></label>
                                            <div className="w-full h-24 rounded-xl border-2 border-dashed border-border bg-muted/50 flex items-center justify-center overflow-hidden mb-3 relative group">
                                                {coverPhotoUrl ? (
                                                    <img src={coverPhotoUrl} alt="Cover" className="w-full h-full object-cover group-hover:brightness-90 transition-all" />
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">Upload a cover image</span>
                                                )}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    required={!coverPhotoUrl}
                                                    onChange={(e) => handleFileUpload(e, 'cover')}
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                />
                                            </div>
                                            {uploadingCover && <p className="text-xs text-[#800000] dark:text-[#C9A227]">Uploading cover photo...</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Full width text areas */}
                                <div className="space-y-5 pt-4 border-t border-border">
                                    <div>
                                        <label className="block text-sm font-semibold text-foreground mb-2">Mission <span className="text-[#800000] dark:text-[#C9A227]">*</span></label>
                                        <textarea name="mission" required rows={2} placeholder="State the organization's mission..." className="w-full px-4 py-3 text-sm border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground rounded-xl focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-foreground mb-2">Vision <span className="text-[#800000] dark:text-[#C9A227]">*</span></label>
                                        <textarea name="vision" required rows={2} placeholder="State the organization's vision..." className="w-full px-4 py-3 text-sm border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground rounded-xl focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-foreground mb-2">Core Values <span className="text-[#800000] dark:text-[#C9A227]">*</span></label>
                                        <textarea name="core_values" required rows={2} placeholder="e.g. Excellence, Integrity, Community" className="w-full px-4 py-3 text-sm border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground rounded-xl focus:bg-card focus:outline-none focus:ring-2 focus:ring-[#800000]/50 focus:border-[#800000] transition-colors" />
                                    </div>
                                </div>

                                {error && (
                                    <div className="text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2">
                                        <span className="text-lg">⚠️</span> {error}
                                    </div>
                                )}

                                <div className="flex items-center gap-3 pt-6 border-t border-border mt-8">
                                    <button
                                        type="submit"
                                        disabled={loading || uploadingLogo || uploadingCover}
                                        className="flex-1 px-4 py-3 rounded-xl bg-[#800000] text-white text-sm font-bold shadow-md hover:bg-[#600000] focus:ring-4 focus:ring-[#800000]/20 transition-all disabled:opacity-50"
                                    >
                                        {loading ? "Initializing..." : "Create Organization"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setOpen(false)}
                                        className="px-6 py-3 rounded-xl border-2 border-border text-foreground text-sm font-bold hover:bg-accent transition-all"
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
