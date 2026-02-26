import { Navbar } from "@/components/layout/Navbar";
import { FileText } from "lucide-react";

export default function Terms() {
    return (
        <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
            <Navbar />

            <main className="pt-32 pb-16 px-6">
                <div className="max-w-3xl mx-auto glass-panel rounded-3xl p-8 md:p-12 border border-border/40 shadow-2xl">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            <FileText className="text-orange-500" size={24} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
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

                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">1</span>
                                Acceptance of Terms
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                By installing and using the **1ClickCapture** Chrome extension, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the extension.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">2</span>
                                Description of Service
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                1ClickCapture provides tools for screen capturing, recording, and image annotation. All processing and storage of captured data occur locally on your device.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">3</span>
                                Privacy and Data
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Your privacy is paramount. As detailed in our Privacy Policy, 1ClickCapture does not collect or transmit any personal data. You are solely responsible for the content you capture and share using our tools.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">4</span>
                                User Responsibilities
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                You agree not to use 1ClickCapture for any illegal or unauthorized purposes. You must not violate any laws in your jurisdiction while using the service.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">5</span>
                                Intellectual Property
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                The 1ClickCapture extension and its original content, features, and functionality are owned by its developers and are protected by international copyright, trademark, and other intellectual property laws.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">6</span>
                                Disclaimers
                            </h2>
                            <p className="text-muted-foreground leading-relaxed italic">
                                The service is provided on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, expressed or implied, regarding the reliability or availability of the service.
                            </p>
                        </section>

                        <section className="pt-8 border-t border-border/40">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs">7</span>
                                Contact
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                For any questions regarding these Terms, please contact us at:
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
