import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

interface VerifyResult {
    full_name: string;
    organization_name: string;
    issued_at: string;
}

export default async function VerifyCertificatePage({
    params,
}: {
    params: Promise<{ code: string }>;
}) {
    const { code } = await params;
    const supabase = await createClient();

    // verify_certificate is a security-definer RPC granted to anon — it exposes
    // only safe fields (name, org, issue date), never full certificate rows.
    const { data } = await supabase.rpc("verify_certificate", { p_code: code });
    const result = (data as VerifyResult[] | null)?.[0] ?? null;

    return (
        <main className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-[#800000] to-[#C9A227]" />
                <div className="p-8 text-center">
                    {result ? (
                        <>
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                                <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-foreground">Valid Certificate</h1>
                            <p className="text-sm text-muted-foreground mt-1 mb-6">
                                This membership certificate is authentic.
                            </p>
                            <dl className="text-left space-y-3 rounded-xl border border-border bg-muted/40 p-5">
                                <div>
                                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Issued to</dt>
                                    <dd className="text-sm font-semibold text-foreground">{result.full_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Organization</dt>
                                    <dd className="text-sm font-semibold text-foreground">{result.organization_name}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs uppercase tracking-wider text-muted-foreground">Issued on</dt>
                                    <dd className="text-sm font-semibold text-foreground">
                                        {new Date(result.issued_at).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "long",
                                            day: "numeric",
                                        })}
                                    </dd>
                                </div>
                            </dl>
                        </>
                    ) : (
                        <>
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                                <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-bold text-foreground">Certificate Not Found</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                No certificate matches the code <span className="font-mono font-semibold text-foreground">{code}</span>. Please check the code and try again.
                            </p>
                        </>
                    )}

                    <Link
                        href="/"
                        className="inline-block mt-8 text-sm font-medium text-primary hover:underline"
                    >
                        ← Back to ITECHEngage
                    </Link>
                </div>
            </div>
        </main>
    );
}
