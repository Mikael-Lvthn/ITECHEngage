import { cn } from "@/lib/utils";

interface BrandedLoaderProps {
    /** Status text shown beneath the wordmark. */
    label?: string;
    /** Show the indeterminate progress bar. */
    showBar?: boolean;
    className?: string;
}

/**
 * Full-screen branded loading animation (converted from the Claude Design
 * "Loading animation for web portal" template).
 *
 * Colors are driven entirely by the app's CSS theme tokens, so it adapts to
 * light and pitch-black dark mode automatically — no `theme` prop needed.
 * Keyframes (itc-spin, itc-spin-rev, itc-breathe, itc-orbit, itc-bar, itc-dot)
 * and the reduced-motion overrides live in globals.css.
 */
export function BrandedLoader({
    label = "Loading your portal",
    showBar = true,
    className,
}: BrandedLoaderProps) {
    const accent = "var(--color-primary)";
    const gold = "var(--color-gold)";

    return (
        <div
            role="status"
            aria-live="polite"
            aria-label={label}
            className={cn(
                "fixed inset-0 flex items-center justify-center overflow-hidden bg-background",
                className
            )}
        >
            {/* Soft radial glow behind the mark */}
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(120% 90% at 50% 38%, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 60%)",
                }}
            />

            <div
                className="relative flex flex-col items-center"
                style={{ animation: "itc-fade .6s ease both" }}
            >
                {/* Rings + orbiting dot + logo */}
                <div className="relative flex h-[188px] w-[188px] items-center justify-center">
                    <div
                        className="itc-ring absolute inset-0 rounded-full"
                        style={{
                            background: `conic-gradient(from 0deg, transparent 0deg, ${accent} 70deg, ${gold} 180deg, transparent 250deg, transparent 360deg)`,
                            WebkitMask:
                                "radial-gradient(closest-side, transparent 78%, #000 79%)",
                            mask: "radial-gradient(closest-side, transparent 78%, #000 79%)",
                            animation: "itc-spin 2.4s linear infinite",
                        }}
                    />
                    <div
                        className="itc-ring2 absolute rounded-full"
                        style={{
                            inset: "14px",
                            background: `conic-gradient(from 200deg, transparent 0deg, ${gold} 50deg, transparent 130deg, transparent 360deg)`,
                            WebkitMask:
                                "radial-gradient(closest-side, transparent 82%, #000 83%)",
                            mask: "radial-gradient(closest-side, transparent 82%, #000 83%)",
                            animation: "itc-spin-rev 3.6s linear infinite",
                            opacity: 0.85,
                        }}
                    />
                    <div
                        className="itc-orbit absolute inset-0"
                        style={{ animation: "itc-orbit 3s linear infinite" }}
                    >
                        <span
                            className="absolute left-1/2 top-[-3px] h-[9px] w-[9px] rounded-full"
                            style={{
                                marginLeft: "-4.5px",
                                background: gold,
                                boxShadow: `0 0 12px ${gold}`,
                            }}
                        />
                    </div>

                    <div
                        className="itc-logo relative flex h-[120px] w-[120px] items-center justify-center rounded-full"
                        style={{
                            animation: "itc-breathe 3.2s ease-in-out infinite",
                            filter: "drop-shadow(0 8px 22px color-mix(in srgb, var(--color-primary) 30%, transparent))",
                        }}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/logo.png"
                            alt="ITECHEngage"
                            className="h-full w-full object-contain"
                        />
                    </div>
                </div>

                {/* Wordmark */}
                <div className="mt-[30px] flex items-baseline gap-px text-[26px] font-extrabold tracking-tight">
                    <span className="text-foreground">ITECH</span>
                    <span style={{ color: gold }}>Engage</span>
                </div>

                {/* Label + animated dots */}
                <div className="mt-[14px] flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <span>{label}</span>
                    <span className="inline-flex gap-1">
                        {[0, 0.18, 0.36].map((delay) => (
                            <i
                                key={delay}
                                className="h-[5px] w-[5px] rounded-full"
                                style={{
                                    background: accent,
                                    animation: "itc-dot 1.2s ease-in-out infinite",
                                    animationDelay: `${delay}s`,
                                }}
                            />
                        ))}
                    </span>
                </div>

                {/* Indeterminate progress bar */}
                {showBar && (
                    <div
                        className="relative mt-[22px] h-1 w-[208px] overflow-hidden rounded-full"
                        style={{
                            background:
                                "color-mix(in srgb, var(--color-foreground) 12%, transparent)",
                        }}
                    >
                        <div
                            className="absolute left-0 top-0 h-full w-[38%] rounded-full"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${accent}, ${gold})`,
                                animation: "itc-bar 1.5s cubic-bezier(.5,.1,.3,1) infinite",
                            }}
                        />
                    </div>
                )}

                {/* Tagline */}
                <div className="mt-6 text-[11px] font-semibold tracking-[0.34em] text-muted-foreground">
                    CONNECT · ENGAGE · LEAD
                </div>
            </div>
        </div>
    );
}
