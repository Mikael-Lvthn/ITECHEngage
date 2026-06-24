"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { submitFeedback } from "@/lib/actions/feedback";
import { useToast } from "@/components/Toast";
import { LoadingButton } from "@/components/loading/LoadingButton";
import { getErrorMessage } from "@/lib/utils/error";

const CATEGORIES = [
    { value: "feedback", label: "General Feedback" },
    { value: "suggestion", label: "Suggestion" },
    { value: "bug", label: "Bug Report" },
    { value: "other", label: "Other" },
];

const inputClasses =
    "w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all";

export function FeedbackForm({ isLoggedIn }: { isLoggedIn: boolean }) {
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const { showToast } = useToast();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = e.currentTarget;
        setLoading(true);
        try {
            await submitFeedback(new FormData(form));
            form.reset();
            setDone(true);
            showToast("Thank you! Your feedback has been submitted.", "success");
        } catch (err) {
            showToast(getErrorMessage(err) || "Failed to submit feedback", "error");
        } finally {
            setLoading(false);
        }
    }

    if (done) {
        return (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center dark:border-green-500/30 dark:bg-green-500/10">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3 dark:bg-green-500/20">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-300" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">Feedback received</h3>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    Thank you for helping us improve ITECHEngage.
                </p>
                <button
                    type="button"
                    onClick={() => setDone(false)}
                    className="mt-4 text-sm font-medium text-primary hover:underline cursor-pointer"
                >
                    Submit another
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {!isLoggedIn && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="fb-name" className="block text-sm font-medium text-foreground mb-1">
                            Name <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <input id="fb-name" name="name" type="text" className={inputClasses} placeholder="Your name" />
                    </div>
                    <div>
                        <label htmlFor="fb-email" className="block text-sm font-medium text-foreground mb-1">
                            Email <span className="text-muted-foreground font-normal">(optional)</span>
                        </label>
                        <input id="fb-email" name="email" type="email" className={inputClasses} placeholder="you@example.com" />
                    </div>
                </div>
            )}

            <div>
                <label htmlFor="fb-category" className="block text-sm font-medium text-foreground mb-1">
                    Category
                </label>
                <select id="fb-category" name="category" defaultValue="feedback" className={inputClasses}>
                    {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                </select>
            </div>

            <div>
                <label htmlFor="fb-message" className="block text-sm font-medium text-foreground mb-1">
                    Your Message
                </label>
                <textarea
                    id="fb-message"
                    name="message"
                    required
                    rows={6}
                    maxLength={5000}
                    className={`${inputClasses} resize-none`}
                    placeholder="Share your feedback, suggestion, or the issue you ran into…"
                />
            </div>

            <LoadingButton
                type="submit"
                isLoading={loading}
                loadingText="Sending…"
                className="inline-flex items-center justify-center w-full sm:w-auto px-6 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
            >
                Send Feedback
            </LoadingButton>
        </form>
    );
}
