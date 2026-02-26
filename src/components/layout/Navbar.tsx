import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 glass-panel border-b border-border/40 animate-fade-in">
            <Link to="/" className="hover:opacity-80 transition-opacity">
                <Logo />
            </Link>

            <div className="flex items-center gap-4">
                <Link
                    to="/studio"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                >
                    Studio
                </Link>
                <Link
                    to="/privacy"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                >
                    Privacy
                </Link>
                <Link
                    to="/contact"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                >
                    Contact
                </Link>
                <div className="w-[1px] h-4 bg-border/40 mx-2 hidden sm:block" />
                <ThemeToggle />
                <Link
                    to="/studio"
                    className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    Get Started
                </Link>
            </div>
        </nav>
    );
}
