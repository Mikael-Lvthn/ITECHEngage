import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    
    // Support both PKCE flow (code) and OTP flow (token_hash)
    const code = searchParams.get("code");
    const token_hash = searchParams.get("token_hash");
    const type = searchParams.get("type") as "signup" | "magiclink" | "recovery" | "invite" | "email_change";
    const next = searchParams.get("next") ?? "/dashboard";

    const supabase = await createClient();

    // 1. Try OTP Token Hash flow (Bulletproof across different browsers)
    if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        return NextResponse.redirect(
            `${origin}/login?message=${encodeURIComponent("OTP Verification failed. The link may have expired.")}`
        );
    }

    // 2. Try PKCE Code flow (Fails if opened in a different browser)
    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
        return NextResponse.redirect(
            `${origin}/login?message=${encodeURIComponent("Verification link is invalid or has expired. Please ensure you open the link in the SAME browser you used to register.")}`
        );
    }

    return NextResponse.redirect(`${origin}/login`);
}
