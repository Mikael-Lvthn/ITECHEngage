import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { getAccreditationFileUrl } from "@/lib/actions/accreditation";

export default async function AccreditationManifestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Fetch accreditation details
    const { data: accreditation } = await supabase
        .from("accreditations")
        .select(`
            *,
            organizations (name),
            accreditation_documents (
                id,
                file_name,
                file_size,
                storage_path,
                uploaded_at,
                accreditation_requirements (
                    name
                )
            )
        `)
        .eq("id", id)
        .single();

    if (!accreditation) notFound();

    // Verify access
    const { data: role } = await supabase.rpc("get_my_role");
    if (role !== "admin") {
        const { data: membership } = await supabase
            .from("memberships")
            .select("id")
            .eq("user_id", user.id)
            .eq("organization_id", accreditation.organization_id)
            .eq("role", "officer")
            .eq("status", "approved")
            .maybeSingle();

        if (!membership) {
            redirect("/dashboard");
        }
    }

    // Get signed URLs for all documents
    const documentsWithUrls = await Promise.all(
        (accreditation.accreditation_documents || []).map(async (doc: { id: string; storage_path: string; file_size?: number; file_name?: string; uploaded_at: string; accreditation_requirements: unknown }) => {
            try {
                const url = await getAccreditationFileUrl(doc.storage_path);
                return { ...doc, downloadUrl: url };
            } catch {
                return { ...doc, downloadUrl: null };
            }
        })
    );

    const org = accreditation.organizations as unknown as { name: string } | null;

    return (
        <div className="min-h-screen bg-white text-black p-8 max-w-4xl mx-auto print:p-0 print:max-w-none">
            <div className="flex justify-between items-start mb-8 border-b pb-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Accreditation Manifest</h1>
                    <h2 className="text-xl text-gray-700">{org?.name || "Unknown Organization"}</h2>
                    <p className="text-gray-500 mt-1">Academic Year: {accreditation.academic_year}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-500 font-mono">ID: {accreditation.id.split('-')[0]}</p>
                    <p className="text-sm text-gray-500 mt-1">
                        Submitted: {new Date(accreditation.submitted_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm font-semibold mt-2 uppercase tracking-wide">
                        {accreditation.cycle_type} CYCLE
                    </p>
                    <button 
                        onClick={() => typeof window !== 'undefined' && window.print()}
                        className="mt-4 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded print:hidden hover:bg-gray-800"
                    >
                        Print to PDF
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-xl font-semibold border-b pb-2">Uploaded Documents</h3>
                
                {documentsWithUrls.length === 0 ? (
                    <p className="text-gray-500 italic">No documents found for this application.</p>
                ) : (
                    <div className="space-y-4">
                        {documentsWithUrls.map((doc: { id: string; storage_path: string; file_size?: number; file_name?: string; uploaded_at: string; downloadUrl: string | null; accreditation_requirements: unknown }, i) => {
                            const req = doc.accreditation_requirements as unknown as { name: string } | null;
                            const sizeKb = Math.round((doc.file_size || 0) / 1024);
                            
                            return (
                                <div key={doc.id} className="p-4 border rounded bg-gray-50 print:bg-white print:border-gray-300">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs text-gray-500 font-mono mb-1">Requirement {i + 1}</p>
                                            <h4 className="font-semibold text-gray-900">{req?.name || "Other Document"}</h4>
                                            <p className="text-sm text-gray-600 mt-1">{doc.file_name} ({sizeKb} KB)</p>
                                            <p className="text-xs text-gray-400 mt-1">Uploaded {new Date(doc.uploaded_at).toLocaleString()}</p>
                                        </div>
                                        {doc.downloadUrl && (
                                            <a 
                                                href={doc.downloadUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-blue-600 text-sm hover:underline print:hidden"
                                            >
                                                Download File
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {accreditation.notes && (
                <div className="mt-8 pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-2">Officer Notes</h3>
                    <p className="text-gray-700 bg-gray-50 p-4 rounded print:bg-white print:border">{accreditation.notes}</p>
                </div>
            )}

            <div className="mt-12 pt-8 border-t text-sm text-gray-500 flex justify-between print:mt-auto">
                <p>Generated by ITECHEngage on {new Date().toLocaleString()}</p>
                <p>Confidential Document - For Commission Use Only</p>
            </div>
            
            {/* Auto-print script for convenience */}
            <script dangerouslySetInnerHTML={{ __html: `
                // Automatically open print dialog when loaded if it's not an iframe
                if (window.self === window.top) {
                    setTimeout(() => window.print(), 500);
                }
            `}} />
        </div>
    );
}
