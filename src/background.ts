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
        const url = chrome.runtime.getURL(`index.html#/?mode=record&videoUrl=${encodeURIComponent(request.videoUrl)}`);
        chrome.tabs.create({ url });
    }
});
