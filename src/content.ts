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

    const viewportHeight = window.innerHeight;
    const scale = window.devicePixelRatio;

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

        let sourceY = 0;
        let destY = actualY;
        let drawHeight = viewportHeight;

        if (actualY < lastCanvasY) {
            const overlap = lastCanvasY - actualY;
            sourceY = overlap;
            destY = lastCanvasY;
            drawHeight = viewportHeight - overlap;
        }

        if (destY + drawHeight > realDocumentHeight) {
            drawHeight = realDocumentHeight - destY;
        }

        if (drawHeight > 0) {
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
                chrome.runtime.sendMessage({ action: "captureVisibleTab", area: { x: rect.left, y: rect.top, width: rect.width, height: rect.height, devicePixelRatio: window.devicePixelRatio } }, (response) => {
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
let currentTool: 'pencil' | 'arrow' | 'rect' | 'text' | 'none' = 'none';

// Global Drawing State
let isDrawing = false;
let drawingStartX = 0;
let drawingStartY = 0;
let drawingData: { tool: string; x1: number; y1: number; x2?: number; y2?: number; color: string; text?: string }[] = [];
let currentColor = '#00d4ff';

const pageX = (e: MouseEvent) => e.clientX + window.scrollX;
const pageY = (e: MouseEvent) => e.clientY + window.scrollY;

function drawLine(x1: number, y1: number, x2: number, y2: number) {
    const ctx = drawingCanvas?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = currentColor; ctx.lineWidth = 4; ctx.stroke();
}

function drawArrow(x1: number, y1: number, x2: number, y2: number) {
    const ctx = drawingCanvas?.getContext('2d');
    if (!ctx) return;
    const headlen = 12;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.strokeStyle = currentColor; ctx.lineWidth = 4; ctx.stroke();
}

function drawRect(x1: number, y1: number, x2: number, y2: number) {
    const ctx = drawingCanvas?.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = currentColor; ctx.lineWidth = 4;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
}

function drawText(text: string, x: number, y: number, color: string) {
    const ctx = drawingCanvas?.getContext('2d');
    if (!ctx) return;
    ctx.font = 'bold 20px "Outfit", "Inter", sans-serif';
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function redrawAll() {
    const ctx = drawingCanvas?.getContext('2d');
    if (!ctx || !drawingCanvas) return;
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    drawingData.forEach(d => {
        const prevColor = currentColor;
        currentColor = d.color || '#00d4ff';
        if (d.tool === 'arrow' && d.x2 !== undefined && d.y2 !== undefined) drawArrow(d.x1, d.y1, d.x2, d.y2);
        else if (d.tool === 'rect' && d.x2 !== undefined && d.y2 !== undefined) drawRect(d.x1, d.y1, d.x2, d.y2);
        else if (d.tool === 'pencil-seg' && d.x2 !== undefined && d.y2 !== undefined) drawLine(d.x1, d.y1, d.x2, d.y2);
        else if (d.tool === 'text' && d.text) drawText(d.text, d.x1, d.y1, currentColor);
        currentColor = prevColor;
    });
}

function updateSize() {
    if (!drawingCanvas) return;
    const docW = document.documentElement.clientWidth;
    const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, window.innerHeight);
    
    if (drawingCanvas.width !== docW || drawingCanvas.height !== docH) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = drawingCanvas.width;
        tempCanvas.height = drawingCanvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx?.drawImage(drawingCanvas, 0, 0);
        
        drawingCanvas.width = docW;
        drawingCanvas.height = docH;
        
        const ctx = drawingCanvas.getContext('2d');
        if (ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.drawImage(tempCanvas, 0, 0);
            redrawAll();
        }
    }
}

function initDrawingCanvas() {
    if (drawingCanvas) return;
    
    drawingCanvas = document.createElement('canvas');
    drawingCanvas.id = 'oneclick-drawing-canvas';
    updateSize();
    drawingCanvas.style.cssText = `position: absolute; top: 0; left: 0; pointer-events: none; z-index: ${parseInt(MAX_Z_INDEX) - 1}; max-width: 100vw; overflow: hidden;`;
    document.body.appendChild(drawingCanvas);

    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(document.body);

    const ctx = drawingCanvas.getContext('2d');
    if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }

    window.addEventListener('mousedown', (e) => {
        if (currentTool === 'none') return;
        const target = e.target as HTMLElement;
        if (target.closest('#oneclick-recorder-widget') || target.tagName === 'INPUT') return;
        
        const x = pageX(e);
        const y = pageY(e);

        if (currentTool === 'text') {
            const input = document.createElement('input');
            input.type = 'text';
            input.style.cssText = `position: absolute; left: ${x}px; top: ${y - 15}px; background: rgba(0,0,0,0.8); color: ${currentColor}; border: 1px solid ${currentColor}; outline: none; padding: 4px 8px; font-size: 20px; font-weight: bold; border-radius: 4px; z-index: ${MAX_Z_INDEX}; font-family: sans-serif;`;
            document.body.appendChild(input);
            setTimeout(() => input.focus(), 10);

            const finishText = () => {
                if (input.value.trim()) {
                    drawingData.push({ tool: 'text', text: input.value, x1: x, y1: y, color: currentColor });
                    redrawAll();
                    chrome.runtime.sendMessage({ action: "syncDrawing", drawingData, currentColor });
                }
                if (document.body.contains(input)) document.body.removeChild(input);
            };

            input.onkeydown = (ev) => { if (ev.key === 'Enter') finishText(); };
            input.onblur = finishText;
            return;
        }

        isDrawing = true; drawingStartX = x; drawingStartY = y;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDrawing || currentTool === 'none' || currentTool === 'text') return;
        const curX = pageX(e);
        const curY = pageY(e);
        
        if (currentTool === 'pencil') {
            drawLine(drawingStartX, drawingStartY, curX, curY);
            drawingData.push({ tool: 'pencil-seg', x1: drawingStartX, y1: drawingStartY, x2: curX, y2: curY, color: currentColor });
            drawingStartX = curX; drawingStartY = curY;
            
            // Real-time sync for pencil (throttled by the nature of mousemove events)
            if (drawingData.length % 5 === 0) {
                chrome.runtime.sendMessage({ action: "syncDrawing", drawingData, currentColor });
            }
        } else {
            const ctx = drawingCanvas?.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, drawingCanvas!.width, drawingCanvas!.height);
                redrawAll();
                if (currentTool === 'arrow') drawArrow(drawingStartX, drawingStartY, curX, curY);
                else if (currentTool === 'rect') drawRect(drawingStartX, drawingStartY, curX, curY);
            }
        }
    });

    window.addEventListener('mouseup', (e) => {
        if (!isDrawing || currentTool === 'none' || currentTool === 'text') return;
        isDrawing = false;
        if (currentTool !== 'pencil') {
            drawingData.push({ tool: currentTool as string, x1: drawingStartX, y1: drawingStartY, x2: pageX(e), y2: pageY(e), color: currentColor });
        }
        chrome.runtime.sendMessage({ action: "syncDrawing", drawingData, currentColor });
        redrawAll();
    });

    (drawingCanvas as any).clear = () => { 
        drawingData = []; 
        redrawAll();
    };
    (drawingCanvas as any).setColor = (c: string) => { currentColor = c; };
}

const updateToolUI = () => {
    if (drawingCanvas) {
        drawingCanvas.style.pointerEvents = currentTool !== 'none' ? 'auto' : 'none';
    }
    if (!recorderWidget) return;
    recorderWidget.querySelectorAll('.oneclick-tool').forEach(btn => (btn as HTMLElement).style.background = 'none');
    if (currentTool !== 'none') {
        const activeBtn = document.getElementById(`oneclick-tool-${currentTool}`);
        if (activeBtn) activeBtn.style.background = 'rgba(0,212,255,0.2)';
    }
};

const broadcastTool = (tool: string) => {
    chrome.runtime.sendMessage({ action: "setDrawingTool", tool, color: currentColor });
};

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
        <div style="display: flex; align-items: center; gap: 10px; padding-right: 12px; border-right: 1px solid rgba(255,255,255,0.1); cursor: move;" id="oneclick-drag-handle">
            <div id="oneclick-record-status" style="width: 10px; height: 10px; background: #ff4444; border-radius: 50%; animation: pulse 1s infinite;"></div>
            <span id="oneclick-timer" style="font-size: 14px; font-weight: 600; min-width: 40px;">00:00</span>
        </div>
        <div style="display: flex; gap: 4px; padding-right: 12px; border-right: 1px solid rgba(255,255,255,0.1);">
            <button class="oneclick-tool" id="oneclick-tool-pencil" title="Pencil" style="background:none; border:none; color:white; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></button>
            <button class="oneclick-tool" id="oneclick-tool-arrow" title="Arrow" style="background:none; border:none; color:white; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m5 12 14 0"/><path d="m12 5 7 7-7 7"/></svg></button>
            <button class="oneclick-tool" id="oneclick-tool-rect" title="Rectangle" style="background:none; border:none; color:white; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/></svg></button>
            <button class="oneclick-tool" id="oneclick-tool-text" title="Text" style="background:none; border:none; color:white; padding: 6px; border-radius: 6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg></button>
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

    document.getElementById('oneclick-tool-pencil')?.addEventListener('click', () => { 
        currentTool = currentTool === 'pencil' ? 'none' : 'pencil'; 
        updateToolUI(); 
        broadcastTool(currentTool === 'pencil' ? 'pencil' : 'select');
    });
    document.getElementById('oneclick-tool-arrow')?.addEventListener('click', () => { 
        currentTool = currentTool === 'arrow' ? 'none' : 'arrow'; 
        updateToolUI(); 
        broadcastTool(currentTool === 'arrow' ? 'arrow' : 'select');
    });
    document.getElementById('oneclick-tool-rect')?.addEventListener('click', () => { 
        currentTool = currentTool === 'rect' ? 'none' : 'rect'; 
        updateToolUI(); 
        broadcastTool(currentTool === 'rect' ? 'rectangle' : 'select');
    });
    document.getElementById('oneclick-tool-text')?.addEventListener('click', () => { 
        currentTool = currentTool === 'text' ? 'none' : 'text'; 
        updateToolUI(); 
        broadcastTool(currentTool === 'text' ? 'text' : 'select');
    });
    document.getElementById('oneclick-tool-clear')?.addEventListener('click', () => { 
        (drawingCanvas as any).clear(); 
        chrome.runtime.sendMessage({ action: "clearDrawingCanvas" });
    });

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
        chrome.runtime.sendMessage({ action: "stopRecording" });
    });

    // Draggable Logic
    let isDraggingToolbar = false;
    let offsetX = 0;
    let offsetY = 0;
    const dragHandle = document.getElementById('oneclick-drag-handle');

    dragHandle?.addEventListener('mousedown', (e) => {
        isDraggingToolbar = true;
        offsetX = e.clientX - recorderWidget!.getBoundingClientRect().left;
        offsetY = e.clientY - recorderWidget!.getBoundingClientRect().top;
        recorderWidget!.style.transition = 'none';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDraggingToolbar || !recorderWidget) return;
        recorderWidget.style.left = `${e.clientX - offsetX + recorderWidget.offsetWidth / 2}px`;
        recorderWidget.style.top = `${e.clientY - offsetY + recorderWidget.offsetHeight / 2}px`;
        recorderWidget.style.bottom = 'auto';
        recorderWidget.style.transform = 'translateX(-50%)';
    });

    window.addEventListener('mouseup', () => {
        if (isDraggingToolbar && recorderWidget) {
            isDraggingToolbar = false;
            recorderWidget.style.transition = 'all 0.2s';
        }
    });

    updateToolUI();
}

function cleanupRecording() {
    if (recordingTimerInterval) clearInterval(recordingTimerInterval);
    if (recorderWidget) { document.body.removeChild(recorderWidget); recorderWidget = null; }
    if (drawingCanvas) { document.body.removeChild(drawingCanvas); drawingCanvas = null; }
    currentStream?.getTracks().forEach(t => t.stop());
    currentStream = null;
    currentTool = 'none';
}

async function startRecording() {
    const overlay = document.createElement('div');
    overlay.id = 'oneclick-ready-overlay';
    overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(0,0,0,0.4); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
        z-index: ${MAX_Z_INDEX} !important; font-family: "Outfit", "Inter", sans-serif;
    `;
    
    const card = document.createElement('div');
    card.style.cssText = `
        background: #0d0f14; border: 1px solid rgba(255,255,255,0.1);
        padding: 40px; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        text-align: center; max-width: 400px; width: 90%;
        animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    `;

    card.innerHTML = `
        <style>
            @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0.4); } 70% { box-shadow: 0 0 0 15px rgba(255, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(255, 68, 68, 0); } }
        </style>
        <div style="width: 64px; height: 64px; background: #ff4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; animation: pulse-red 2s infinite;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
        </div>
        <h3 style="margin: 0 0 12px; font-size: 24px; font-weight: 700; color: white; letter-spacing: -0.02em;">Ready to Record?</h3>
        <p style="margin: 0 0 32px; color: rgba(255,255,255,0.5); font-size: 16px; line-height: 1.5;">Select the screen or window you want to capture and start creating.</p>
        <div style="display: flex; gap: 12px; justify-content: center;">
            <button id="oneclick-start-record-btn" style="flex: 1; background: #ff4444; color: white; border: none; padding: 14px 24px; border-radius: 14px; cursor: pointer; font-weight: 600; font-size: 16px; transition: all 0.2s;">Start Recording</button>
            <button id="oneclick-cancel-record-btn" style="flex: 1; background: rgba(255,255,255,0.05); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 14px 24px; border-radius: 14px; cursor: pointer; font-weight: 500; font-size: 16px; transition: all 0.2s;">Cancel</button>
        </div>
    `;
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    return new Promise<void>((resolve) => {
        document.getElementById('oneclick-start-record-btn')?.addEventListener('click', async () => {
            const overlay = document.getElementById('oneclick-ready-overlay');
            if (overlay) document.body.removeChild(overlay);
            try {
                chrome.storage.local.set({ isRecording: true });
                
                // Get display media with audio
                currentStream = await navigator.mediaDevices.getDisplayMedia({ 
                    video: true, 
                    audio: true 
                });

                let combinedStream = currentStream;

                // Try to get microphone audio and merge it
                try {
                    const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioContext = new AudioContext();
                    const destination = audioContext.createMediaStreamDestination();

                    // Connect display audio if available
                    const displayAudioTracks = currentStream.getAudioTracks();
                    if (displayAudioTracks.length > 0) {
                        const displaySource = audioContext.createMediaStreamSource(new MediaStream(displayAudioTracks));
                        displaySource.connect(destination);
                    }

                    // Connect microphone audio
                    const micSource = audioContext.createMediaStreamSource(micStream);
                    micSource.connect(destination);

                    // Resume AudioContext just in case it's suspended
                    if (audioContext.state === 'suspended') {
                        await audioContext.resume();
                    }

                    // Create new combined stream with video from display and audio from merger
                    combinedStream = new MediaStream([
                        ...currentStream.getVideoTracks(),
                        ...destination.stream.getAudioTracks()
                    ]);

                    // Add mic tracks to cleanup
                    micStream.getTracks().forEach(track => {
                        currentStream?.addTrack(track); // Add to currentStream for centralized cleanup
                    });
                } catch (micErr) {
                    console.warn("Could not capture microphone, recording with display audio only:", micErr);
                }

                mediaRecorder = new MediaRecorder(combinedStream);
                recordedChunks = [];
                mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunks.push(e.data); };
                mediaRecorder.onstop = () => {
                    const blob = new Blob(recordedChunks, { type: 'video/webm' });
                    const reader = new FileReader();
                    reader.onload = () => {
                        chrome.storage.local.set({ capturedVideo: reader.result, isRecording: false }, () => {
                            chrome.runtime.sendMessage({ action: "openRecordStudio", videoUrl: reader.result });
                        });
                    };
                    reader.readAsDataURL(blob);
                    cleanupRecording();
                    // Notify other tabs to cleanup
                    chrome.runtime.sendMessage({ action: "stopRecording" });
                };

                // Handle native browser "Stop sharing" button
                currentStream.getVideoTracks()[0].onended = () => {
                    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                        mediaRecorder.stop();
                    }
                };

                mediaRecorder.start();
                chrome.runtime.sendMessage({ action: "syncRecordingStart" });
                createRecordingController();
                resolve();
            } catch (err) {
                console.error("Recording failed:", err);
                chrome.storage.local.set({ isRecording: false });
            }
        });
        document.getElementById('oneclick-cancel-record-btn')?.addEventListener('click', () => {
            const overlay = document.getElementById('oneclick-ready-overlay');
            if (overlay) document.body.removeChild(overlay);
        });
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startSelection") {
        createSelectionLayer();
    } 
    else if (request.action === "startFullPage") {
        captureFullPage();
    }
    else if (request.action === "startRecording") {
        startRecording();
    }
    else if (request.action === "stopRecording") {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        cleanupRecording();
    }
    else if (request.action === "setDrawingTool") {
        if (!drawingCanvas) initDrawingCanvas();
        const toolMap: Record<string, typeof currentTool> = {
            'pencil': 'pencil', 'arrow': 'arrow', 'rectangle': 'rect', 'text': 'text', 'select': 'none',
        };
        currentTool = toolMap[request.tool] || 'none';
        if (request.color) currentColor = request.color;
        if (drawingCanvas) {
            drawingCanvas.style.pointerEvents = currentTool === 'none' ? 'none' : 'auto';
        }
        updateToolUI();
    }
    else if (request.action === "clearDrawingCanvas") {
        if (drawingCanvas) (drawingCanvas as any).clear();
    }
    else if (request.action === "syncRecordingStart") {
        chrome.storage.local.get(['isRecording', 'currentTool', 'currentColor'], (res) => {
            if (res.isRecording && !recorderWidget) {
                if (res.currentColor) currentColor = res.currentColor;
                const toolMap: Record<string, typeof currentTool> = {
                    'pencil': 'pencil', 'arrow': 'arrow', 'rectangle': 'rect', 'text': 'text', 'select': 'none',
                };
                currentTool = toolMap[res.currentTool] || 'none';
                createRecordingController();
                updateToolUI();
            }
        });
    }
    else if (request.action === "syncDrawing") {
        if (!drawingCanvas) initDrawingCanvas();
        drawingData = request.drawingData || [];
        currentColor = request.currentColor || '#FF0000'; // Default color if not provided
        redrawAll();
    }
});

// Auto-init if recording is active globally
chrome.storage.local.get(['isRecording', 'currentTool', 'currentColor'], (res) => {
    if (res.isRecording) {
        if (res.currentColor) currentColor = res.currentColor;
        const toolMap: Record<string, typeof currentTool> = {
            'pencil': 'pencil', 'arrow': 'arrow', 'rectangle': 'rect', 'text': 'text', 'select': 'none',
        };
        currentTool = toolMap[res.currentTool] || 'none';
        createRecordingController();
        updateToolUI();
    }
});
