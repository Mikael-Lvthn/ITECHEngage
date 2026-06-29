"use client";

export interface AccreditationRequirement {
    id: string;
    name: string;
    description: string | null;
    is_required: boolean;
    order_index: number;
}

interface DocumentChecklistProps {
    requirements: AccreditationRequirement[];
    selectedFiles: Record<string, File>;
    onFileSelect: (requirementId: string, file: File) => void;
}

export default function DocumentChecklist({ requirements, selectedFiles, onFileSelect }: DocumentChecklistProps) {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, requirementId: string) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(requirementId, file);
        }
    };

    // Accreditation is revalidation-only; show the revalidation document set.
    const revalidationNames = ['Constitution and By-Laws (CBL)', 'Resolutions', 'Memorandum Order', 'List of Officers/ Organizational Chart', 'General Plan of Activities (GPOA)', 'Minutes of the Meetings', 'Narrative Reports', 'Financial Report', 'Turnover Documents'];

    const filteredRequirements = requirements.filter(r => revalidationNames.includes(r.name));

    return (
        <div className="space-y-4">
            {filteredRequirements.map((req) => (
                <div
                    key={req.id}
                    className={`p-4 rounded-xl border transition-colors ${
                        selectedFiles[req.id] ? "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800" : "bg-card"
                    }`}
                >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                            <h4 className="text-base font-semibold flex items-center gap-2">
                                {req.name}
                                {req.is_required && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:bg-primary/30 dark:text-red-300">
                                        REQUIRED
                                    </span>
                                )}
                            </h4>
                            {req.description && (
                                <p className="text-sm text-muted-foreground mt-1">{req.description}</p>
                            )}
                        </div>
                        <div className="shrink-0 w-full sm:w-auto">
                            <label
                                htmlFor={`file-${req.id}`}
                                className={`flex items-center justify-center min-w-[140px] min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg border cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-primary/30 ${
                                    selectedFiles[req.id]
                                        ? "bg-green-600 text-white hover:bg-green-700 border-transparent"
                                        : "bg-background hover:bg-accent text-foreground"
                                }`}
                            >
                                <input
                                    type="file"
                                    id={`file-${req.id}`}
                                    className="sr-only"
                                    onChange={(e) => handleFileChange(e, req.id)}
                                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                                />
                                {selectedFiles[req.id] ? (
                                    <span className="flex items-center gap-2">
                                        ✓ Selected: {selectedFiles[req.id].name.substring(0, 15)}...
                                    </span>
                                ) : (
                                    <span>Select File</span>
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
