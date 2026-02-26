import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Rect, Line, PencilBrush, IText, Circle, Group, Textbox, FabricImage, util, Shadow } from "fabric";

export type ToolType = "select" | "rectangle" | "arrow" | "pencil" | "text" | "comment";

interface CommentPin {
  id: number;
  x: number;
  y: number;
  text: string;
}

export function useCanvas(containerRef: React.RefObject<HTMLDivElement | null>) {
  const canvasRef = useRef<Canvas | null>(null);
  const [activeTool, setActiveTool] = useState<ToolType>("select");
  const [strokeColor, setStrokeColor] = useState("#00d4ff");
  const [comments, setComments] = useState<CommentPin[]>([]);
  const commentCountRef = useRef(0);
  const [hasImage, setHasImage] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  // Undo/Redo History
  const historyRef = useRef<string[]>([]);
  const redoStackRef = useRef<string[]>([]);
  const isHandlingHistoryRef = useRef(false);

  // Selection Clipboard (Fabric internal)
  const clipboardRef = useRef<any>(null);

  // Figma-style Zoom & Pan state
  const isPanningRef = useRef(false);
  const isSpacePressedRef = useRef(false);

  const saveHistory = useCallback(() => {
    if (!canvasRef.current || isHandlingHistoryRef.current) return;
    const json = JSON.stringify(canvasRef.current.toJSON());
    // Only save if it's different from the last state
    if (historyRef.current.length > 0 && historyRef.current[historyRef.current.length - 1] === json) return;

    historyRef.current.push(json);
    if (historyRef.current.length > 50) historyRef.current.shift(); // Limit history
    redoStackRef.current = []; // Clear redo on new action
  }, []);

  const undo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;

    isHandlingHistoryRef.current = true;
    const currentState = historyRef.current.pop()!;
    redoStackRef.current.push(currentState);

    const prevState = historyRef.current[historyRef.current.length - 1];
    await canvas.loadFromJSON(JSON.parse(prevState));
    canvas.renderAll();
    isHandlingHistoryRef.current = false;
  }, []);

  const redo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || redoStackRef.current.length === 0) return;

    isHandlingHistoryRef.current = true;
    const nextState = redoStackRef.current.pop()!;
    historyRef.current.push(nextState);

    await canvas.loadFromJSON(JSON.parse(nextState));
    canvas.renderAll();
    isHandlingHistoryRef.current = false;
  }, []);

  // Initialize canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const canvas = new Canvas("editor-canvas", {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: "transparent",
      selection: true,
    });
    canvasRef.current = canvas;

    // Save initial state
    saveHistory();

    const handleResize = () => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      canvas.renderAll();
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Event listeners for history
    canvas.on("object:added", saveHistory);
    canvas.on("object:modified", saveHistory);
    canvas.on("object:removed", saveHistory);

    const updateSelection = () => {
      setHasSelection(canvas.getActiveObjects().length > 0);
    };

    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", updateSelection);


    const handleSpaceKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        const target = e.target as HTMLElement;
        const isInput = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable;
        const activeObj = canvas.getActiveObject();
        const isEditing = activeObj instanceof IText && activeObj.isEditing;

        if (isInput || isEditing) return;

        e.preventDefault();
        if (e.type === "keydown") {
          if (!isSpacePressedRef.current) {
            isSpacePressedRef.current = true;
            canvas.defaultCursor = "grab";
            canvas.setCursor("grab");
            canvas.selection = false;
            canvas.isDrawingMode = false; // Disable drawing while panning
            canvas.renderAll();
          }
        } else {
          isSpacePressedRef.current = false;
          canvas.defaultCursor = activeTool === "select" ? "default" : "crosshair";
          canvas.setCursor(canvas.defaultCursor);
          canvas.selection = activeTool === "select";
          canvas.isDrawingMode = activeTool === "pencil"; // Restore drawing if pencil was selected
          canvas.renderAll();
        }
      }
    };

    window.addEventListener("keydown", handleSpaceKey);
    window.addEventListener("keyup", handleSpaceKey);

    // Keyboard Shortcuts
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.code === "Space") return; // Handled separately
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if user is in an input or IText is being edited
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable;
      // Also check if fabric is in editing mode
      const activeObj = canvas.getActiveObject();
      const isEditing = activeObj instanceof IText && activeObj.isEditing;

      if (isInput || isEditing) {
        // Still allow Undo/Redo even in text if needed, but let's stick to standard behavior
        if (!(cmdKey && (e.key.toLowerCase() === "z" || e.key.toLowerCase() === "y"))) return;
      }

      // 1. Delete
      if (e.key === "Delete" || e.key === "Backspace") {
        if (canvas.getActiveObjects().length > 0) {
          canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
          saveHistory();
        }
      }

      // 2. Undo/Redo
      if (cmdKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (cmdKey && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }

      // 3. Select All
      if (cmdKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        canvas.discardActiveObject();
        const objs = canvas.getObjects().filter(o => o.selectable);
        const sel = new Group(objs, { canvas });
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
      }

      // 4. Copy/Paste/Cut
      if (cmdKey && e.key.toLowerCase() === "c") {
        const active = canvas.getActiveObject();
        if (active) {
          active.clone().then((cloned) => {
            clipboardRef.current = cloned;
          });
        }
      }

      if (cmdKey && e.key.toLowerCase() === "x") {
        const active = canvas.getActiveObject();
        if (active) {
          active.clone().then((cloned) => {
            clipboardRef.current = cloned;
            canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
            canvas.discardActiveObject();
            canvas.renderAll();
            saveHistory();
          });
        }
      }

      if (cmdKey && e.key.toLowerCase() === "v") {
        if (clipboardRef.current) {
          clipboardRef.current.clone().then((clonedObj) => {
            canvas.discardActiveObject();
            clonedObj.set({
              left: clonedObj.left + 20,
              top: clonedObj.top + 20,
              evented: true,
            });
            if (clonedObj instanceof Group) {
              clonedObj.canvas = canvas;
              clonedObj.forEachObject((obj) => {
                canvas.add(obj);
              });
              canvas.setActiveObject(clonedObj);
            } else {
              canvas.add(clonedObj);
              canvas.setActiveObject(clonedObj);
            }
            // Update clipboard for subsequent pastes
            clipboardRef.current.top += 20;
            clipboardRef.current.left += 20;
            canvas.requestRenderAll();
            saveHistory();
          });
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      ro.disconnect();
      document.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [containerRef, saveHistory, undo, redo]);

  // Handle strokeColor change for active pencil brush
  useEffect(() => {
    if (canvasRef.current && canvasRef.current.isDrawingMode && canvasRef.current.freeDrawingBrush) {
      canvasRef.current.freeDrawingBrush.color = strokeColor;
    }
  }, [strokeColor]);

  // Tool switching
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === "pencil";
    if (activeTool === "pencil") {
      const brush = new PencilBrush(canvas);
      brush.color = strokeColor;
      brush.width = 2;
      canvas.freeDrawingBrush = brush;
    }

    if (activeTool === "select") {
      canvas.selection = true;
      canvas.defaultCursor = "default";
    } else {
      canvas.selection = false;
      canvas.defaultCursor = "crosshair";
    }

    // Remove old listeners
    canvas.off("mouse:down");
    canvas.off("mouse:move");
    canvas.off("mouse:up");
    canvas.off("mouse:wheel");

    // --- Figma-style Zoom & Pan (Always Active) ---
    canvas.on("mouse:wheel", (opt) => {
      const delta = opt.e.deltaY;
      if (isSpacePressedRef.current) {
        const vpt = canvas.viewportTransform!;
        if (opt.e.shiftKey) vpt[4] -= delta; else vpt[5] -= delta;
        canvas.requestRenderAll();
        opt.e.preventDefault();
        opt.e.stopPropagation();
        return;
      }
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 20) zoom = 20;
      if (zoom < 0.1) zoom = 0.1;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY } as any, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    canvas.on("mouse:down", (opt) => {
      const evt = opt.e as MouseEvent;
      if (isSpacePressedRef.current || evt.button === 1) {
        isPanningRef.current = true;
        canvas.selection = false;
        canvas.defaultCursor = "grabbing";
        canvas.setCursor("grabbing");
        canvas.requestRenderAll();
        return;
      }
    });

    canvas.on("mouse:move", (opt) => {
      if (isPanningRef.current) {
        const e = opt.e as MouseEvent;
        const vpt = canvas.viewportTransform!;
        vpt[4] += e.movementX;
        vpt[5] += e.movementY;
        canvas.requestRenderAll();
        return;
      }
    });

    canvas.on("mouse:up", () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        if (isSpacePressedRef.current) {
          canvas.defaultCursor = "grab";
          canvas.setCursor("grab");
          canvas.selection = false;
        } else {
          canvas.defaultCursor = activeTool === "select" ? "default" : "crosshair";
          canvas.setCursor(canvas.defaultCursor);
          canvas.selection = activeTool === "select";
        }
        canvas.requestRenderAll();
      }
    });

    if (activeTool === "rectangle") {
      let isDrawing = false;
      let rect: Rect | null = null;
      let startX = 0, startY = 0;

      canvas.on("mouse:down", (opt) => {
        if (isSpacePressedRef.current || opt.target) return;
        isDrawing = true;
        const pointer = canvas.getScenePoint(opt.e);
        startX = pointer.x;
        startY = pointer.y;
        rect = new Rect({
          left: startX, top: startY, width: 0, height: 0,
          fill: "transparent", stroke: strokeColor, strokeWidth: 2,
          rx: 4, ry: 4,
        });
        canvas.add(rect);
      });
      canvas.on("mouse:move", (opt) => {
        if (!isDrawing || !rect) return;
        const pointer = canvas.getScenePoint(opt.e);
        const w = pointer.x - startX;
        const h = pointer.y - startY;
        rect.set({
          width: Math.abs(w), height: Math.abs(h),
          left: w < 0 ? pointer.x : startX,
          top: h < 0 ? pointer.y : startY,
        });
        canvas.renderAll();
      });
      canvas.on("mouse:up", () => { isDrawing = false; rect = null; });
    }

    if (activeTool === "arrow") {
      let isDrawing = false;
      let line: Line | null = null;

      canvas.on("mouse:down", (opt) => {
        if (isSpacePressedRef.current || opt.target) return;
        isDrawing = true;
        const pointer = canvas.getScenePoint(opt.e);
        line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: strokeColor, strokeWidth: 2, selectable: false, evented: false,
        });
        canvas.add(line);
      });
      canvas.on("mouse:move", (opt) => {
        if (!isDrawing || !line) return;
        const pointer = canvas.getScenePoint(opt.e);
        line.set({ x2: pointer.x, y2: pointer.y });
        canvas.renderAll();
      });
      canvas.on("mouse:up", (opt) => {
        if (!isDrawing || !line) return;
        isDrawing = false;
        const pointer = canvas.getScenePoint(opt.e);
        const x1 = line.x1!, y1 = line.y1!;
        const x2 = pointer.x, y2 = pointer.y;
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const headLen = 14;
        // Create arrowhead as two small lines
        const h1 = new Line([
          x2, y2,
          x2 - headLen * Math.cos(angle - Math.PI / 6),
          y2 - headLen * Math.sin(angle - Math.PI / 6),
        ], { stroke: strokeColor, strokeWidth: 2, selectable: false, evented: false });
        const h2 = new Line([
          x2, y2,
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6),
        ], { stroke: strokeColor, strokeWidth: 2, selectable: false, evented: false });

        // Group them
        canvas.remove(line);
        const group = new Group([
          new Line([x1, y1, x2, y2], { stroke: strokeColor, strokeWidth: 2 }),
          h1, h2,
        ], { selectable: true });
        canvas.add(group);
        canvas.renderAll();
        line = null;
      });
    }

    if (activeTool === "text") {
      canvas.on("mouse:down", (opt) => {
        if (isSpacePressedRef.current || opt.target) return;
        const pointer = canvas.getScenePoint(opt.e);
        const text = new IText("Type here", {
          left: pointer.x, top: pointer.y,
          fontSize: 16, fill: strokeColor,
          fontFamily: "Inter, sans-serif",
          editable: true,
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        setActiveTool("select");
      });
    }

    if (activeTool === "comment") {
      canvas.on("mouse:down", (opt) => {
        if (isSpacePressedRef.current || opt.target) return;
        const pointer = canvas.getScenePoint(opt.e);
        commentCountRef.current += 1;
        const num = commentCountRef.current;

        // Pin circle
        const circle = new Circle({
          radius: 14, fill: "#4f7df9", stroke: strokeColor, strokeWidth: 2,
          originX: "center", originY: "center",
        });
        const label = new Textbox(String(num), {
          fontSize: 12, fill: "#ffffff", fontFamily: "Inter",
          originX: "center", originY: "center",
          width: 28, textAlign: "center", editable: false,
        });
        const pin = new Group([circle, label], {
          left: pointer.x - 14, top: pointer.y - 14,
          selectable: true, hasControls: false,
        });
        canvas.add(pin);
        canvas.renderAll();

        setComments(prev => [...prev, { id: num, x: pointer.x, y: pointer.y, text: "" }]);
        setActiveTool("select");
      });
    }
  }, [activeTool, strokeColor, saveHistory]);

  const setCanvasBackground = useCallback((color: string) => {
    if (canvasRef.current) {
      canvasRef.current.set({ backgroundColor: color });
      canvasRef.current.renderAll();
    }
  }, []);

  const loadImage = useCallback(async (url: string, append = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const fabricImage = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });

      if (!append) {
        canvas.clear();
        fabricImage.set({ selectable: false, evented: false });
        const scaleX = canvas.width! / fabricImage.width!;
        const scaleY = canvas.height! / fabricImage.height!;
        const scale = Math.min(scaleX, scaleY, 1);
        fabricImage.scale(scale);
        fabricImage.set({
          left: (canvas.width! - fabricImage.width! * scale) / 2,
          top: (canvas.height! - fabricImage.height! * scale) / 2,
        });
      } else {
        // For appended images, make them selectable and place them slightly offset
        fabricImage.set({
          selectable: true,
          evented: true,
          left: 100 + (canvas.getObjects().length * 20),
          top: 100 + (canvas.getObjects().length * 20)
        });
        const scale = Math.min(400 / fabricImage.width!, 400 / fabricImage.height!, 1);
        fabricImage.scale(scale);
      }

      fabricImage.set({
        shadow: new Shadow({
          color: "rgba(0,0,0,0.3)",
          blur: 20,
          offsetX: 0,
          offsetY: 8,
        }),
      });

      canvas.add(fabricImage);
      if (append) canvas.setActiveObject(fabricImage);
      canvas.renderAll();
      setHasImage(true);
      saveHistory();
    } catch (e) {
      console.error("Failed to load image", e);
    }
  }, [saveHistory]);

  const loadImageFromFile = useCallback((file: File, append = false) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) loadImage(e.target.result as string, append);
    };
    reader.readAsDataURL(file);
  }, [loadImage]);

  const exportPNG = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataURL = canvas.toDataURL({ format: "png", multiplier: 2 });
    const link = document.createElement("a");
    link.download = "1clickcapture-export.png";
    link.href = dataURL;
    link.click();
  }, []);

  const exportPDF = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { jsPDF } = await import("jspdf");
    const dataURL = canvas.toDataURL({ format: "png", multiplier: 2 });
    const pdf = new jsPDF({ orientation: "landscape" });
    const w = pdf.internal.pageSize.getWidth();
    const h = pdf.internal.pageSize.getHeight();
    pdf.addImage(dataURL, "PNG", 0, 0, w, h);
    pdf.save("1clickcapture-export.pdf");
  }, []);

  const copyToClipboard = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataURL = canvas.toDataURL({ format: "png", multiplier: 1.5 });
      const blob = await (await fetch(dataURL)).blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      return true;
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      return false;
    }
  }, []);

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    active.forEach(obj => canvas.remove(obj));
    canvas.discardActiveObject();
    canvas.renderAll();
  }, []);

  const updateComment = useCallback((id: number, text: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, text } : c));
  }, []);

  return {
    canvasRef, activeTool, setActiveTool, comments,
    loadImage, loadImageFromFile, exportPNG, exportPDF, copyToClipboard,
    undo, redo,
    deleteSelected, updateComment, hasImage, hasSelection,
    strokeColor, setStrokeColor, setCanvasBackground,
  };
}
