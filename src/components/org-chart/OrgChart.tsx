"use client";

interface RoleNode {
    id: string;
    title: string;
    hierarchy_level: number;
    can_manage_roles: boolean;
    assigned_user_id: string | null;
    assigned_user_name: string | null;
    assigned_user_avatar: string | null;
}

interface OrgChartProps {
    roles: RoleNode[];
    orgName: string;
}

export default function OrgChart({ roles, orgName }: OrgChartProps) {
    if (roles.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <span className="text-4xl block mb-3">🏗️</span>
                <p className="text-sm">No organizational roles have been set up yet.</p>
            </div>
        );
    }

    const sortedRoles = [...roles].sort((a, b) => a.hierarchy_level - b.hierarchy_level);

    const levels: Record<number, RoleNode[]> = {};
    sortedRoles.forEach((role) => {
        if (!levels[role.hierarchy_level]) {
            levels[role.hierarchy_level] = [];
        }
        levels[role.hierarchy_level].push(role);
    });

    const sortedLevels = Object.keys(levels)
        .map(Number)
        .sort((a, b) => a - b);

    return (
        <div className="relative">
            <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#800000] to-[#A52A2A] text-white shadow-lg">
                    <span className="text-lg">🏢</span>
                    <span className="font-bold text-sm">{orgName}</span>
                </div>
            </div>

            <div className="space-y-1">
                {sortedLevels.map((level, levelIndex) => (
                    <div key={level} className="relative">
                        {levelIndex > 0 && (
                            <div className="flex justify-center mb-1">
                                <div className="w-0.5 h-6 bg-border" />
                            </div>
                        )}

                        <div className="flex flex-wrap justify-center gap-4">
                            {levels[level].map((role) => {
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
                                        key={role.id}
                                        className={`relative flex flex-col items-center p-4 rounded-xl border-2 transition-all min-w-[140px] max-w-[200px] animate-scale-in ${hasAssignee
                                            ? "border-primary/20 bg-card shadow-sm hover:shadow-md"
                                            : "border-dashed border-gray-300 bg-gray-50/50"
                                            }`}
                                        style={{ animationDelay: `${levelIndex * 100 + 50}ms` }}
                                    >
                                        {role.can_manage_roles && (
                                            <span className="absolute -top-2 -right-2 text-xs bg-[#C9A227] text-[#2B2B2B] rounded-full w-5 h-5 flex items-center justify-center" title="Can manage roles">
                                                ⭐
                                            </span>
                                        )}

                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold mb-2 ${hasAssignee
                                            ? "bg-[#C9A227] text-[#2B2B2B]"
                                            : "bg-gray-200 text-gray-400"
                                            }`}>
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

                                        <p className={`text-xs mt-0.5 text-center ${hasAssignee ? "text-foreground font-medium" : "text-muted-foreground italic"
                                            }`}>
                                            {hasAssignee ? role.assigned_user_name : "Vacant"}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        {levelIndex < sortedLevels.length - 1 && (
                            <div className="flex justify-center mt-1">
                                <div className="w-0.5 h-6 bg-border" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
