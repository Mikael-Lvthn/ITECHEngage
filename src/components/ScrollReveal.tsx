"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface ScrollRevealProps {
    children: ReactNode;
    className?: string;
    delay?: number;
    direction?: "up" | "left" | "right" | "none";
}

export default function ScrollReveal({
    children,
    className = "",
    delay = 0,
    direction = "up",
}: ScrollRevealProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    el.style.transitionDelay = delay ? `${delay}ms` : "0ms";
                    el.classList.add("scroll-reveal-visible");
                    observer.unobserve(el);
                }
            },
            { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [delay]);

    const dirClass =
        direction === "up"
            ? "scroll-reveal-up"
            : direction === "left"
            ? "scroll-reveal-left"
            : direction === "right"
            ? "scroll-reveal-right"
            : "scroll-reveal-fade";

    return (
        <div ref={ref} className={`scroll-reveal ${dirClass} ${className}`}>
            {children}
        </div>
    );
}
