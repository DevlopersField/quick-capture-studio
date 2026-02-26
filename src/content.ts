// Content script for area selection and Loom-style recording controls
let selectionLayer: HTMLDivElement | null = null;
let startX = 0;
let startY = 0;

const MAX_Z_INDEX = '2147483647';

/**
 * Expert Fixed Element Management
 * - all: hide everything
 * - headerOnly: hide everything except elements at the top
 * - footerOnly: hide everything except elements at the bottom
 * - none: show everything
 */
function toggleFixedElements(filter: 'all' | 'headerOnly' | 'footerOnly' | 'none', hide: boolean) {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
            const htmlEl = el as HTMLElement;
            // Don't hide our own widgets
            if (htmlEl.id === 'oneclick-recorder-widget' || htmlEl.id === 'oneclick-selection-overlay' || htmlEl.id === 'oneclick-progress-overlay' || htmlEl.id === 'oneclick-ready-overlay') {
                htmlEl.style.setProperty('z-index', MAX_Z_INDEX, 'important');
                return;
            }

            if (hide) {
                const rect = htmlEl.getBoundingClientRect();
                const isTop = rect.top < 150; // Heuristic for header
                const isBottom = rect.bottom > (window.innerHeight - 150); // Heuristic for footer

                let shouldHide = true;
                if (filter === 'headerOnly' && isTop && !isBottom) shouldHide = false;
                if (filter === 'footerOnly' && isBottom && !isTop) shouldHide = false;
                if (filter === 'none') shouldHide = false;

                if (shouldHide) {
                    if (htmlEl.dataset.originalVisibility === undefined) {
                        htmlEl.dataset.originalVisibility = htmlEl.style.visibility;
                    }
                    htmlEl.style.setProperty('visibility', 'hidden', 'important');
                } else {
                    htmlEl.style.visibility = htmlEl.dataset.originalVisibility || '';
                }
            } else {
                htmlEl.style.visibility = htmlEl.dataset.originalVisibility || '';
                delete htmlEl.dataset.originalVisibility;
            }
        }
    });
}

async function captureFullPage() {
    const originalScrollPos = { x: window.scrollX, y: window.scrollY };
    const scrollingElement = document.scrollingElement || document.documentElement;

    // Measurement: get the full scrollable area accurately
    const documentHeight = Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
    );
    const documentWidth = Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth,
        document.body.clientWidth,
        document.documentElement.clientWidth
    );

    const viewportHeight = window.innerHeight;
    const scale = window.devicePixelRatio;

    const canvas = document.createElement('canvas');
    canvas.width = documentWidth * scale;
    canvas.height = documentHeight * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Show progress overlay with max z-index
    const overlay = document.createElement('div');
    overlay.id = 'oneclick-progress-overlay';
    overlay.style.cssText = `
        position: fixed; top: 20px; right: 20px; 
        background: #0d0f14; color: white; padding: 12px 20px; 
        border-radius: 8px; z-index: ${MAX_Z_INDEX} !important; font-family: sans-serif;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
        pointer-events: none;
    `;
    overlay.innerText = "Initializing Full Page Capture...";
    document.body.appendChild(overlay);

    // Hide scrollbars initially
    const originalOverflow = document.documentElement.style.overflow;
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');

    let currentY = 0;
    const scrollSteps = [];
    while (currentY < documentHeight) {
        scrollSteps.push(currentY);
        currentY += viewportHeight;
        if (currentY >= documentHeight) {
            // Adjust last step to be exactly at the bottom if needed
            if (scrollSteps[scrollSteps.length - 1] + viewportHeight < documentHeight) {
                scrollSteps.push(documentHeight - viewportHeight);
            }
            break;
        }
    }

    for (let i = 0; i < scrollSteps.length; i++) {
        const y = scrollSteps[i];
        window.scrollTo(0, y);

        // Define visibility for this step
        let filter: 'all' | 'headerOnly' | 'footerOnly' | 'none' = 'all';
        if (i === 0) filter = 'headerOnly';
        else if (i === scrollSteps.length - 1) filter = 'footerOnly';

        toggleFixedElements(filter, true);

        // Wait for page to settle and elements to render
        await new Promise(resolve => setTimeout(resolve, 800));

        // Hide extension UI before capture
        overlay.style.setProperty('visibility', 'hidden', 'important');
        if (recorderWidget) recorderWidget.style.setProperty('visibility', 'hidden', 'important');

        const dataUrl = await new Promise<string>((resolve) => {
            chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => {
                resolve(response.dataUrl);
            });
        });

        // Restore extension UI after capture
        overlay.style.setProperty('visibility', 'visible', 'important');
        if (recorderWidget) recorderWidget.style.setProperty('visibility', 'visible', 'important');

        const img = await new Promise<HTMLImageElement>((resolve) => {
            const imgEl = new Image();
            imgEl.onload = () => resolve(imgEl);
            imgEl.src = dataUrl;
        });

        // Calculate drawing region
        let sourceY = 0;
        let destY = y;
        let drawHeight = viewportHeight;

        // If we overlap with the previous step (happens on the last step usually)
        if (i > 0) {
            const prevY = scrollSteps[i - 1];
            if (y < prevY + viewportHeight) {
                const overlap = (prevY + viewportHeight) - y;
                sourceY = overlap * scale;
                destY = y + overlap;
                drawHeight = viewportHeight - overlap;
            }
        }

        // Final bounds check
        if (destY + drawHeight > documentHeight) {
            drawHeight = documentHeight - destY;
        }

        if (drawHeight > 0) {
            ctx.drawImage(
                img,
                0, sourceY, img.width, drawHeight * scale,
                0, destY * scale, img.width, drawHeight * scale
            );
        }

        overlay.innerText = `Capturing... ${Math.round(((i + 1) / scrollSteps.length) * 100)}%`;

        // Restore elements before moving to next step to avoid state pollution
        toggleFixedElements('none', false);
    }

    const fullDataUrl = canvas.toDataURL('image/png');

    // Cleanup
    document.documentElement.style.overflow = originalOverflow;
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
    window.scrollTo(originalScrollPos.x, originalScrollPos.y);

    chrome.storage.local.set({ capturedImage: fullDataUrl }, () => {
        chrome.runtime.sendMessage({ action: "openStudio" });
    });
}

function createSelectionLayer() {
    selectionLayer = document.createElement('div');
    selectionLayer.id = 'oneclick-selection-overlay';
    selectionLayer.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.3); cursor: crosshair; z-index: ${MAX_Z_INDEX} !important;
    `;

    const selectionBox = document.createElement('div');
    selectionBox.style.cssText = `
        border: 2px solid #00d4ff; position: absolute; display: none;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
    `;
    selectionLayer.appendChild(selectionBox);
    document.body.appendChild(selectionLayer);

    selectionLayer.onmousedown = (e) => {
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
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

    selectionLayer.onmouseup = (e) => {
        selectionLayer!.onmousemove = null;
        const rect = selectionBox.getBoundingClientRect();

        if (rect.width > 5 && rect.height > 5) {
            const controls = document.createElement('div');
            controls.style.cssText = `
                position: absolute; top: ${rect.bottom + 10}px; left: ${rect.right - 80}px;
                display: flex; gap: 8px; background: #0d0f14; padding: 6px; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1);
                z-index: ${MAX_Z_INDEX} !important;
            `;

            const captureBtn = document.createElement('button');
            captureBtn.innerText = 'Capture';
            captureBtn.style.cssText = `background: #00d4ff; color: black; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;`;

            const cancelBtn = document.createElement('button');
            cancelBtn.innerText = 'Cancel';
            cancelBtn.style.cssText = `background: rgba(255,255,255,0.1); color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;`;

            controls.appendChild(captureBtn);
            controls.appendChild(cancelBtn);
            selectionLayer!.appendChild(controls);

            controls.onmousedown = (e) => e.stopPropagation();

            captureBtn.onclick = async () => {
                document.body.removeChild(selectionLayer!);
                selectionLayer = null;

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
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const scale = window.devicePixelRatio;
                            canvas.width = rect.width * scale;
                            canvas.height = rect.height * scale;
                            ctx?.drawImage(img, rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale, 0, 0, rect.width * scale, rect.height * scale);
                            const croppedDataUrl = canvas.toDataURL();
                            chrome.storage.local.set({ capturedImage: croppedDataUrl }, () => {
                                chrome.runtime.sendMessage({ action: "openStudio" });
                            });
                        };
                        img.src = response.dataUrl;
                    }
                });
            };

            cancelBtn.onclick = () => {
                document.body.removeChild(selectionLayer!);
                selectionLayer = null;
            };
        } else {
            if ((e.target as HTMLElement) === selectionLayer) {
                document.body.removeChild(selectionLayer!);
                selectionLayer = null;
            }
        }
    };
}

let recorderWidget: HTMLDivElement | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingTimerInterval: any = null;
let currentStream: MediaStream | null = null;

function createRecordingController() {
    if (recorderWidget) return;

    recorderWidget = document.createElement('div');
    recorderWidget.id = 'oneclick-recorder-widget';
    recorderWidget.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: rgba(13, 15, 20, 0.9); backdrop-filter: blur(12px);
        border: 1px solid rgba(255,256,255,0.1); border-radius: 16px;
        padding: 10px 20px; display: flex; align-items: center; gap: 16px;
        z-index: ${MAX_Z_INDEX} !important; box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        color: white; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        user-select: none;
    `;

    recorderWidget.innerHTML = `
        <div style="display: flex; items-center; gap: 10px; padding-right: 12px; border-right: 1px solid rgba(255,255,255,0.1);">
            <div id="oneclick-record-status" style="width: 12px; height: 12px; background: #ff4444; border-radius: 50%; animation: pulse 1s infinite;"></div>
            <span id="oneclick-timer" style="font-variant-numeric: tabular-nums; font-weight: 600; font-size: 14px; min-width: 45px;">00:00</span>
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="oneclick-pause" title="Pause/Resume" style="background: rgba(255,255,255,0.05); border: none; color: white; padding: 6px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="oneclick-pause-icon"><rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/></svg>
            </button>
            <button id="oneclick-restart" title="Restart" style="background: rgba(255,255,255,0.05); border: none; color: white; padding: 6px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; transition: all 0.2s;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            </button>
            <button id="oneclick-stop" style="background: #ff4444; border: none; color: white; padding: 6px 16px; border-radius: 10px; cursor: pointer; font-weight: 600; font-size: 13px; transition: all 0.2s;">Stop</button>
        </div>
    `;

    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.9); } 100% { opacity: 1; transform: scale(1); } }
        #oneclick-recorder-widget button:hover { transform: translateY(-1px); background: rgba(255,255,255,0.15); }
    `;
    document.head.appendChild(style);
    document.body.appendChild(recorderWidget);

    let elapsedTime = 0;
    recordingTimerInterval = setInterval(() => {
        if (mediaRecorder?.state === 'recording') {
            elapsedTime++;
            const mins = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
            const secs = (elapsedTime % 60).toString().padStart(2, '0');
            const timerEl = document.getElementById('oneclick-timer');
            if (timerEl) timerEl.innerText = `${mins}:${secs}`;
        }
    }, 1000);

    const pauseBtn = document.getElementById('oneclick-pause');
    const pauseIcon = document.getElementById('oneclick-pause-icon');
    pauseBtn?.addEventListener('click', () => {
        if (mediaRecorder?.state === 'recording') {
            mediaRecorder.pause();
            if (pauseIcon) pauseIcon.innerHTML = `<path d="m5 3 14 9-14 9V3z"/>`;
            const statusEl = document.getElementById('oneclick-record-status');
            if (statusEl) statusEl.style.animation = 'none';
        } else if (mediaRecorder?.state === 'paused') {
            mediaRecorder.resume();
            if (pauseIcon) pauseIcon.innerHTML = `<rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/>`;
            const statusEl = document.getElementById('oneclick-record-status');
            if (statusEl) statusEl.style.animation = 'pulse 1s infinite';
        }
    });

    document.getElementById('oneclick-restart')?.addEventListener('click', () => {
        if (confirm('Are you sure you want to restart the recording?')) {
            cleanupRecording();
            startRecording();
        }
    });

    document.getElementById('oneclick-stop')?.addEventListener('click', () => {
        mediaRecorder?.stop();
        cleanupRecording();
    });
}

function cleanupRecording() {
    if (recordingTimerInterval) clearInterval(recordingTimerInterval);
    if (recorderWidget) {
        document.body.removeChild(recorderWidget);
        recorderWidget = null;
    }
}

async function startRecording() {
    const overlay = document.createElement('div');
    overlay.id = 'oneclick-ready-overlay';
    overlay.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(13, 15, 20, 0.95); color: white; padding: 32px; 
        border-radius: 20px; z-index: ${MAX_Z_INDEX} !important; font-family: sans-serif;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1);
        text-align: center; backdrop-filter: blur(10px);
    `;

    overlay.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="width: 48px; height: 48px; background: #ff4444; border-radius: 50%; display: flex; align-items: center; justify-center; margin: 0 auto 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto;"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
            </div>
            <h3 style="margin: 0 0 8px; font-size: 20px;">Ready to Record?</h3>
            <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 14px;">Select the screen or window you want to capture.</p>
        </div>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="oneclick-start-record-btn" style="background: #ff4444; color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 15px;">Start Recording</button>
            <button id="oneclick-cancel-record-btn" style="background: rgba(255,255,255,0.1); color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 15px;">Cancel</button>
        </div>
    `;

    document.body.appendChild(overlay);

    return new Promise<void>((resolve) => {
        document.getElementById('oneclick-start-record-btn')?.addEventListener('click', async () => {
            document.body.removeChild(overlay);
            try {
                currentStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                mediaRecorder = new MediaRecorder(currentStream);
                recordedChunks = [];
                mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const reader = new FileReader();
                    reader.onload = () => { chrome.runtime.sendMessage({ action: "openRecordStudio", videoUrl: reader.result as string }); };
                    reader.readAsDataURL(blob);
                    currentStream?.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                createRecordingController();
                resolve();
            } catch (err) {
                console.error("Recording failed:", err);
                resolve();
            }
        });

        document.getElementById('oneclick-cancel-record-btn')?.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve();
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startSelection") {
        createSelectionLayer();
    } else if (request.action === "startRecording") {
        startRecording();
    } else if (request.action === "startFullPageCapture") {
        captureFullPage();
    }
});
