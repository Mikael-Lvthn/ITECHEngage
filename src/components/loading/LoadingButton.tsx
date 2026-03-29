"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean;
    loadingText?: string;
}

export const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
    function LoadingButton(
        { isLoading = false, loadingText, children, disabled, className, ...props },
        ref
    ) {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                aria-busy={isLoading}
                className={cn(className)}
                {...props}
            >
                {isLoading ? (
                    <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {loadingText ?? children}
                    </span>
                ) : (
                    children
                )}
            </button>
        );
    }
);
