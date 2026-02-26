// Content script for area selection and Loom-style recording controls
let selectionLayer: HTMLDivElement | null = null;
let startX = 0;
let startY = 0;

const MAX_Z_INDEX = '2147483647';

/**
 * Expert Fixed Element Management
 */
function toggleFixedElements(filter: 'all' | 'headerOnly' | 'footerOnly' | 'none', hide: boolean) {
    const elements = document.querySelectorAll('*');
    elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
            const htmlEl = el as HTMLElement;
            if (htmlEl.id.startsWith('oneclick-')) {
                htmlEl.style.setProperty('z-index', MAX_Z_INDEX, 'important');
                return;
            }

            if (hide) {
                const rect = htmlEl.getBoundingClientRect();
                const isTop = rect.top < 150;
                const isBottom = rect.bottom > (window.innerHeight - 150);

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

    // Real document dimensions (without buffer)
    const realDocumentHeight = Math.ceil(Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight,
        document.body.getBoundingClientRect().height,
        document.documentElement.getBoundingClientRect().height
    ));
    const documentWidth = Math.ceil(Math.max(
        document.body.scrollWidth, document.documentElement.scrollWidth,
        document.body.offsetWidth, document.documentElement.offsetWidth,
        document.body.clientWidth, document.documentElement.clientWidth,
        document.body.getBoundingClientRect().width,
        document.documentElement.getBoundingClientRect().width
    ));

    // Scrolling limit with 150px buffer for stability
    const scrollableHeight = realDocumentHeight + 150;

    const viewportHeight = window.innerHeight;
    const scale = window.devicePixelRatio;

    // Canvas should only be the REAL size of the page
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(documentWidth * scale);
    canvas.height = Math.round(realDocumentHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const overlay = document.createElement('div');
    overlay.id = 'oneclick-progress-overlay';
    overlay.style.cssText = `position: fixed; top: 20px; right: 20px; background: rgba(0,0,0,0.8); color: white; padding: 12px 20px; border-radius: 12px; z-index: ${MAX_Z_INDEX} !important; font-family: sans-serif; pointer-events: none; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); display: none;`;
    document.body.appendChild(overlay);

    const originalOverflow = document.documentElement.style.overflow;
    const originalPaddingBottom = document.body.style.paddingBottom;
    const originalDocPaddingBottom = document.documentElement.style.paddingBottom;

    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    // Extend body to allow scrolling beyond original content
    document.body.style.setProperty('padding-bottom', '200px', 'important');
    document.documentElement.style.setProperty('padding-bottom', '200px', 'important');

    const scrollStep = Math.floor(viewportHeight * 0.85);
    const scrollLimit = Math.max(0, realDocumentHeight - viewportHeight + 200);

    const scrollSteps = [];
    let curr = 0;
    while (curr < scrollLimit) {
        scrollSteps.push(curr);
        curr += scrollStep;
    }
    scrollSteps.push(scrollLimit);

    let lastCanvasY = 0;

    for (let i = 0; i < scrollSteps.length; i++) {
        const targetY = scrollSteps[i];
        window.scrollTo(0, targetY);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Important: Force actualY to be integer to avoid fractional offsets causing gaps
        const actualY = Math.floor(window.scrollY);

        let filter: 'all' | 'headerOnly' | 'footerOnly' | 'none' = 'all';
        if (i === 0) filter = 'headerOnly';
        else if (i === scrollSteps.length - 1) filter = 'footerOnly';

        toggleFixedElements(filter, true);
        await new Promise(resolve => setTimeout(resolve, 400));

        if (selectionLayer) selectionLayer.style.setProperty('display', 'none', 'important');
        if (recorderWidget) recorderWidget.style.setProperty('visibility', 'hidden', 'important');
        if (drawingCanvas) drawingCanvas.style.setProperty('visibility', 'hidden', 'important');

        const dataUrl = await new Promise<string>((resolve) => {
            chrome.runtime.sendMessage({ action: "captureVisibleTab" }, (response) => resolve(response.dataUrl));
        });

        const img = await new Promise<HTMLImageElement>((resolve) => {
            const imgEl = new Image();
            imgEl.onload = () => resolve(imgEl);
            imgEl.src = dataUrl;
        });

        // Track positions in PHYSICAL PIXELS to eliminate rounding gaps
        // The key insight: we must never independently round destY and drawHeight,
        // because round(a) + round(b) != round(a+b), causing 1px seams.

        let sourceY = 0;
        let destY = actualY;
        let drawHeight = viewportHeight;

        if (actualY < lastCanvasY) {
            const overlap = lastCanvasY - actualY;
            sourceY = overlap;
            destY = lastCanvasY;
            drawHeight = viewportHeight - overlap;
        }

        // Clip to real document height
        if (destY + drawHeight > realDocumentHeight) {
            drawHeight = realDocumentHeight - destY;
        }

        if (drawHeight > 0) {
            // Calculate physical pixel positions using FLOOR for start, CEIL for dimensions
            // This ensures segments always touch/overlap by 1px rather than having gaps
            const srcYPx = Math.floor(sourceY * scale);
            const dstYPx = Math.floor(destY * scale);
            const drawHPx = Math.ceil(drawHeight * scale);

            ctx.drawImage(img,
                0, srcYPx,
                Math.round(img.width), drawHPx,
                0, dstYPx,
                Math.round(img.width), drawHPx
            );
            lastCanvasY = destY + drawHeight;
        }

        toggleFixedElements('none', false);
    }

    // Restore UI visibility after full capture completes
    if (selectionLayer) selectionLayer.style.removeProperty('display');
    if (recorderWidget) recorderWidget.style.setProperty('visibility', 'visible', 'important');
    if (drawingCanvas) drawingCanvas.style.setProperty('visibility', 'visible', 'important');

    const fullDataUrl = canvas.toDataURL('image/png');
    document.documentElement.style.overflow = originalOverflow;
    document.body.style.paddingBottom = originalPaddingBottom;
    document.documentElement.style.paddingBottom = originalDocPaddingBottom;
    if (document.body.contains(overlay)) document.body.removeChild(overlay);
    window.scrollTo(originalScrollPos.x, originalScrollPos.y);

    chrome.storage.local.set({ capturedImage: fullDataUrl }, () => {
        chrome.runtime.sendMessage({ action: "openStudio" });
    });
}

function createSelectionLayer() {
    selectionLayer = document.createElement('div');
    selectionLayer.id = 'oneclick-selection-overlay';
    selectionLayer.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); cursor: crosshair; z-index: ${MAX_Z_INDEX} !important;`;

    const selectionBox = document.createElement('div');
    selectionBox.style.cssText = `border: 2px solid #00d4ff; position: absolute; display: none; box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);`;
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

    selectionLayer.onmouseup = () => {
        selectionLayer!.onmousemove = null;
        const rect = selectionBox.getBoundingClientRect();

        if (rect.width > 5 && rect.height > 5) {
            const controls = document.createElement('div');
            controls.style.cssText = `position: absolute; top: ${rect.bottom + 10}px; left: ${rect.right - 80}px; display: flex; gap: 8px; background: #0d0f14; padding: 6px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.1); z-index: ${MAX_Z_INDEX} !important;`;

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
                chrome.runtime.sendMessage({ action: "captureVisibleTab", area: { x: rect.left, y: rect.top, width: rect.width, height: rect.height, devicePixelRatio: window.devicePixelRatio } }, async (response) => {
                    if (response.dataUrl) {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const ctx = canvas.getContext('2d');
                            const scale = window.devicePixelRatio;
                            canvas.width = rect.width * scale;
                            canvas.height = rect.height * scale;
                            ctx?.drawImage(img, rect.left * scale, rect.top * scale, rect.width * scale, rect.height * scale, 0, 0, rect.width * scale, rect.height * scale);
                            chrome.storage.local.set({ capturedImage: canvas.toDataURL() }, () => chrome.runtime.sendMessage({ action: "openStudio" }));
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
            document.body.removeChild(selectionLayer!);
            selectionLayer = null;
        }
    };
}

let recorderWidget: HTMLDivElement | null = null;
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingTimerInterval: any = null;
let currentStream: MediaStream | null = null;
let drawingCanvas: HTMLCanvasElement | null = null;
let currentTool: 'pencil' | 'arrow' | 'rect' | 'none' = 'none';

function initDrawingCanvas() {
    if (drawingCanvas) return;
    drawingCanvas = document.createElement('canvas');
    drawingCanvas.id = 'oneclick-drawing-canvas';
    drawingCanvas.width = window.innerWidth;
    drawingCanvas.height = window.innerHeight;
    drawingCanvas.style.cssText = `position: fixed; top: 0; left: 0; pointer-events: none; z-index: ${parseInt(MAX_Z_INDEX) - 1};`;
    document.body.appendChild(drawingCanvas);

    const ctx = drawingCanvas.getContext('2d');
    if (!ctx) return;

    let isDrawing = false;
    let startX = 0;
    let startY = 0;
    let drawingData: any[] = [];

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
    };

    const drawArrow = (x1: number, y1: number, x2: number, y2: number) => {
        const headlen = 10;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
        ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4; ctx.stroke();
    };

    const drawRect = (x1: number, y1: number, x2: number, y2: number) => {
        ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 4;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    };

    window.addEventListener('mousedown', (e) => {
        if (currentTool === 'none') return;
        isDrawing = true; startX = e.clientX; startY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDrawing || currentTool === 'none') return;
        if (currentTool === 'pencil') {
            drawLine(startX, startY, e.clientX, e.clientY);
            startX = e.clientX; startY = e.clientY;
        } else {
            // Preview for shapes
            ctx.clearRect(0, 0, drawingCanvas!.width, drawingCanvas!.height);
            redrawAll();
            if (currentTool === 'arrow') drawArrow(startX, startY, e.clientX, e.clientY);
            else if (currentTool === 'rect') drawRect(startX, startY, e.clientX, e.clientY);
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDrawing || currentTool === 'none') return;
        isDrawing = false;
        if (currentTool !== 'pencil') {
            drawingData.push({ tool: currentTool, x1: startX, y1: startY, x2: e.clientX, y2: e.clientY });
        }
    });

    const redrawAll = () => {
        drawingData.forEach(d => {
            if (d.tool === 'arrow') drawArrow(d.x1, d.y1, d.x2, d.y2);
            else if (d.tool === 'rect') drawRect(d.x1, d.y1, d.x2, d.y2);
        });
    };

    (drawingCanvas as any).clear = () => { drawingData = []; ctx.clearRect(0, 0, drawingCanvas!.width, drawingCanvas!.height); };
}

function createRecordingController() {
    if (recorderWidget) return;
    initDrawingCanvas();

    recorderWidget = document.createElement('div');
    recorderWidget.id = 'oneclick-recorder-widget';
    recorderWidget.style.cssText = `
        position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
        background: rgba(13, 15, 20, 0.95); backdrop-filter: blur(12px);
        border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
        padding: 10px 20px; display: flex; align-items: center; gap: 16px;
        z-index: ${MAX_Z_INDEX} !important; box-shadow: 0 10px 40px rgba(0,0,0,0.6);
        color: white; font-family: sans-serif; user-select: none;
    `;

    recorderWidget.innerHTML = `
        <div style="display: flex; items-center; gap: 10px; padding-right: 12px; border-right: 1px solid rgba(255,255,255,0.1);">
            <div id="oneclick-record-status" style="width: 10px; height: 10px; background: #ff4444; border-radius: 50%; animation: pulse 1s infinite;"></div>
            <span id="oneclick-timer" style="font-size: 14px; font-weight: 600; min-width: 40px;">00:00</span>
        </div>
        <div style="display: flex; gap: 4px; padding-right: 12px; border-right: 1px solid rgba(255,255,255,0.1);">
            <button class="oneclick-tool" id="oneclick-tool-pencil" title="Pencil" style="background:none; border:none; color:white; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="oneclick-tool" id="oneclick-tool-arrow" title="Arrow" style="background:none; border:none; color:white; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 14 0"/><path d="m12 5 7 7-7 7"/></svg></button>
            <button class="oneclick-tool" id="oneclick-tool-rect" title="Rectangle" style="background:none; border:none; color:white; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg></button>
            <button id="oneclick-tool-clear" title="Clear All" style="background:none; border:none; color:#ff4444; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
        </div>
        <div style="display: flex; gap: 8px;">
            <button id="oneclick-pause" title="Pause" style="background:rgba(255,255,255,0.05); border:none; color:white; padding: 6px; border-radius: 8px; cursor:pointer;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="oneclick-pause-icon"><rect width="4" height="16" x="6" y="4" rx="1"/><rect width="4" height="16" x="14" y="4" rx="1"/></svg></button>
            <button id="oneclick-restart" title="Restart" style="background:rgba(255,255,255,0.05); border:none; color:white; padding: 6px; border-radius: 8px; cursor:pointer;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>
            <button id="oneclick-stop" style="background: #ff4444; border:none; color:white; padding: 6px 16px; border-radius: 10px; cursor:pointer; font-weight:600; font-size:13px;">Stop</button>
        </div>
    `;

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

    const updateToolUI = () => {
        recorderWidget!.querySelectorAll('.oneclick-tool').forEach(btn => (btn as HTMLElement).style.background = 'none');
        if (currentTool !== 'none') {
            const activeBtn = document.getElementById(`oneclick-tool-${currentTool}`);
            if (activeBtn) activeBtn.style.background = 'rgba(0,212,255,0.2)';
            drawingCanvas!.style.pointerEvents = 'auto';
        } else {
            drawingCanvas!.style.pointerEvents = 'none';
        }
    };

    document.getElementById('oneclick-tool-pencil')?.addEventListener('click', () => { currentTool = currentTool === 'pencil' ? 'none' : 'pencil'; updateToolUI(); });
    document.getElementById('oneclick-tool-arrow')?.addEventListener('click', () => { currentTool = currentTool === 'arrow' ? 'none' : 'arrow'; updateToolUI(); });
    document.getElementById('oneclick-tool-rect')?.addEventListener('click', () => { currentTool = currentTool === 'rect' ? 'none' : 'rect'; updateToolUI(); });
    document.getElementById('oneclick-tool-clear')?.addEventListener('click', () => { (drawingCanvas as any).clear(); });

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
        if (confirm('Restart recording?')) { cleanupRecording(); startRecording(); }
    });

    document.getElementById('oneclick-stop')?.addEventListener('click', () => {
        mediaRecorder?.stop();
        cleanupRecording();
    });
}

function cleanupRecording() {
    if (recordingTimerInterval) clearInterval(recordingTimerInterval);
    if (recorderWidget) { document.body.removeChild(recorderWidget); recorderWidget = null; }
    if (drawingCanvas) { document.body.removeChild(drawingCanvas); drawingCanvas = null; }
    currentTool = 'none';
}

async function startRecording() {
    const overlay = document.createElement('div');
    overlay.id = 'oneclick-ready-overlay';
    overlay.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(13, 15, 20, 0.95); color: white; padding: 32px; border-radius: 20px; z-index: ${MAX_Z_INDEX} !important; font-family: sans-serif; box-shadow: 0 8px 32px rgba(0,0,0,0.8); border: 1px solid rgba(255,255,255,0.1); text-align: center; backdrop-filter: blur(10px);`;
    overlay.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="width: 48px; height: 48px; background: #ff4444; border-radius: 50%; display: flex; align-items: center; justify-center; margin: 0 auto 16px;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="margin: 0 auto;"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
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
                    reader.onload = () => {
                        chrome.storage.local.set({ capturedVideo: reader.result as string }, () => {
                            chrome.runtime.sendMessage({ action: "openStudio" });
                        });
                    };
                    reader.readAsDataURL(blob);
                    currentStream?.getTracks().forEach(t => t.stop());
                };
                mediaRecorder.start();
                createRecordingController();
                resolve();
            } catch (err) { console.error("Recording failed:", err); resolve(); }
        });
        document.getElementById('oneclick-cancel-record-btn')?.addEventListener('click', () => { document.body.removeChild(overlay); resolve(); });
    });
}

chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "startSelection") createSelectionLayer();
    else if (request.action === "startRecording") startRecording();
    else if (request.action === "startFullPageCapture") captureFullPage();
});
