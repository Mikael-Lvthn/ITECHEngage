"use client";

import { LoadingSpinner } from "./LoadingSpinner";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
    label?: string;
    className?: string;
}

export function PageLoader({ label = "Loading…", className }: PageLoaderProps) {
    return (
        <div
            className={cn(
                "flex min-h-[40vh] w-full flex-col items-center justify-center gap-4",
                className
            )}
            role="status"
            aria-live="polite"
            aria-label={label}
        >
        <LoadingSpinner size="lg" aria-hidden="true" className="text-[#800000]" />
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
    );
}
