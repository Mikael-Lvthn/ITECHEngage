"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function PageTransition() {
    const pathname = usePathname();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(true);
        setProgress(20);

        const t1 = setTimeout(() => setProgress(60), 80);
        const t2 = setTimeout(() => setProgress(90), 200);
        const t3 = setTimeout(() => setProgress(100), 400);
        const t4 = setTimeout(() => {
            setVisible(false);
            setProgress(0);
        }, 550);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearTimeout(t3);
            clearTimeout(t4);
        };
    }, [pathname]);

    if (!visible) return null;

    return (
        <div
            className="fixed top-0 left-0 z-[9999] h-[3px] pointer-events-none"
            style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #800000, #C9A227)",
                transition: "width 0.2s ease, opacity 0.15s ease",
                opacity: progress === 100 ? 0 : 1,
                boxShadow: "0 0 8px rgba(201,162,39,0.6)",
            }}
        />
    );
}
