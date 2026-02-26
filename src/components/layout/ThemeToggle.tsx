import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
    const { theme, setTheme } = useTheme();

    return (
        <div className={`flex items-center gap-1.5 glass-panel rounded-xl p-1 shadow-sm border border-border/40 ${className}`}>
            <button
                onClick={() => setTheme("light")}
                className={`p-1.5 rounded-lg transition-all duration-200 ${theme === "light" ? "bg-white dark:bg-secondary text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                title="Light Mode"
            >
                <Sun size={16} />
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={`p-1.5 rounded-lg transition-all duration-200 ${theme === "dark" ? "bg-secondary text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                title="Dark Mode"
            >
                <Moon size={16} />
            </button>
            <button
                onClick={() => setTheme("system")}
                className={`p-1.5 rounded-lg transition-all duration-200 ${theme === "system" ? "bg-white dark:bg-secondary text-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                title="System Mode"
            >
                <Monitor size={16} />
            </button>
        </div>
    );
}
