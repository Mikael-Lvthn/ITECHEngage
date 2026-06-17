"use server";

export async function sendSchoolEmail(schoolEmail: string, fullName: string, role: string = "student") {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;

    if (!apiKey || !fromEmail) {
        console.warn("[Resend] API Key or From Email is not configured in environment variables.");
        return { success: false, error: "Email configuration missing" };
    }

    const isStudent = role === "student";
    const linkedText = isStudent 
        ? `Your school email (<strong>${schoolEmail}</strong>) has been successfully linked to your ITECHEngage account.`
        : `Your email address (<strong>${schoolEmail}</strong>) has been successfully verified and linked to your ITECHEngage administrator account.`;
        
    const permissionsText = isStudent
        ? `You can now participate in student organizations, attend events, and be up to date with the school current affairs.`
        : `You now have administrative access to manage platform users, oversee events, and handle verification requests.`;

    try {
        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: fromEmail,
                to: schoolEmail,
                subject: "Welcome to ITECHEngage — PUP ITECH",
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff;">
                        <div style="background-color: #800000; padding: 20px; text-align: center; border-radius: 6px 6px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: bold;">Welcome to ITECHEngage</h1>
                        </div>
                        <div style="padding: 24px; color: #333333; line-height: 1.6;">
                            <h2 style="color: #800000; margin-top: 0; font-size: 18px;">Hi ${fullName},</h2>
                            <p>Thank you for registering! ${linkedText}</p>
                            <p>${permissionsText}</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" 
                                   style="background-color: #C9A227; color: #2B2B2B; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                   Log In to your Account
                                </a>
                            </div>
                            <p style="font-size: 11px; color: #888888; border-top: 1px solid #eeeeee; padding-top: 15px; margin-top: 30px; text-align: center;">
                                This is an automated email from the PUP ITECH Campus Engagement Platform.<br>Please do not reply directly to this message.
                            </p>
                        </div>
                    </div>
                `,
            }),
        });

        if (!res.ok) {
            const errorData = await res.json();
            console.error("[Resend] Error response:", errorData);
            return { success: false, error: errorData.message || "Failed to send email" };
        }

        const data = await res.json();
        return { success: true, data };
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        console.error("[Resend] Exception:", err);
        return { success: false, error: errorMessage };
    }
}
