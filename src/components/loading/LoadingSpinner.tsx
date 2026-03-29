"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

interface LoadingSpinnerProps {
    size?: SpinnerSize;
    label?: string;
    className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-10 w-10",
};

export function LoadingSpinner({ size = "md", label, className }: LoadingSpinnerProps) {
    return (
        <span
            role="status"
            aria-live="polite"
            aria-label={label ?? "Loading…"}
            className={cn("inline-flex items-center gap-2", className)}
        >
            <Loader2 className={cn("animate-spin text-current", sizeClasses[size])} aria-hidden="true" />
            {label && <span className="text-sm text-muted-foreground">{label}</span>}
        </span>
    );
}
