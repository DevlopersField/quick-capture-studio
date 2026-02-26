import { Camera, Monitor, Scissors, Video } from "lucide-react";
import { useCallback } from "react";

export function SelectionPopup() {
    const handleAction = useCallback((mode: string) => {
        const url = chrome.runtime.getURL(`index.html#/?mode=${mode}`);
        chrome.tabs.create({ url });
        window.close();
    }, []);

    const handleCapture = useCallback(async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;

            const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
            await chrome.storage.local.set({ capturedImage: dataUrl });

            const url = chrome.runtime.getURL("index.html#/?mode=capture");
            chrome.tabs.create({ url });
            window.close();
        } catch (err) {
            console.error("Capture failed:", err);
        }
    }, []);

    return (
        <div className="w-[320px] bg-[#0d0f14] p-4 text-white overflow-hidden border-border/50">
            <div className="flex items-center gap-2 mb-4 border-b border-border/20 pb-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Camera size={16} className="text-primary-foreground" />
                </div>
                <span className="font-semibold tracking-tight">1ClickCapture</span>
            </div>

            <div className="grid gap-2">
                <button
                    onClick={handleCapture}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 transition-all group"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/20">
                        <Monitor size={18} className="text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium">Capture Full Page</div>
                        <div className="text-[10px] text-muted-foreground">Screenshot the current tab instantly</div>
                    </div>
                </button>

                <button
                    onClick={() => handleAction("record")}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-destructive/20 border border-white/10 hover:border-destructive/40 transition-all group"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-destructive/20">
                        <Video size={18} className="text-destructive" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium">Record Screen / Loom</div>
                        <div className="text-[10px] text-muted-foreground">Start recording in a separate tab</div>
                    </div>
                </button>

                <button
                    onClick={() => handleAction("upload")}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 transition-all group"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/20">
                        <Scissors size={18} className="text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium">Open Studio</div>
                        <div className="text-[10px] text-muted-foreground">Full workspace for image editing</div>
                    </div>
                </button>
            </div>

            <div className="mt-4 pt-2 border-t border-border/10 text-center">
                <p className="text-[10px] text-white/40">Powered by 1ClickCapture Studio</p>
            </div>
        </div>
    );
}
