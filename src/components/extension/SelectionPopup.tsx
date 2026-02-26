import { Camera, Monitor, Scissors, Video } from "lucide-react";
import { useCallback } from "react";

export function SelectionPopup() {
    const handleAction = useCallback(async (mode: string) => {
        if (mode === "record") {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
                chrome.tabs.sendMessage(tab.id, { action: "startRecording" });
                window.close();
            }
        } else {
            const url = chrome.runtime.getURL(`index.html#/?mode=${mode}`);
            chrome.tabs.create({ url });
            window.close();
        }
    }, []);

    const handleCapture = useCallback(async (isFullPage: boolean) => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab?.id) return;

            if (isFullPage) {
                chrome.tabs.sendMessage(tab.id, { action: "startFullPage" });
                window.close();
            } else {
                // Trigger area selection in content script
                chrome.tabs.sendMessage(tab.id, { action: "startSelection" });
                window.close();
            }
        } catch (err) {
            console.error("Action failed:", err);
        }
    }, []);

    return (
        <div className="w-[300px] bg-[#0d0f14] p-4 text-white overflow-hidden border-border/50 select-none">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                    <Camera size={16} className="text-primary-foreground" />
                </div>
                <span className="font-semibold tracking-tight">1ClickCapture</span>
            </div>

            <div className="grid gap-2">
                <button
                    onClick={() => handleCapture(true)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 transition-all group"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-colors">
                        <Monitor size={18} className="text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium">Capture Full Page</div>
                        <div className="text-[10px] text-muted-foreground">Screenshot entire viewport</div>
                    </div>
                </button>

                <button
                    onClick={() => handleCapture(false)}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-primary/20 border border-white/10 hover:border-primary/40 transition-all group"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-primary/20 transition-colors">
                        <Scissors size={18} className="text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium">Selected Area</div>
                        <div className="text-[10px] text-muted-foreground">Select region to capture</div>
                    </div>
                </button>

                <button
                    onClick={() => handleAction("record")}
                    className="flex items-center gap-3 w-full p-3 rounded-xl bg-white/5 hover:bg-destructive/20 border border-white/10 hover:border-destructive/40 transition-all group"
                >
                    <div className="p-2 rounded-lg bg-white/5 group-hover:bg-destructive/20 transition-colors">
                        <Video size={18} className="text-destructive" />
                    </div>
                    <div className="text-left">
                        <div className="text-sm font-medium">Video & Loom Record</div>
                        <div className="text-[10px] text-muted-foreground">Record current screen session</div>
                    </div>
                </button>
            </div>
        </div>
    );
}
