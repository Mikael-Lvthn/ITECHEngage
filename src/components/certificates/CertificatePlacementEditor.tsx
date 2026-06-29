"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getTemplateForEditing } from "@/lib/actions/certificates";
import { pointsToPixels, pixelsToPoints, clamp } from "@/lib/pdf/placement";

type Field = "name" | "date";

export interface PlacementConfig {
    name_x: number;
    name_y: number;
    font_size: number;
    date_x: number;
    date_y: number;
    date_font_size: number;
    align: string;
    color: string;
    show_date: boolean;
}

interface Props {
    organizationId: string;
    file: File | null; // freshly picked template (takes priority over the stored one)
    config: PlacementConfig;
    onChange: (patch: Partial<PlacementConfig>) => void;
}

const SAMPLE_NAME = "Juan Dela Cruz";
const SAMPLE_DATE = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
const TARGET_WIDTH = 560; // px the page is rasterized to

export default function CertificatePlacementEditor({ organizationId, file, config, onChange }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [scale, setScale] = useState(1);
    const [pageHeightPt, setPageHeightPt] = useState(0);
    const [canvasSize, setCanvasSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
    const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");
    const dragRef = useRef<{ field: Field; dxPx: number; dyPx: number } | null>(null);

    // Rasterize page 1 of the active template (picked file, else stored one).
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setStatus("loading");
            setErrorMsg("");
            try {
                let bytes: Uint8Array | null = null;
                if (file) {
                    bytes = new Uint8Array(await file.arrayBuffer());
                } else {
                    const url = await getTemplateForEditing(organizationId);
                    if (!url) {
                        if (!cancelled) setStatus("empty");
                        return;
                    }
                    const res = await fetch(url);
                    bytes = new Uint8Array(await res.arrayBuffer());
                }

                // Load pdfjs lazily so it never runs during SSR.
                const pdfjs = await import("pdfjs-dist");
                pdfjs.GlobalWorkerOptions.workerSrc = new URL(
                    "pdfjs-dist/build/pdf.worker.min.mjs",
                    import.meta.url,
                ).toString();

                const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
                const page = await pdf.getPage(1);
                const baseVp = page.getViewport({ scale: 1 });
                const renderScale = TARGET_WIDTH / baseVp.width;
                const viewport = page.getViewport({ scale: renderScale });

                const canvas = canvasRef.current;
                if (!canvas || cancelled) return;
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                await page.render({ canvas, canvasContext: ctx, viewport }).promise;

                if (cancelled) return;
                setScale(renderScale);
                setPageHeightPt(baseVp.height);
                setCanvasSize({ w: viewport.width, h: viewport.height });
                setStatus("ready");
            } catch (err) {
                if (cancelled) return;
                setErrorMsg(err instanceof Error ? err.message : "Could not render the template.");
                setStatus("error");
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [file, organizationId]);

    const onPointerDown = useCallback(
        (field: Field) => (e: React.PointerEvent) => {
            e.preventDefault();
            const anchor =
                field === "name"
                    ? pointsToPixels(config.name_x, config.name_y, pageHeightPt, scale)
                    : pointsToPixels(config.date_x, config.date_y, pageHeightPt, scale);
            const rect = canvasRef.current!.getBoundingClientRect();
            dragRef.current = {
                field,
                dxPx: e.clientX - rect.left - anchor.px,
                dyPx: e.clientY - rect.top - anchor.py,
            };
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
        },
        [config, pageHeightPt, scale],
    );

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            const drag = dragRef.current;
            if (!drag) return;
            const rect = canvasRef.current!.getBoundingClientRect();
            const px = clamp(e.clientX - rect.left - drag.dxPx, 0, canvasSize.w);
            const py = clamp(e.clientY - rect.top - drag.dyPx, 0, canvasSize.h);
            const { xPt, yPt } = pixelsToPoints(px, py, pageHeightPt, scale);
            const x = Math.round(xPt);
            const y = Math.round(yPt);
            if (drag.field === "name") onChange({ name_x: x, name_y: y });
            else onChange({ date_x: x, date_y: y });
        },
        [canvasSize, pageHeightPt, scale, onChange],
    );

    const onPointerUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    // Label anchored by its bottom edge (≈ text baseline); centered horizontally
    // when align is "center", else left-anchored — mirrors computeTextX.
    function labelStyle(field: Field): React.CSSProperties {
        const anchor =
            field === "name"
                ? pointsToPixels(config.name_x, config.name_y, pageHeightPt, scale)
                : pointsToPixels(config.date_x, config.date_y, pageHeightPt, scale);
        const fontPx = (field === "name" ? config.font_size : config.date_font_size) * scale;
        const centered = config.align === "center";
        return {
            position: "absolute",
            left: anchor.px,
            top: anchor.py,
            transform: `translate(${centered ? "-50%" : "0"}, -100%)`,
            fontSize: `${fontPx}px`,
            color: config.color,
            whiteSpace: "nowrap",
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
            fontWeight: 700,
            lineHeight: 1,
        };
    }

    return (
        <div>
            <p className="text-xs text-muted-foreground mb-2">
                Drag the labels onto the template to position them. The X/Y fields update as you drag; use
                <span className="font-semibold"> Generate preview</span> to confirm the exact result.
            </p>

            {status === "loading" && (
                <div className="h-72 rounded-xl border border-border bg-muted/40 flex items-center justify-center text-sm text-muted-foreground">
                    Rendering template…
                </div>
            )}

            {status === "empty" && (
                <div className="h-72 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center text-sm text-muted-foreground text-center px-6">
                    Upload a template PDF above to position the name and date.
                </div>
            )}

            {status === "error" && (
                <div className="h-40 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-sm text-red-600 dark:text-red-400 text-center px-6">
                    {errorMsg}
                </div>
            )}

            <div
                className="relative inline-block rounded-xl overflow-hidden border border-border shadow-sm"
                style={{ display: status === "ready" ? "inline-block" : "none" }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
            >
                <canvas ref={canvasRef} className="block bg-white" />
                <span style={labelStyle("name")} onPointerDown={onPointerDown("name")}>
                    {SAMPLE_NAME}
                </span>
                {config.show_date && (
                    <span style={labelStyle("date")} onPointerDown={onPointerDown("date")}>
                        {SAMPLE_DATE}
                    </span>
                )}
            </div>
        </div>
    );
}
