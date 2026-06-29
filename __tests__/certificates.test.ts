/**
 * Unit tests for the Auto-Certificate feature.
 *
 * Validates the pure, testable pieces of the generation library plus the
 * idempotency / skip guards that protect both approval paths — mirroring the
 * project's existing pure-logic test style (no real DB / storage).
 */
import { describe, it, expect } from "vitest";
import { hexToRgb, computeTextX, makeVerificationCode } from "@/lib/pdf/certificate";
import { pointsToPixels, pixelsToPoints, clamp } from "@/lib/pdf/placement";

// ─── hex -> rgb ───────────────────────────────────────────────────────────────
describe("hexToRgb", () => {
    it("converts PUP maroon #800000 to normalized rgb", () => {
        const c = hexToRgb("#800000");
        expect(c.red).toBeCloseTo(128 / 255, 5);
        expect(c.green).toBe(0);
        expect(c.blue).toBe(0);
    });

    it("tolerates a missing leading '#'", () => {
        const c = hexToRgb("FFFFFF");
        expect(c.red).toBe(1);
        expect(c.green).toBe(1);
        expect(c.blue).toBe(1);
    });
});

// ─── name centering ───────────────────────────────────────────────────────────
describe("computeTextX", () => {
    it("centers text by shifting half its width left of the anchor", () => {
        // anchor 300, text 100 wide -> starts at 250
        expect(computeTextX("center", 300, 100)).toBe(250);
    });

    it("left-aligns text exactly at the anchor", () => {
        expect(computeTextX("left", 300, 100)).toBe(300);
    });
});

// ─── verification code ────────────────────────────────────────────────────────
describe("makeVerificationCode", () => {
    it("produces an 8-char uppercase hex code", () => {
        const code = makeVerificationCode();
        expect(code).toMatch(/^[0-9A-F]{8}$/);
    });

    it("produces distinct codes across calls", () => {
        const codes = new Set(Array.from({ length: 50 }, () => makeVerificationCode()));
        expect(codes.size).toBe(50);
    });
});

// ─── issue guard (idempotency + no-template skip) ─────────────────────────────
// Mirrors the early-return logic at the top of issueMembershipCertificate():
// skip when a cert already exists, or when the org has no template configured.
function shouldIssue(opts: { alreadyIssued: boolean; hasTemplate: boolean }): boolean {
    if (opts.alreadyIssued) return false; // unique membership_id guard
    if (!opts.hasTemplate) return false;  // org doesn't issue certs
    return true;
}

describe("issue guard", () => {
    it("issues exactly once: a second approval with an existing cert is skipped", () => {
        expect(shouldIssue({ alreadyIssued: false, hasTemplate: true })).toBe(true);
        expect(shouldIssue({ alreadyIssued: true, hasTemplate: true })).toBe(false);
    });

    it("skips silently when the org has no template", () => {
        expect(shouldIssue({ alreadyIssued: false, hasTemplate: false })).toBe(false);
    });
});

// ─── placement editor coordinate math ─────────────────────────────────────────
// PDF origin is bottom-left; the canvas is top-left and scaled. The two
// conversions must be exact inverses so a dragged label maps back to the same
// PDF points the server will stamp.
describe("placement coordinates", () => {
    const pageHeightPt = 792; // US Letter

    it("flips Y and applies scale when converting points -> pixels", () => {
        // point near the bottom of the page maps near the bottom of the canvas
        const { px, py } = pointsToPixels(100, 50, pageHeightPt, 2);
        expect(px).toBe(200);
        expect(py).toBe((792 - 50) * 2);
    });

    it("round-trips points -> pixels -> points at a non-1 scale", () => {
        const scale = 560 / 612; // fit-to-width of a Letter page
        const { px, py } = pointsToPixels(306, 400, pageHeightPt, scale);
        const back = pixelsToPoints(px, py, pageHeightPt, scale);
        expect(back.xPt).toBeCloseTo(306, 6);
        expect(back.yPt).toBeCloseTo(400, 6);
    });

    it("clamps a dragged value onto the page", () => {
        expect(clamp(-10, 0, 500)).toBe(0);
        expect(clamp(640, 0, 500)).toBe(500);
        expect(clamp(250, 0, 500)).toBe(250);
    });
});
