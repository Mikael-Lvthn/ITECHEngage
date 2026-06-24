import { Skeleton } from "@/components/loading/Skeleton";

export default function ScanLoading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6 animate-fade-in">
            <div className="w-full max-w-md">
                <div className="overflow-hidden rounded-2xl border border-border shadow-lg">
                    <Skeleton className="h-3 rounded-none" />
                    <div className="space-y-4 bg-card p-8 text-center">
                        <Skeleton className="mx-auto h-20 w-20 rounded-full" />
                        <Skeleton className="mx-auto h-6 w-48" />
                        <Skeleton className="mx-auto h-4 w-64" />
                        <Skeleton className="mx-auto h-10 w-40 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}
