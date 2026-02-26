// Background script for 1ClickCapture
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "captureVisibleTab") {
        chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
            sendResponse({ dataUrl });
        });
        return true; // async response
    }

    if (request.action === "openStudio") {
        const url = chrome.runtime.getURL("index.html#/?mode=capture");
        chrome.tabs.create({ url });
    }

    if (request.action === "openRecordStudio") {
        const url = chrome.runtime.getURL("index.html#/?mode=capture");
        chrome.tabs.create({ url });
    }

    if (request.action === "setDrawingTool") {
        // Persist state for new/reloaded tabs
        chrome.storage.local.set({ 
            currentTool: request.tool, 
            currentColor: request.color || '#00d4ff' 
        });

        // Forward tool change to all non-extension tabs
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id && !tab.url?.startsWith("chrome-extension://")) {
                    chrome.tabs.sendMessage(tab.id, {
                        action: "setDrawingTool",
                        tool: request.tool,
                        color: request.color,
                    }).catch(() => {});
                }
            });
        });
    }

    if (request.action === "clearDrawingCanvas") {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id && !tab.url?.startsWith("chrome-extension://")) {
                    chrome.tabs.sendMessage(tab.id, { action: "clearDrawingCanvas" }).catch(() => {});
                }
            });
        });
    }

    if (request.action === "syncDrawing") {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id && tab.id !== sender.tab?.id && !tab.url?.startsWith("chrome-extension://")) {
                    chrome.tabs.sendMessage(tab.id, { 
                        action: "syncDrawing", 
                        drawingData: request.drawingData,
                        currentColor: request.currentColor
                    }).catch(() => {});
                }
            });
        });
    }

    if (request.action === "syncRecordingStart") {
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: "syncRecordingStart" }).catch(() => {});
                }
            });
        });
    }

    if (request.action === "stopRecording") {
        // Relay stop command to all tabs so they can cleanup
        // The actual recording tab will handle the file finalization
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.id) {
                    chrome.tabs.sendMessage(tab.id, { action: "stopRecording" }).catch(() => {});
                }
            });
        });
        chrome.storage.local.remove(["isRecording", "recordingTabId"]);
    }
});
