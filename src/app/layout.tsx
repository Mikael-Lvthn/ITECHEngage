import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ITECHEngage — Campus Engagement Platform",
    description:
        "Connect with student organizations, attend events, and engage with the PUP ITECH community.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <ToastProvider>{children}</ToastProvider>
                <SpeedInsights />
            </body>
        </html>
    );
}
