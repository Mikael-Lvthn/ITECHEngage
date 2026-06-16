"use client";

interface AccreditationTimelineProps {
    status: string;
    submittedAt: string;
    reviewedAt?: string | null;
}

export default function AccreditationTimeline({ status, submittedAt, reviewedAt }: AccreditationTimelineProps) {
    const isApproved = status === "approved";
    const isRejected = status === "rejected" || status === "revalidation_required";
    
    // Status hierarchy
    const statuses = ["pending", "forwarded", "deliberating", "decision_received", "approved", "rejected", "revalidation_required"];
    const statusIndex = statuses.indexOf(status);
    
    const isStage2 = statusIndex >= 0 && status === "pending"; // Pending Admin Acknowledgment
    const isStage3 = statusIndex >= 1; // Forwarded
    const isStage4 = statusIndex >= 2; // Deliberating
    const isStage5 = statusIndex >= 3; // Decision Received
    const isStage6 = statusIndex >= 4; // Final decision

    return (
        <div className="relative space-y-4 before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {/* Application Submitted */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-4 border-background bg-[#800000] text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                    ✓
                </div>
                <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border bg-card shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">Application Submitted</h4>
                        <span className="text-xs text-muted-foreground">{new Date(submittedAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Officer prepared and submitted the required documents.</p>
                </div>
            </div>

            {/* Stage 3: Pending Admin Acknowledgment */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isStage2 ? 'bg-orange-500 animate-pulse text-white' : isStage3 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {isStage2 ? '⌛' : isStage3 ? '✓' : '·'}
                </div>
                <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border ${isStage3 ? 'bg-card' : 'bg-muted/50 border-dashed'} transition-colors`}>
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">Pending Admin Acknowledgment</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Admin needs to review the submission first — confirm it&apos;s complete, no missing files, correct academic year, correct cycle type — before it gets forwarded externally.
                    </p>
                </div>
            </div>

            {/* Stage 4: Forwarded to Commission */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${status === "forwarded" ? 'bg-orange-500 animate-pulse text-white' : isStage4 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {status === "forwarded" ? '⌛' : isStage4 ? '✓' : '·'}
                </div>
                <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border ${isStage4 ? 'bg-card' : 'bg-muted/50 border-dashed'} transition-colors`}>
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">Forwarded to Commission</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Admin acknowledged the submission and exported the package for the COSOA. The handoff has been made.
                    </p>
                </div>
            </div>

            {/* Stage 5: Awaiting Commission Review */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${status === "deliberating" ? 'bg-orange-500 animate-pulse text-white' : isStage5 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {status === "deliberating" ? '⌛' : isStage5 ? '✓' : '·'}
                </div>
                <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border ${isStage5 ? 'bg-card' : 'bg-muted/50 border-dashed'} transition-colors`}>
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">Awaiting Commission Review</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        The commission is deliberating. This happens entirely outside the system. No ETA.
                    </p>
                </div>
            </div>

            {/* Stage 6: Commission Decision Received */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${status === "decision_received" ? 'bg-orange-500 animate-pulse text-white' : isStage6 ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                    {status === "decision_received" ? '⌛' : isStage6 ? '✓' : '·'}
                </div>
                <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border ${isStage6 ? 'bg-card' : 'bg-muted/50 border-dashed'} transition-colors`}>
                    <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm">Commission Decision Received</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Admin has received the commission&apos;s verdict and is about to record it in the system.
                    </p>
                </div>
            </div>

            {/* Stage 7: Decision Recorded */}
            {(isApproved || isRejected) && (
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow ${isApproved ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                        {isApproved ? '✓' : '✕'}
                    </div>
                    <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2rem)] p-4 rounded-xl border bg-card shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm">Decision Recorded</h4>
                            {reviewedAt && <span className="text-xs text-muted-foreground">{new Date(reviewedAt).toLocaleDateString()}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isApproved ? "Accredited — features unlocked." : "Rejected or Revalidation Required."}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
