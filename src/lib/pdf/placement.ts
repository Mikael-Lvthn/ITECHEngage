/**
 * Pure geometry helpers for the certificate placement editor. No pdfjs / DOM
 * dependency, so they're unit-testable in isolation.
 *
 * PDF coordinate space: origin BOTTOM-left, Y grows upward, units = points.
 * Canvas/DOM space: origin TOP-left, Y grows downward, units = pixels, where
 * pixels = points * scale (the scale at which the page was rasterized).
 */

export interface Pixel {
    px: number;
    py: number;
}

export interface Point {
    xPt: number;
    yPt: number;
}

/** PDF points -> canvas pixels (flips Y against page height, applies scale). */
export function pointsToPixels(xPt: number, yPt: number, pageHeightPt: number, scale: number): Pixel {
    return {
        px: xPt * scale,
        py: (pageHeightPt - yPt) * scale,
    };
}

/** Canvas pixels -> PDF points (inverse of pointsToPixels). */
export function pixelsToPoints(px: number, py: number, pageHeightPt: number, scale: number): Point {
    return {
        xPt: px / scale,
        yPt: pageHeightPt - py / scale,
    };
}

/**
 * pdf-lib draws text from its BASELINE; an HTML label sits by its box. Nudge the
 * label's anchor up by roughly the font ascent so what you drag matches what is
 * stamped. Approximate — the server preview remains the exact confirmation.
 */
export function baselineOffsetPx(fontSizePt: number, scale: number): number {
    return 0.75 * fontSizePt * scale;
}

/** Clamp a value into [min, max] (keeps a dragged label on the page). */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
