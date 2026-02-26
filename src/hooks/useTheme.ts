import { useState, useEffect, useCallback } from "react";

export type Theme = "dark" | "light" | "system";

export function useTheme() {
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

        // Also update data-theme attribute if needed by any UI libraries
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

        // Listen for system theme changes if in system mode
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

    return { theme, setTheme };
}
