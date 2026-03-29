"use client";

import { useTheme } from "@/components/ThemeProvider";

const fontOptions = [
    { label: "Inter", value: "Inter" },
    { label: "Roboto", value: "Roboto" },
    { label: "Outfit", value: "Outfit" },
    { label: "System Default", value: "system-ui" },
];

const sizeOptions = [
    { label: "Small", value: "small" },
    { label: "Default", value: "default" },
    { label: "Large", value: "large" },
    { label: "Extra Large", value: "extra-large" },
];

export default function AppearanceSettings() {
    const { fontFamily, fontSize, brightness, darkMode, updateTheme, saving } = useTheme();

    return (
        <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <span>🎨</span> Appearance
                </h2>
                <p className="text-sm text-muted-foreground">Customize how ITECHEngage looks for you</p>
            </div>

            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium">Dark Mode</p>
                        <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
                    </div>
                    <button
                        onClick={() => updateTheme({ darkMode: !darkMode })}
                        className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${darkMode ? "bg-[#800000]" : "bg-gray-300"}`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 flex items-center justify-center text-xs ${darkMode ? "translate-x-7" : "translate-x-0"}`}
                        >
                            {darkMode ? "🌙" : "☀️"}
                        </span>
                    </button>
                </div>

                <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Font Family</p>
                    <div className="grid grid-cols-2 gap-2">
                        {fontOptions.map((f) => (
                            <button
                                key={f.value}
                                onClick={() => updateTheme({ fontFamily: f.value })}
                                className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                                    fontFamily === f.value
                                        ? "border-[#800000] bg-[#800000]/5 text-[#800000] ring-1 ring-[#800000]/20"
                                        : "border-border hover:bg-accent"
                                }`}
                                style={{ fontFamily: f.value === "system-ui" ? "system-ui" : `"${f.value}", sans-serif` }}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-3">Text Size</p>
                    <div className="grid grid-cols-4 gap-2">
                        {sizeOptions.map((s) => (
                            <button
                                key={s.value}
                                onClick={() => updateTheme({ fontSize: s.value })}
                                className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                                    fontSize === s.value
                                        ? "border-[#800000] bg-[#800000]/5 text-[#800000] ring-1 ring-[#800000]/20"
                                        : "border-border hover:bg-accent"
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-medium">Brightness</p>
                        <span className="text-xs text-muted-foreground font-mono">{brightness}%</span>
                    </div>
                    <input
                        type="range"
                        min="70"
                        max="130"
                        step="5"
                        value={brightness}
                        onChange={(e) => updateTheme({ brightness: Number(e.target.value) })}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#800000]"
                        style={{
                            background: `linear-gradient(to right, #800000 0%, #800000 ${((brightness - 70) / 60) * 100}%, #e5e5e5 ${((brightness - 70) / 60) * 100}%, #e5e5e5 100%)`,
                        }}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Dim</span>
                        <span>Default</span>
                        <span>Bright</span>
                    </div>
                </div>

                {saving && (
                    <p className="text-xs text-[#C9A227] flex items-center gap-1">
                        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving preferences...
                    </p>
                )}
            </div>
        </div>
    );
}
