import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type Theme = "dark" | "light" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem("1click-theme") as Theme) || "system";
    });

    const applyTheme = useCallback((t: Theme) => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark");

        let effectiveTheme = t;
        if (t === "system") {
            effectiveTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        }

        root.classList.add(effectiveTheme);
        root.setAttribute("data-theme", effectiveTheme);

        // Tailwind specific dark mode strategy
        if (effectiveTheme === "dark") {
            root.classList.add("dark");
        } else {
            root.classList.remove("dark");
        }
    }, []);

    useEffect(() => {
        applyTheme(theme);

        if (theme === "system") {
            const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
            const handleChange = () => applyTheme("system");
            mediaQuery.addEventListener("change", handleChange);
            return () => mediaQuery.removeEventListener("change", handleChange);
        }
    }, [theme, applyTheme]);

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
        localStorage.setItem("1click-theme", t);
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useThemeContext() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useThemeContext must be used within a ThemeProvider");
    }
    return context;
}
