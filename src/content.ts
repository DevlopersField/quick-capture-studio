// Content script for area selection and Loom-style recording controls
let selectionLayer: HTMLDivElement | null = null;
let startX = 0;
let startY = 0;

function createSelectionLayer() {
    selectionLayer = document.createElement('div');
    selectionLayer.style.position = 'fixed';
    selectionLayer.style.top = '0';
    selectionLayer.style.left = '0';
    selectionLayer.style.width = '100vw';
    selectionLayer.style.height = '100vh';
    selectionLayer.style.backgroundColor = 'rgba(0,0,0,0.3)';
    selectionLayer.style.cursor = 'crosshair';
    selectionLayer.style.zIndex = '999999';

    const selectionBox = document.createElement('div');
    selectionBox.style.border = '2px solid #00d4ff';
    selectionBox.style.position = 'absolute';
    selectionBox.style.display = 'none';
    selectionLayer.appendChild(selectionBox);

    document.body.appendChild(selectionLayer);

    selectionLayer.onmousedown = (e) => {
        startX = e.clientX;
        startY = e.clientY;
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.display = 'block';

        selectionLayer!.onmousemove = (moveEvent) => {
            const width = moveEvent.clientX - startX;
            const height = moveEvent.clientY - startY;
            selectionBox.style.width = `${Math.abs(width)}px`;
            selectionBox.style.height = `${Math.abs(height)}px`;
            selectionBox.style.left = `${width > 0 ? startX : moveEvent.clientX}px`;
            selectionBox.style.top = `${height > 0 ? startY : moveEvent.clientY}px`;
        };
    };

    selectionLayer.onmouseup = async (e) => {
        selectionLayer!.onmousemove = null;
        const rect = selectionBox.getBoundingClientRect();

        // Finalize selection
        document.body.removeChild(selectionLayer!);
        selectionLayer = null;

        // Message background to capture
        if (rect.width > 5 && rect.height > 5) {
            chrome.runtime.sendMessage({
                action: "captureVisibleTab",
                area: {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                    devicePixelRatio: window.devicePixelRatio
                }
            }, async (response) => {
                if (response.dataUrl) {
                    // Create crop canvas
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        const scale = window.devicePixelRatio;
                        canvas.width = rect.width * scale;
                        canvas.height = rect.height * scale;
                        ctx?.drawImage(
                            img,
                            rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale,
                            0, 0, rect.width * scale, rect.height * scale
                        );
                        const croppedDataUrl = canvas.toDataURL();
                        chrome.storage.local.set({ capturedImage: croppedDataUrl }, () => {
                            chrome.runtime.sendMessage({ action: "openStudio" });
                        });
                    };
                    img.src = response.dataUrl;
                }
            });
        }
    };
}

let recorderWidget: HTMLDivElement | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];

function createRecordingController() {
    if (recorderWidget) return;

    recorderWidget = document.createElement('div');
    recorderWidget.id = 'oneclick-recorder-widget';
    recorderWidget.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #0d0f14;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 12px;
        padding: 8px 16px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 1000000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        color: white;
        font-family: sans-serif;
    `;

    recorderWidget.innerHTML = `
        <div style="width: 10px; height: 10px; background: #ff4444; border-radius: 50%; animation: pulse 1s infinite;"></div>
        <span id="oneclick-timer" style="font-variant-numeric: tabular-nums; font-weight: 500;">00:00</span>
        <div style="width: 1px; height: 20px; background: rgba(255,255,255,0.1);"></div>
        <button id="oneclick-stop" style="background: #ff4444; border: none; color: white; padding: 4px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">Stop</button>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
    `;
    document.head.appendChild(style);
    document.body.appendChild(recorderWidget);

    let startTime = Date.now();
    const timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const secs = (elapsed % 60).toString().padStart(2, '0');
        const timerEl = document.getElementById('oneclick-timer');
        if (timerEl) timerEl.innerText = `${mins}:${secs}`;
    }, 1000);

    document.getElementById('oneclick-stop')?.addEventListener('click', () => {
        mediaRecorder?.stop();
        clearInterval(timerInterval);
        document.body.removeChild(recorderWidget!);
        recorderWidget = null;
    });
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });

        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunks.push(e.data);
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const reader = new FileReader();
            reader.onload = () => {
                const dataUrl = reader.result as string;
                // Since dataUrl of a video can be HUGE, we might want to use a temporary URL or storage
                // For now, let's try storage but videos might exceed limits.
                // Alternative: open the tab first, then send the blob via messaging.
                chrome.storage.local.set({ capturedVideo: dataUrl }, () => {
                    chrome.runtime.sendMessage({ action: "openRecordStudio" });
                });
            };
            reader.readAsDataURL(blob);
            stream.getTracks().forEach(t => t.stop());
        };

        mediaRecorder.start();
        createRecordingController();
    } catch (err) {
        console.error("Recording failed:", err);
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startSelection") {
        createSelectionLayer();
    } else if (request.action === "startRecording") {
        startRecording();
    }
});
