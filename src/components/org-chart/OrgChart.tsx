"use client";

import { useRef, useEffect, useState } from "react";

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
}

interface TreeNode extends RoleNode {
    children: TreeNode[];
}

function buildTree(roles: RoleNode[]): TreeNode[] {
    const map = new Map<string, TreeNode>();
    const roots: TreeNode[] = [];

    // Create tree nodes
    roles.forEach((role) => {
        map.set(role.id, { ...role, children: [] });
    });

    // Build tree structure
    roles.forEach((role) => {
        const node = map.get(role.id)!;
        if (role.parent_role_id && map.has(role.parent_role_id)) {
            map.get(role.parent_role_id)!.children.push(node);
        } else {
            roots.push(node);
        }
    });

    // Sort roots & children by hierarchy_level then title
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
            className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[140px] max-w-[200px] ${hasAssignee
                ? "border-primary/20 bg-card shadow-sm hover:shadow-md"
                : "border-dashed border-gray-300 bg-gray-50/50"
                }`}
        >
            {role.can_manage_roles && (
                <span
                    className="absolute -top-2 -right-2 text-xs bg-[#C9A227] text-[#2B2B2B] rounded-full w-5 h-5 flex items-center justify-center"
                    title="Can manage roles"
                >
                    ⭐
                </span>
            )}

            <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${hasAssignee
                    ? "bg-[#C9A227] text-[#2B2B2B]"
                    : "bg-gray-200 text-gray-400"
                    }`}
            >
                {role.assigned_user_avatar ? (
                    <img
                        src={role.assigned_user_avatar}
                        alt={role.assigned_user_name || ""}
                        className="w-full h-full rounded-full object-cover"
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
                <div className="w-0.5 h-8 bg-[#800000]/40" />
            </div>
            {node.children.length === 1 ? (
                <SubTree node={node.children[0]} nodeRefs={nodeRefs} />
            ) : (
                <div className="relative flex gap-6">
                    {/* Horizontal connector */}
                    <div className="connector-h absolute top-0 h-0.5 bg-[#800000]/40" style={{ left: '50%', right: '50%' }} />
                    {node.children.map((child, i) => (
                        <div key={child.id} className="flex flex-col items-center relative">
                            {/* Vertical connector from horizontal bar to child */}
                            <div className="w-0.5 h-4 bg-[#800000]/40" />
                            <SubTree node={child} nodeRefs={nodeRefs} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function OrgChart({ roles, orgName }: OrgChartProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [hLines, setHLines] = useState<{ top: number; left: number; width: number }[]>([]);

    useEffect(() => {
        // Calculate horizontal connector lines
        if (!containerRef.current) return;

        const timeout = setTimeout(() => {
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (!containerRect) return;

            const lines: { top: number; left: number; width: number }[] = [];

            // For every node with multiple children, calculate the horizontal bar
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
        <div className="relative" ref={containerRef}>
            <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#800000] to-[#A52A2A] text-white shadow-lg">
                    <span className="text-lg">🏢</span>
                    <span className="font-bold text-sm">{orgName}</span>
                </div>
            </div>

            {/* Vertical line from org name to first root */}
            <div className="flex justify-center mb-2">
                <div className="w-0.5 h-6 bg-[#800000]/40" />
            </div>

            {/* Render tree(s) */}
            <div className="flex flex-wrap justify-center gap-8 overflow-x-auto pb-4">
                {tree.map((root) => (
                    <SubTree key={root.id} node={root} nodeRefs={nodeRefs} />
                ))}
            </div>

            {/* SVG horizontal connector overlays */}
            {hLines.map((line, i) => (
                <div
                    key={i}
                    className="absolute h-0.5 bg-[#800000]/40"
                    style={{
                        top: `${line.top}px`,
                        left: `${line.left}px`,
                        width: `${line.width}px`,
                    }}
                />
            ))}
        </div>
    );
}
