"use client";

import { useState } from "react";
import { createNews, deleteNews, updateNewsStatus } from "@/lib/actions/news";
import { createClient } from "@/lib/supabase/client";
import { createEvent, deleteEvent, approveEvent, rejectEvent } from "@/lib/actions/events";
import LikeShareButtons from "@/components/LikeShareButtons";
import Link from "next/link";
import { useToast } from "@/components/Toast";

interface NewsItem {
    id: string;
    title: string;
    content: string;
    image_url: string;
    status: string;
    created_at: string;
    organizations?: { name: string };
}

interface EventItem {
    id: string;
    title: string;
    description: string;
    start_datetime: string;
    end_datetime: string;
    location: string;
    status: string;
    created_at: string;
    organizations?: { name: string };
}

interface Props {
    initialNews: NewsItem[];
    initialEvents: EventItem[];
    userOrganizations: { id: string; name: string }[];
    userRole: string;
    canCreate: boolean;
}

export default function NewsAndEventsClient({ initialNews, initialEvents, userOrganizations, userRole, canCreate }: Props) {
    const [activeTab, setActiveTab] = useState<"news" | "events" | "create">("news");
    const [creationType, setCreationType] = useState<"news" | "event">("news");

    const [news, setNews] = useState(initialNews);
    const [events, setEvents] = useState(initialEvents);

    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState("");

    const isAdmin = userRole === "admin";
    const supabase = createClient();
    const { showToast } = useToast();

    const handleNewsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            formData.append("image_url", imageUrl);
            await createNews(formData);
            showToast("News submitted for review!", "success");
            setActiveTab("news");
            window.location.reload();
        } catch (error: any) {
            showToast(error.message || "Failed to submit news", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            await createEvent({
                organizationId: formData.get("organization_id") as string,
                title: formData.get("title") as string,
                description: formData.get("description") as string,
                location: formData.get("location") as string,
                startDatetime: formData.get("start_datetime") as string,
                endDatetime: formData.get("end_datetime") as string,
            });
            showToast("Event created successfully!", "success");
            setActiveTab("events");
            window.location.reload();
        } catch (error: any) {
            showToast(error.message || "Failed to create event", "error");
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

    const handleDeleteNews = async (id: string) => {
        if (!confirm("Delete this news article?")) return;
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

    const handleDeleteEvent = async (id: string) => {
        if (!confirm("Delete this event?")) return;
        try {
            setLoading(true);
            await deleteEvent(id);
            setEvents(events.filter(e => e.id !== id));
        } catch (error: any) {
            showToast("Failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveNews = async (id: string) => {
        try {
            setLoading(true);
            await updateNewsStatus(id, "published");
            setNews(news.map(n => n.id === id ? { ...n, status: "published" } : n));
        } catch (error: any) {
            showToast("Failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRejectNews = async (id: string) => {
        try {
            setLoading(true);
            await updateNewsStatus(id, "rejected");
            setNews(news.map(n => n.id === id ? { ...n, status: "rejected" } : n));
        } catch (error: any) {
            showToast("Failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleApproveEvent = async (id: string) => {
        try {
            setLoading(true);
            await approveEvent(id);
            setEvents(events.map(e => e.id === id ? { ...e, status: "published" } : e));
        } catch (error: any) {
            showToast("Failed: " + error.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleRejectEvent = async (id: string) => {
        try {
            setLoading(true);
            await rejectEvent(id);
            setEvents(events.map(e => e.id === id ? { ...e, status: "cancelled" } : e));
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
            rejected: "bg-red-100 text-red-800 border-red-200",
            cancelled: "bg-red-100 text-red-800 border-red-200"
        };
        const color = colors[status] || colors.draft;
        return <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color} border`}>{status}</span>;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            {/* Header Navigation */}
            <div className="flex border-b">
                <button
                    onClick={() => setActiveTab("news")}
                    className={`flex-1 py-4 text-sm font-semibold text-center transition-colors ${activeTab === 'news' ? 'text-[#800000] border-b-2 border-[#800000] bg-red-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📰 News
                </button>
                <button
                    onClick={() => setActiveTab("events")}
                    className={`flex-1 py-4 text-sm font-semibold text-center transition-colors ${activeTab === 'events' ? 'text-[#800000] border-b-2 border-[#800000] bg-red-50/50' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    📅 Events
                </button>
                {canCreate && (
                    <div className="px-4 py-3 border-l bg-gray-50 flex items-center justify-center min-w-[150px]">
                        <button
                            onClick={() => setActiveTab("create")}
                            className="w-full px-4 py-2 bg-[#800000] text-white rounded-lg text-sm font-bold shadow-sm hover:bg-[#600000] transition-colors"
                        >
                            + Create New
                        </button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6">

                {/* ---------- CREATE MODE --------------------------------------- */}
                {activeTab === "create" && canCreate && (
                    <div className="max-w-2xl mx-auto animate-scale-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold">What would you like to create?</h2>
                            <div className="flex bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setCreationType("news")}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${creationType === 'news' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    News
                                </button>
                                <button
                                    onClick={() => setCreationType("event")}
                                    className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-colors ${creationType === 'event' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    Event
                                </button>
                            </div>
                        </div>

                        {creationType === "news" ? (
                            <form onSubmit={handleNewsSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Posting for Organization <span className="text-[#800000]">*</span></label>
                                        <select name="organization_id" required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors">
                                            {userOrganizations.map(org => (
                                                <option key={org.id} value={org.id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Headline <span className="text-[#800000]">*</span></label>
                                        <input name="title" required placeholder="Announcement title..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cover Image</label>
                                        <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm mb-2" />
                                        {uploading && <p className="text-xs text-[#C9A227]">Uploading image...</p>}
                                        {imageUrl && <img src={imageUrl} alt="Preview" className="h-32 object-cover rounded-xl border bg-gray-100" />}
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">News Content <span className="text-[#800000]">*</span></label>
                                        <textarea name="content" required rows={6} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors" placeholder="Write full details here..." />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4 border-t">
                                    <button type="submit" disabled={loading || uploading} className="px-6 py-2.5 bg-[#800000] text-white rounded-xl font-bold shadow-sm hover:bg-[#600000] disabled:opacity-50 transition-colors">
                                        {loading ? (
                                            <span className="inline-flex items-center gap-2">
                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Submitting...
                                            </span>
                                        ) : "Submit News for Review"}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleEventSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hosting Organization <span className="text-[#800000]">*</span></label>
                                        <select name="organization_id" required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors">
                                            {userOrganizations.map(org => (
                                                <option key={org.id} value={org.id}>{org.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Title <span className="text-[#800000]">*</span></label>
                                        <input name="title" required placeholder="Event name..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Location <span className="text-[#800000]">*</span></label>
                                        <input name="location" required placeholder="Where will this happen?" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Date & Time <span className="text-[#800000]">*</span></label>
                                        <input type="datetime-local" name="start_datetime" required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Date & Time <span className="text-[#800000]">*</span></label>
                                        <input type="datetime-local" name="end_datetime" required className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description <span className="text-[#800000]">*</span></label>
                                        <textarea name="description" required rows={4} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-[#800000]/50 transition-colors" placeholder="Provide event details..." />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4 border-t">
                                    <button type="submit" disabled={loading} className="px-6 py-2.5 bg-[#800000] text-white rounded-xl font-bold shadow-sm hover:bg-[#600000] disabled:opacity-50 transition-colors">
                                        {loading ? (
                                            <span className="inline-flex items-center gap-2">
                                                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                </svg>
                                                Submitting...
                                            </span>
                                        ) : "Submit Event for Approval"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}


                {/* ---------- NEWS VIEW --------------------------------------- */}
                {activeTab === "news" && (
                    <div className="space-y-4 animate-scale-in">
                        {news.length === 0 ? (
                            <div className="p-12 text-center border border-dashed rounded-xl bg-gray-50">
                                <div className="w-16 h-16 mx-auto rounded-xl bg-[#800000]/10 flex items-center justify-center mb-4">
                                    <span className="text-3xl">📰</span>
                                </div>
                                <p className="font-semibold text-gray-700 mb-1">No news articles yet</p>
                                <p className="text-sm text-gray-500">News submitted by officers will appear here once published.</p>
                            </div>
                        ) : (
                            news.map(item => (
                                <div key={item.id} className="bg-white border rounded-xl p-5 flex flex-col md:flex-row gap-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
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
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    {getStatusBadge(item.status)}
                                                    <span className="text-xs text-gray-500 font-medium">{item.organizations?.name}</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 border-none m-0 p-0 line-clamp-1">{item.title}</h3>
                                                <p className="text-sm text-gray-500 line-clamp-2 mt-1 whitespace-pre-wrap">{item.content}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isAdmin && item.status === "pending" && (
                                                    <>
                                                        <button onClick={() => handleApproveNews(item.id)} disabled={loading} className="px-3 py-1.5 border border-green-200 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50">
                                                            ✓ Approve
                                                        </button>
                                                        <button onClick={() => handleRejectNews(item.id)} disabled={loading} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                                                            ✕ Reject
                                                        </button>
                                                    </>
                                                )}
                                                {canCreate && (
                                                    <button onClick={() => handleDeleteNews(item.id)} disabled={loading} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-400 mt-4 pt-4 border-t">
                                            <span>Submitted {new Date(item.created_at).toLocaleString()}</span>
                                            <div className="flex items-center gap-2">
                                                <LikeShareButtons
                                                    itemId={item.id}
                                                    itemType="news"
                                                    initialLikeCount={0}
                                                    initialLiked={false}
                                                    title={item.title}
                                                />
                                                <Link
                                                    href={`/dashboard/news/${item.id}`}
                                                    className="text-xs text-[#800000] font-semibold hover:underline"
                                                >
                                                    View →
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}


                {/* ---------- EVENTS VIEW --------------------------------------- */}
                {activeTab === "events" && (
                    <div className="space-y-4 animate-scale-in">
                        {events.length === 0 ? (
                            <div className="p-12 text-center border border-dashed rounded-xl bg-gray-50">
                                <div className="w-16 h-16 mx-auto rounded-xl bg-[#800000]/10 flex items-center justify-center mb-4">
                                    <span className="text-3xl">📅</span>
                                </div>
                                <p className="font-semibold text-gray-700 mb-1">No events scheduled</p>
                                <p className="text-sm text-gray-500">Upcoming events from organizations will appear here.</p>
                            </div>
                        ) : (
                            events.map(ev => (
                                <div key={ev.id} className="bg-white border rounded-xl p-5 flex flex-col md:flex-row gap-5 hover:shadow-md hover:-translate-y-0.5 transition-all">
                                    <div className="w-20 h-20 rounded-xl bg-red-50 text-red-700 border border-red-100 flex flex-col items-center justify-center shrink-0">
                                        <span className="text-xs font-bold uppercase">{new Date(ev.start_datetime).toLocaleString('default', { month: 'short' })}</span>
                                        <span className="text-2xl font-black leading-none mt-1">{new Date(ev.start_datetime).getDate()}</span>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    {getStatusBadge(ev.status)}
                                                    <span className="text-xs text-gray-500 font-medium">{ev.organizations?.name}</span>
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 border-none m-0 p-0 line-clamp-1">{ev.title}</h3>
                                                <p className="text-sm text-gray-500 line-clamp-2 mt-1 whitespace-pre-wrap">{ev.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {isAdmin && (ev.status === "draft" || ev.status === "pending") && (
                                                    <>
                                                        <button onClick={() => handleApproveEvent(ev.id)} disabled={loading} className="px-3 py-1.5 border border-green-200 text-green-700 text-xs font-semibold rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50">
                                                            ✓ Approve
                                                        </button>
                                                        <button onClick={() => handleRejectEvent(ev.id)} disabled={loading} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
                                                            ✕ Reject
                                                        </button>
                                                    </>
                                                )}
                                                {canCreate && (
                                                    <button onClick={() => handleDeleteEvent(ev.id)} disabled={loading} className="px-3 py-1.5 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">Delete</button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500 font-medium mt-4 pt-4 border-t">
                                            <div className="flex gap-4">
                                                <span>🕐 {new Date(ev.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                <span>📍 {ev.location}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <LikeShareButtons
                                                    itemId={ev.id}
                                                    itemType="event"
                                                    initialLikeCount={0}
                                                    initialLiked={false}
                                                    title={ev.title}
                                                />
                                                <Link
                                                    href={`/dashboard/events/${ev.id}`}
                                                    className="text-xs text-[#800000] font-semibold hover:underline"
                                                >
                                                    View →
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
