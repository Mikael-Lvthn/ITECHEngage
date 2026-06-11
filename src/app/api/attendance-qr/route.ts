import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(request: NextRequest) {
    const token = request.nextUrl.searchParams.get("token");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;

    if (!token) {
        return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const scanUrl = `${appUrl}/dashboard/scan?token=${token}`;

    try {
        const qrBuffer = await QRCode.toBuffer(scanUrl, {
            width: 400,
            margin: 2,
            color: { dark: "#800000", light: "#FFFFFF" },
            errorCorrectionLevel: "H",
        });

        return new NextResponse(new Uint8Array(qrBuffer), {
            headers: {
                "Content-Type": "image/png",
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
    }
}
