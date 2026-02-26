import { Link } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Camera, Shield, Zap, Sparkles, ArrowRight } from "lucide-react";

export default function Landing() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Navbar />

            <main className="pt-24 pb-16 px-6">
                {/* Hero Section */}
                <section className="max-w-6xl mx-auto flex flex-col items-center text-center mt-20 mb-32">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
                        <Sparkles size={14} className="text-primary" />
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">New: AI-Powered Annotations</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 animate-fade-in text-balance">
                        Capture, Annotate & <br />
                        <span className="text-primary">Share in Seconds</span>
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mb-12 animate-fade-in delay-100 leading-relaxed">
                        The ultimate screen capture and recording tool for developers and designers.
                        Powerful annotations, seamless sharing, and 100% privacy.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in delay-200">
                        <Link
                            to="/studio"
                            className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground text-lg font-bold hover:scale-105 transition-all shadow-xl shadow-primary/30 flex items-center gap-2 group"
                        >
                            Open Studio <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <button className="px-8 py-4 rounded-2xl bg-secondary text-secondary-foreground text-lg font-bold hover:bg-secondary/80 transition-all border border-border/40">
                            Add to Chrome
                        </button>
                    </div>

                    {/* Dashboard Preview Hook */}
                    <div className="mt-20 w-full max-w-5xl relative animate-fade-in delay-300">
                        <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-[3rem] -z-10" />
                        <div className="glass-panel rounded-3xl overflow-hidden border border-border/60 shadow-2xl aspect-video bg-secondary/30 flex items-center justify-center p-8">
                            <div className="flex flex-col items-center gap-4 text-muted-foreground/60">
                                <Camera size={64} strokeWidth={1} />
                                <p className="font-medium">Studio Preview</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 py-20 px-4">
                    <FeatureCard
                        icon={<Zap className="text-yellow-500" />}
                        title="Instant Captures"
                        description="Take full page or area screenshots with a single click or keyboard shortcut."
                    />
                    <FeatureCard
                        icon={<Sparkles className="text-purple-500" />}
                        title="Rich Annotations"
                        description="Draw, add text, arrows, and blur sensitive info directly in your browser."
                    />
                    <FeatureCard
                        icon={<Shield className="text-green-500" />}
                        title="Privacy First"
                        description="All processing happens locally. We never store or transmit your data."
                    />
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t border-border/40 py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <Camera size={20} className="text-primary" />
                            <span className="font-bold text-xl">1ClickCapture</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            © 2026 1ClickCapture. All rights reserved.
                        </p>
                    </div>

                    <div className="flex items-center gap-8">
                        <Link to="/studio" className="text-sm font-medium text-muted-foreground hover:text-foreground">Studio</Link>
                        <Link to="/privacy" className="text-sm font-medium text-muted-foreground hover:text-foreground">Privacy Policy</Link>
                        <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground">Contact</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
    return (
        <div className="p-8 rounded-3xl glass-panel border border-border/40 hover:border-primary/40 transition-all group">
            <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                {icon}
            </div>
            <h3 className="text-xl font-bold mb-3">{title}</h3>
            <p className="text-muted-foreground leading-relaxed">
                {description}
            </p>
        </div>
    );
}
