"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface ThemeConfig {
    fontFamily: string;
    fontSize: string;
    brightness: number;
    darkMode: boolean;
}

interface ThemeContextType extends ThemeConfig {
    updateTheme: (updates: Partial<ThemeConfig>) => void;
    saving: boolean;
}

const defaultTheme: ThemeConfig = {
    fontFamily: "Inter",
    fontSize: "default",
    brightness: 100,
    darkMode: false,
};

const ThemeContext = createContext<ThemeContextType>({
    ...defaultTheme,
    updateTheme: () => {},
    saving: false,
});

export function useTheme() {
    return useContext(ThemeContext);
}

const fontSizeMap: Record<string, string> = {
    small: "14px",
    default: "16px",
    large: "18px",
    "extra-large": "20px",
};

function applyThemeToDOM(config: ThemeConfig) {
    const html = document.documentElement;
    html.style.setProperty("--app-font-family", `"${config.fontFamily}", system-ui, sans-serif`);
    html.style.setProperty("--app-font-size", fontSizeMap[config.fontSize] || "16px");
    // Use CSS variable instead of body.style.filter to avoid breaking scrollbars (Task 13)
    html.style.setProperty("--app-brightness", `${config.brightness}%`);
    html.style.fontSize = fontSizeMap[config.fontSize] || "16px";
    document.body.style.fontFamily = `"${config.fontFamily}", system-ui, sans-serif`;
    // Do NOT set body.style.filter — it creates a new stacking context that clips fixed scrollbars

    if (config.darkMode) {
        html.classList.add("dark");
    } else {
        html.classList.remove("dark");
    }

    // Persist dark mode preference for FOUC prevention (Task 20)
    try {
        localStorage.setItem("itech-dark-mode", String(config.darkMode));
    } catch { }
}

interface UserPrefs {
    font_family?: string;
    font_size?: string;
    brightness?: number;
    dark_mode?: boolean;
}

export function ThemeProvider({ children, initialPrefs }: { children: ReactNode; initialPrefs?: UserPrefs }) {
    const [theme, setTheme] = useState<ThemeConfig>(() => {
        if (initialPrefs) {
            return {
                fontFamily: initialPrefs.font_family || "Inter",
                fontSize: initialPrefs.font_size || "default",
                brightness: Number(initialPrefs.brightness) || 100,
                darkMode: initialPrefs.dark_mode || false,
            };
        }
        return defaultTheme;
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        applyThemeToDOM(theme);
    }, [theme]);

    useEffect(() => {
        if (!initialPrefs) {
            const supabase = createClient();
            supabase.auth.getUser().then(({ data: { user } }) => {
                if (user) {
                    supabase
                        .from("user_preferences")
                        .select("*")
                        .eq("user_id", user.id)
                        .maybeSingle()
                        .then(({ data }) => {
                            if (data) {
                                const loaded: ThemeConfig = {
                                    fontFamily: data.font_family || "Inter",
                                    fontSize: data.font_size || "default",
                                    brightness: Number(data.brightness) || 100,
                                    darkMode: data.dark_mode || false,
                                };
                                setTheme(loaded);
                            }
                        });
                }
            });
        }
    }, [initialPrefs]);

    const updateTheme = useCallback(async (updates: Partial<ThemeConfig>) => {
        const newTheme = { ...theme, ...updates };
        setTheme(newTheme);
        applyThemeToDOM(newTheme);

        setSaving(true);
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await supabase
                    .from("user_preferences")
                    .upsert({
                        user_id: user.id,
                        font_family: newTheme.fontFamily,
                        font_size: newTheme.fontSize,
                        brightness: newTheme.brightness,
                        dark_mode: newTheme.darkMode,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: "user_id" });
            }
        } catch (err) {
            console.error("Failed to save preferences:", err);
        } finally {
            setSaving(false);
        }
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ ...theme, updateTheme, saving }}>
            {theme.brightness !== 100 && (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        pointerEvents: "none",
                        backdropFilter: `brightness(${theme.brightness / 100})`,
                        WebkitBackdropFilter: `brightness(${theme.brightness / 100})`,
                        zIndex: 99999,
                    }}
                />
            )}
            {children}
        </ThemeContext.Provider>
    );
}
