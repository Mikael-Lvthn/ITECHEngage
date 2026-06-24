"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useToast } from "@/components/Toast";

interface RoleNode {
    id: string;
    title: string;
    hierarchy_level: number;
    can_manage_roles: boolean;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
    assigned_user_avatar: string | null;
    parent_role_id?: string | null;
}

interface OrgChartProps {
    roles: RoleNode[];
    orgName: string;
    canDownload?: boolean;
}

interface TreeNode extends RoleNode {
    children: TreeNode[];
}

function buildTree(roles: RoleNode[]): TreeNode[] {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    roles.forEach((role) => {
        map.set(role.id, { ...role, children: [] });
    });

    roles.forEach((role) => {
        const node = map.get(role.id)!;
        if (role.parent_role_id && map.has(role.parent_role_id)) {
            map.get(role.parent_role_id)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    const sortFn = (a: TreeNode, b: TreeNode) =>
        a.hierarchy_level - b.hierarchy_level || a.title.localeCompare(b.title);
    roots.sort(sortFn);
    const sortChildren = (nodes: TreeNode[]) => {
        nodes.sort(sortFn);
        nodes.forEach((n) => sortChildren(n.children));
    };
    sortChildren(roots);

    return roots;
}

function RoleCard({ role, nodeRef }: { role: TreeNode; nodeRef: (el: HTMLDivElement | null) => void }) {
    const hasAssignee = !!role.assigned_user_id;
    const initials = role.assigned_user_name
        ? role.assigned_user_name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2)
        : "?";

    return (
        <div
            ref={nodeRef}
            data-role-id={role.id}
            className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[140px] max-w-[200px]`}
            style={{
                borderColor: hasAssignee ? 'rgba(128, 0, 0, 0.2)' : 'rgba(110, 110, 110, 0.3)',
                backgroundColor: hasAssignee ? 'var(--color-card)' : 'rgba(240, 240, 240, 0.5)',
                borderStyle: hasAssignee ? 'solid' : 'dashed'
            }}
        >
            {role.can_manage_roles && (
                <span
                    className="absolute -top-2 -right-2 text-xs bg-gold text-[#2B2B2B] rounded-full w-5 h-5 flex items-center justify-center"
                    title="Can manage roles"
                >
                    ⭐
                </span>
            )}

            <div
                className={`relative w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${hasAssignee
                    ? "bg-gold text-[#2B2B2B]"
                    : "bg-muted text-muted-foreground"
                    }`}
            >
                {role.assigned_user_avatar ? (
                    <Image
                        src={role.assigned_user_avatar}
                        alt={role.assigned_user_name || ""}
                        fill
                        className="rounded-full object-cover"
                    />
                ) : (
                    initials
                )}
            </div>

            <p className="font-bold text-xs text-center uppercase tracking-wider text-primary">
                {role.title}
            </p>

            <p
                className={`text-xs mt-0.5 text-center ${hasAssignee ? "text-foreground font-medium" : "text-muted-foreground italic"
                    }`}
            >
                {hasAssignee ? role.assigned_user_name : "Vacant"}
            </p>
        </div>
    );
}

function SubTree({ node, nodeRefs }: { node: TreeNode; nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>> }) {
    const setRef = (el: HTMLDivElement | null) => {
        if (el) {
            nodeRefs.current.set(node.id, el);
        } else {
            nodeRefs.current.delete(node.id);
        }
    };

    if (node.children.length === 0) {
        return (
            <div className="flex flex-col items-center">
                <RoleCard role={node} nodeRef={setRef} />
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            <RoleCard role={node} nodeRef={setRef} />
            <div className="flex justify-center">
                <div className="w-0.5 h-8" style={{ backgroundColor: 'rgba(128, 0, 0, 0.4)' }} />
            </div>
            {node.children.length === 1 ? (
                <SubTree node={node.children[0]} nodeRefs={nodeRefs} />
            ) : (
                <div className="relative flex gap-6">
                    {/* Horizontal connector */}
                    <div className="connector-h absolute top-0 h-0.5" style={{ left: '50%', right: '50%', backgroundColor: 'rgba(128, 0, 0, 0.4)' }} />
                    {node.children.map((child) => (
                        <div key={child.id} className="flex flex-col items-center relative">
                            {/* Vertical connector from horizontal bar to child */}
                            <div className="w-0.5 h-4" style={{ backgroundColor: 'rgba(128, 0, 0, 0.4)' }} />
                            <SubTree node={child} nodeRefs={nodeRefs} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function OrgChart({ roles, orgName, canDownload = false }: OrgChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartContentRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [hLines, setHLines] = useState<{ top: number; left: number; width: number }[]>([]);
    const [downloading, setDownloading] = useState(false);
    const { showToast } = useToast();

    useEffect(() => {
        // Calculate horizontal connector lines
        if (!containerRef.current) return;

        const timeout = setTimeout(() => {
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            const lines: { top: number; left: number; width: number }[] = [];

            const tree = buildTree(roles);
            const findMultiChildNodes = (nodes: TreeNode[]): TreeNode[] => {
                const result: TreeNode[] = [];
                nodes.forEach((n) => {
                    if (n.children.length > 1) result.push(n);
                    result.push(...findMultiChildNodes(n.children));
                });
                return result;
            };

            const multiChildNodes = findMultiChildNodes(tree);

            multiChildNodes.forEach((parent) => {
                const children = parent.children;
                const childEls = children.map((c) => nodeRefs.current.get(c.id)).filter(Boolean) as HTMLDivElement[];

                if (childEls.length < 2) return;

                const firstRect = childEls[0].getBoundingClientRect();
                const lastRect = childEls[childEls.length - 1].getBoundingClientRect();

                const firstCenter = firstRect.left + firstRect.width / 2 - containerRect.left;
                const lastCenter = lastRect.left + lastRect.width / 2 - containerRect.left;
                const parentEl = nodeRefs.current.get(parent.id);

                if (!parentEl) return;

                const parentRect = parentEl.getBoundingClientRect();
                const topY = parentRect.bottom + 32 - containerRect.top; // 32px = h-8 vertical connector

                lines.push({
                    top: topY,
                    left: firstCenter,
                    width: lastCenter - firstCenter,
                });
            });

            setHLines(lines);
        }, 200);

        return () => clearTimeout(timeout);
    }, [roles]);

    const handleDownload = useCallback(async () => {
        if (!chartContentRef.current) {
            showToast("Chart content not found", "error");
            return;
        }
        setDownloading(true);
        showToast("Generating image, please wait...", "info");

        try {
            const html2canvasModule = await import("html2canvas");
            const html2canvas = html2canvasModule.default || html2canvasModule;

            const el = chartContentRef.current;

            // Capture
            const canvas = await html2canvas(el as HTMLElement, {
                backgroundColor: "#FFFFFF",
                scale: 2,
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedEl = clonedDoc.querySelector('[data-capture-area="true"]') as HTMLElement;
                    if (clonedEl) {
                        // Force a clean, high-contrast state for the export
                        clonedEl.classList.add("capture-mode");
                        clonedEl.style.overflow = "visible";
                        clonedEl.style.maxHeight = "none";
                        clonedEl.style.width = "auto";
                        clonedEl.style.height = "auto";
                        
                        // Ensure all text elements are visible
                        const textElements = clonedEl.querySelectorAll('div, span, p, h2');
                        textElements.forEach(el => {
                            const htmlEl = el as HTMLElement;
                            if (htmlEl.innerText && htmlEl.innerText.trim().length > 0) {
                                htmlEl.style.visibility = 'visible';
                                htmlEl.style.opacity = '1';
                            }
                        });
                    }
                }
            });

            const link = document.createElement("a");
            link.download = `${orgName.replace(/[^a-zA-Z0-9]/g, "_")}_org_structure.png`;
            link.href = canvas.toDataURL("image/png");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            showToast("Organization structure downloaded!", "success");
        } catch (err) {
            console.error("Failed to download org chart:", err);
            showToast("Failed to download chart. Please try again.", "error");
        } finally {
            setDownloading(false);
        }
    }, [orgName, showToast]);

    if (roles.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <span className="text-4xl block mb-3">🏗️</span>
                <p className="text-sm">No organizational roles have been set up yet.</p>
            </div>
        );
    }

    const tree = buildTree(roles);

    return (
        <div>
            {/* Download button — only visible to admins/officers of this org */}
            {canDownload && (
                <div className="flex justify-end mb-4">
                    <button
                        onClick={handleDownload}
                        disabled={downloading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 shadow-sm"
                    >
                        {downloading ? (
                            <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Exporting…
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Structure
                            </>
                        )}
                    </button>
                </div>
            )}

            <div
                ref={containerRef}
                className="relative min-h-[200px] max-h-[50vh] md:max-h-[60vh] lg:max-h-[70vh] overflow-auto border rounded-xl bg-muted/20"
                style={{ scrollbarWidth: 'thin' }}
            >
                <div
                    ref={chartContentRef}
                    data-capture-area="true"
                    className="p-12 min-w-max bg-background transition-colors duration-300"
                >
                    <div className="text-center mb-16">
                        <div className="inline-flex flex-col items-center gap-4">
                            <div 
                                className="flex items-center gap-3 px-6 py-2 rounded-full border"
                                style={{ 
                                    borderColor: 'rgba(128, 0, 0, 0.2)', 
                                    backgroundColor: 'rgba(128, 0, 0, 0.05)',
                                    color: '#800000'
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span className="font-semibold text-[10px] tracking-[0.25em] uppercase">Organizational Structure</span>
                            </div>
                            <h2 className="text-4xl font-black text-foreground tracking-tight drop-shadow-sm">
                                {orgName}
                            </h2>
                            <div className="w-24 h-1 rounded-full" style={{ backgroundColor: 'rgba(128, 0, 0, 0.2)' }} />
                        </div>
                    </div>

                    {/* Vertical line from org name to first root */}
                    <div className="flex justify-center mb-2">
                        <div className="w-0.5 h-6" style={{ backgroundColor: 'rgba(128, 0, 0, 0.4)' }} />
                    </div>

                    {/* Render tree(s) */}
                    <div className="flex flex-wrap justify-center gap-8 pb-4">
                        {tree.map((root) => (
                            <SubTree key={root.id} node={root} nodeRefs={nodeRefs} />
                        ))}
                    </div>

                    {/* SVG horizontal connector overlays — now inside the capture area */}
                    {hLines.map((line, i) => (
                        <div
                            key={i}
                            className="absolute h-0.5"
                            style={{
                                top: `${line.top}px`,
                                left: `${line.left}px`,
                                width: `${line.width}px`,
                                backgroundColor: 'rgba(128, 0, 0, 0.4)'
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
