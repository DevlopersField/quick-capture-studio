import { useThemeContext } from "@/providers/ThemeProvider";

export type { Theme } from "@/providers/ThemeProvider";

export function useTheme() {
    return useThemeContext();
}
