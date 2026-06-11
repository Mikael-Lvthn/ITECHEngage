export default function ScanLoading() {
    return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
            <div className="max-w-md w-full">
                <div className="rounded-2xl overflow-hidden shadow-lg border animate-pulse">
                    <div className="h-3 bg-gray-200" />
                    <div className="p-8 text-center space-y-4 bg-card">
                        <div className="w-20 h-20 mx-auto rounded-full bg-gray-200" />
                        <div className="h-6 bg-gray-200 rounded w-48 mx-auto" />
                        <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
                        <div className="h-10 bg-gray-200 rounded-lg w-40 mx-auto" />
                    </div>
                </div>
            </div>
        </div>
    );
}
