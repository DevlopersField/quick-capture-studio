import { Navbar } from "@/components/layout/Navbar";
import { Shield } from "lucide-react";

export default function Privacy() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Navbar />

            <main className="pt-32 pb-16 px-6">
                <div className="max-w-3xl mx-auto glass-panel rounded-3xl p-8 md:p-12 border border-border/40 shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                            <Shield className="text-primary" size={24} />
                        </div>
                        <div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                                    <p className="text-sm text-muted-foreground">Last updated: February 16, 2026</p>
                                    <span className="hidden sm:block text-muted-foreground/30">•</span>
                                    <a
                                        href="https://1clickcapture.netlify.app/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-primary hover:underline font-medium"
                                    >
                                        1clickcapture.netlify.app
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                        <section>
                            <p className="text-lg leading-relaxed text-muted-foreground">
                                <strong>1ClickCapture</strong> ("we", "our", or "the extension") respects your privacy. This Privacy Policy explains how information is handled when you use the 1ClickCapture Chrome extension.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">1</span>
                                Information We Collect
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                1ClickCapture does not collect, store, transmit, or sell any personal information.
                            </p>
                            <p className="text-muted-foreground leading-relaxed mt-4">
                                The extension operates locally within your browser and analyzes the currently active webpage to provide capturing and recording insights.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">2</span>
                                Permissions Used
                            </h2>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-secondary/30 border border-border/20">
                                    <p className="font-semibold text-foreground mb-1">Active Tab Permission</p>
                                    <p className="text-sm text-muted-foreground">Used to analyze the content of the webpage you are currently viewing.</p>
                                </div>
                                <div className="p-4 rounded-xl bg-secondary/30 border border-border/20">
                                    <p className="font-semibold text-foreground mb-1">Storage Permission</p>
                                    <p className="text-sm text-muted-foreground">Used to store user preferences locally within your browser.</p>
                                </div>
                            </div>
                            <p className="text-sm text-muted-foreground mt-4 italic">No browsing history is stored externally.</p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">3</span>
                                Data Processing
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                All website analysis is performed locally within the user's browser. We do not transmit webpage content to external servers.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">4</span>
                                Third-Party Services
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                1ClickCapture does not use third-party analytics, tracking tools, or advertising services.
                            </p>
                            <p className="text-muted-foreground leading-relaxed mt-4">
                                If future updates introduce third-party integrations, this policy will be updated accordingly.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">5</span>
                                Data Sharing
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We do not sell, trade, or share any user data with third parties.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">6</span>
                                Children's Privacy
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                1ClickCapture does not knowingly collect personal information from children under 13 years of age.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">7</span>
                                Changes to This Policy
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised "Last updated" date.
                            </p>
                        </section>

                        <section className="pt-8 border-t border-border/40">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">8</span>
                                Contact Information
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                If you have any questions regarding this Privacy Policy, you may contact us at:
                            </p>
                            <a
                                href="mailto:virajdev3052003@gmail.com"
                                className="inline-block mt-4 text-primary font-semibold hover:underline decoration-2 underline-offset-4"
                            >
                                virajdev3052003@gmail.com
                            </a>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
