import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import PageTransition from "@/components/PageTransition";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ITECHEngage — Campus Engagement Platform",
    description:
        "Connect with student organizations, attend events, and engage with the PUP ITECH community.",
    icons: {
        icon: "/icon.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* FOUC prevention: apply dark mode before React hydrates */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `try{if(localStorage.getItem('itech-dark-mode')==='true')document.documentElement.classList.add('dark')}catch(e){}`,
                    }}
                />
            </head>
            <body className={inter.className} suppressHydrationWarning>
                <ThemeProvider>
                    <ToastProvider>
                        <PageTransition />
                        {children}
                    </ToastProvider>
                </ThemeProvider>
                <SpeedInsights />
            </body>
        </html>
    );
}

