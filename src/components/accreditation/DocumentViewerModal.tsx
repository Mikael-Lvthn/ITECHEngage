"use client";
import { X } from "lucide-react";

interface DocumentViewerModalProps {
    fileUrl: string | null;
    fileName: string | null;
    onClose: () => void;
}

export default function DocumentViewerModal({ fileUrl, fileName, onClose }: DocumentViewerModalProps) {
    if (!fileUrl) return null;

    const ext = fileName?.split('.').pop()?.toLowerCase();
    const isPdfOrImage = ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext || '');
    
    // For Microsoft Office documents, use Google Docs viewer wrapper to render them in browser
    const viewerUrl = isPdfOrImage 
        ? fileUrl 
        : `https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="bg-background rounded-xl shadow-xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden relative">
                <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
                    <h3 className="font-semibold truncate pr-4">{fileName}</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-md transition-colors shrink-0 border border-transparent hover:border-border">
                        <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                    </button>
                </div>
                <div className="flex-1 bg-muted/10 relative">
                    {/* Fallback overlay in case iframe fails or takes long to load */}
                    <div className="absolute inset-0 flex items-center justify-center -z-10 text-muted-foreground animate-pulse">
                        Loading document...
                    </div>
                    <iframe 
                        src={viewerUrl} 
                        className="w-full h-full border-0 bg-card"
                        title={fileName || "Document viewer"}
                    />
                </div>
                <div className="px-4 py-3 border-t flex justify-end gap-3 bg-muted/30">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted transition-colors"
                    >
                        Close
                    </button>
                    <a 
                        href={fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        download
                        className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        Download Original
                    </a>
                </div>
            </div>
        </div>
    );
}
