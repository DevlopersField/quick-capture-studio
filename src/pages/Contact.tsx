import { Link } from "react-router-dom";
import { ChevronLeft, Mail, Globe, Clock, MessageSquare } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Logo } from "@/components/layout/Logo";

export default function Contact() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            {/* Custom Header for Contact Page following screenshot */}
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 animate-fade-in">
                <Link
                    to="/"
                    className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group"
                >
                    <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to 1ClickCapture
                </Link>
                <Logo className="opacity-80" />
            </nav>

            <main className="pt-32 pb-16 px-6 max-w-5xl mx-auto flex flex-col items-center">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">How can we help?</h1>
                    <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed">
                        Have questions about 1ClickCapture or need technical assistance? <br className="hidden md:block" />
                        Our team is here to support you.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-6 w-full mb-6">
                    {/* Email Support Card */}
                    <div className="glass-panel p-8 rounded-3xl border border-border/40 hover:border-primary/40 transition-all group flex flex-col h-full items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
                            <Mail className="text-primary" size={24} />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Email Support</h3>
                        <p className="text-muted-foreground mb-8 leading-relaxed max-w-sm">
                            For general inquiries and bug reports, reach out via email.
                        </p>
                        <a
                            href="mailto:virajdev3052003@gmail.com"
                            className="mt-auto text-primary font-bold hover:underline decoration-2 underline-offset-4 tracking-tight text-xl"
                        >
                            virajdev3052003@gmail.com
                        </a>
                    </div>
                </div>

                {/* Info & Feedback Section */}
                <div className="glass-panel p-8 rounded-3xl border border-border/40 w-full mb-16">
                    <div className="flex flex-col md:flex-row gap-8 md:gap-16">
                        <div className="flex items-start gap-5 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center border border-green-500/20 shrink-0">
                                <Clock className="text-green-500" size={24} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold mb-1">Response Time</h4>
                                <p className="text-muted-foreground">We typically respond within 24-48 hours.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-5 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shrink-0">
                                <MessageSquare className="text-purple-500" size={24} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold mb-1">Feedback</h4>
                                <p className="text-muted-foreground">Love the tool? Please leave a review on the Chrome Web Store.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full border-t border-border/40 pt-12 text-center">
                    <p className="text-sm text-muted-foreground pb-4">
                        © 2026 1ClickCapture. All rights reserved.
                    </p>
                </div>
            </main>
        </div>
    );
}
