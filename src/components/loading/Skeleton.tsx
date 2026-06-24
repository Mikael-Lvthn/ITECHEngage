import { cn } from "@/lib/utils";

/**
 * Low-fidelity placeholder block with a token-driven shimmer.
 * Use it to foreshadow impending content during in-app navigation —
 * lighter and less jarring than the full-screen BrandedLoader, which is
 * reserved for the initial portal entry.
 *
 * Build composed skeletons by arranging these to mirror the real layout.
 */
export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            aria-hidden="true"
            className={cn("loading-skeleton rounded-md", className)}
        />
    );
}
