"use client";

import { useState } from "react";
import { createNews, updateNewsStatus, deleteNews } from "@/lib/actions/news";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toast";

interface NewsItem {
    id: string;
    title: string;
    content: string;
    image_url: string;
    status: string;
    created_at: string;
    organizations?: { name: string, logo_url?: string };
    creator?: { full_name: string };
    organization_id?: string;
}

interface Props {
    initialNews: NewsItem[];
    userRole: "admin" | "officer";
    userOrganizations?: { id: string; name: string }[];
}

export default function NewsManagerClient({ initialNews, userRole, userOrganizations }: Props) {
    const [news, setNews] = useState(initialNews);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const supabase = createClient();
    const { showToast } = useToast();

    const handleCreateWrapper = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            formData.append("image_url", imageUrl);
            await createNews(formData);
            showToast("News submitted for accreditation!", "success");
            setIsCreating(false);
            window.location.reload();
        } catch (error: any) {
            showToast(error.message || "Failed to submit news", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        try {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `news_${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('news-images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('news-images').getPublicUrl(fileName);
            setImageUrl(data.publicUrl);
        } catch (error) {
            console.error(error);
            showToast("Error uploading image", "error");
        } finally {
            setUploading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: any) => {
        try {
            setLoading(true);
            await updateNewsStatus(id, newStatus);
            setNews(news.map(n => n.id === id ? { ...n, status: newStatus } : n));
        } catch (error: any) {
            showToast("Failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this news article?")) return;
        try {
            setLoading(true);
            await deleteNews(id);
            setNews(news.filter(n => n.id !== id));
        } catch (error: any) {
            showToast("Failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: any = {
            draft: "bg-gray-100 text-gray-700 border-gray-200",
            pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
            published: "bg-green-100 text-green-800 border-green-200",
            rejected: "bg-red-100 text-red-800 border-red-200"
        };
        const color = colors[status] || colors.draft;
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${color}`}>{status}</span>;
    };

    return (
        <div>
            {userRole === "officer" && !isCreating && (
                <button
                    onClick={() => setIsCreating(true)}
                    className="mb-6 px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] font-medium transition-colors"
                >
                    + Create News Article
                </button>
            )}

            {isCreating && userRole === "officer" && (
                <div className="mb-8 bg-white border rounded-xl p-6 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">New Article</h2>
                    <form onSubmit={handleCreateWrapper} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Organization</label>
                            <select name="organization_id" required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[#800000] focus:border-[#800000]">
                                {userOrganizations?.map(org => (
                                    <option key={org.id} value={org.id}>{org.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Title</label>
                            <input name="title" required className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[#800000] focus:border-[#800000]" placeholder="Exciting announcement..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Cover Image</label>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm mb-2" />
                            {uploading && <p className="text-xs text-[#C9A227]">Uploading image...</p>}
                            {imageUrl && <img src={imageUrl} alt="Preview" className="h-32 object-cover rounded-lg border bg-gray-50" />}
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Content</label>
                            <textarea name="content" required rows={6} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-[#800000] focus:border-[#800000]" placeholder="Write the news content here..." />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button type="submit" disabled={loading || uploading} className="px-5 py-2 bg-[#800000] text-white rounded-lg font-medium hover:bg-[#600000] disabled:opacity-50">
                                {loading ? "Submiting..." : "Submit for Review"}
                            </button>
                            <button type="button" onClick={() => setIsCreating(false)} className="px-5 py-2 border rounded-lg font-medium hover:bg-gray-50">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {news.length === 0 ? (
                    <div className="p-12 text-center border border-dashed rounded-xl bg-gray-50">
                        <div className="w-16 h-16 mx-auto rounded-xl bg-[#800000]/10 flex items-center justify-center mb-4">
                            <span className="text-3xl">📰</span>
                        </div>
                        <p className="font-semibold text-gray-700 mb-1">
                            {userRole === "admin" ? "No news pending review" : "No news articles yet"}
                        </p>
                        <p className="text-sm text-gray-500">
                            {userRole === "admin" ? "All clear! News articles will appear here when submitted by officers." : "Create your first news article to get started."}
                        </p>
                    </div>
                ) : (
                    news.map(item => (
                        <div key={item.id} className="bg-white border rounded-xl p-5 flex flex-col md:flex-row gap-5">
                            {item.image_url ? (
                                <img src={item.image_url} alt="Cover" className="w-full md:w-48 h-32 object-cover rounded-lg border bg-gray-50 shrink-0" />
                            ) : (
                                <div className="w-full md:w-48 h-32 bg-gray-100 border rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                                    No Image
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {getStatusBadge(item.status)}
                                            <span className="text-xs text-gray-500 font-medium">{item.organizations?.name}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 border-none m-0 p-0 line-clamp-1">{item.title}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mt-1 whitespace-pre-wrap">{item.content}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="shrink-0 flex gap-2">
                                        {userRole === "admin" && item.status === "pending" && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(item.id, "published")} disabled={loading} className="px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded hover:bg-green-700 disabled:opacity-50">Approve</button>
                                                <button onClick={() => handleStatusUpdate(item.id, "rejected")} disabled={loading} className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded hover:bg-red-700 disabled:opacity-50">Reject</button>
                                            </>
                                        )}
                                        {userRole === "officer" && (
                                            <button onClick={() => handleDelete(item.id)} disabled={loading} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded hover:bg-red-50 disabled:opacity-50">Delete</button>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 mt-3 pt-3 border-t">
                                    Submitted {new Date(item.created_at).toLocaleString()}
                                    {item.creator && ` by ${item.creator.full_name}`}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
