import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, Rect, Line, PencilBrush, IText, Circle, Group, Textbox, FabricImage } from "fabric";

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
  const [comments, setComments] = useState<CommentPin[]>([]);
  const commentCountRef = useRef(0);
  const [hasImage, setHasImage] = useState(false);

  // Initialize canvas
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const canvas = new Canvas("editor-canvas", {
      width: container.clientWidth,
      height: container.clientHeight,
      backgroundColor: "#0d0f14",
      selection: true,
    });
    canvasRef.current = canvas;

    const handleResize = () => {
      canvas.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      canvas.renderAll();
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Keyboard delete handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && canvas.getActiveObjects().length > 0) {
        // Don't delete if user is typing in an IText
        const target = e.target as HTMLElement;
        if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable) return;
        canvas.getActiveObjects().forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      ro.disconnect();
      document.removeEventListener("keydown", handleKeyDown);
      canvas.dispose();
      canvasRef.current = null;
    };
  }, [containerRef]);

  // Tool switching
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = activeTool === "pencil";
    if (activeTool === "pencil") {
      const brush = new PencilBrush(canvas);
      brush.color = "#00d4ff";
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

    if (activeTool === "rectangle") {
      let isDrawing = false;
      let rect: Rect | null = null;
      let startX = 0, startY = 0;

      canvas.on("mouse:down", (opt) => {
        if (opt.target) return;
        isDrawing = true;
        const pointer = canvas.getScenePoint(opt.e);
        startX = pointer.x;
        startY = pointer.y;
        rect = new Rect({
          left: startX, top: startY, width: 0, height: 0,
          fill: "transparent", stroke: "#00d4ff", strokeWidth: 2,
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
      let head: any = null;

      canvas.on("mouse:down", (opt) => {
        if (opt.target) return;
        isDrawing = true;
        const pointer = canvas.getScenePoint(opt.e);
        line = new Line([pointer.x, pointer.y, pointer.x, pointer.y], {
          stroke: "#00d4ff", strokeWidth: 2, selectable: false, evented: false,
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
        ], { stroke: "#00d4ff", strokeWidth: 2, selectable: false, evented: false });
        const h2 = new Line([
          x2, y2,
          x2 - headLen * Math.cos(angle + Math.PI / 6),
          y2 - headLen * Math.sin(angle + Math.PI / 6),
        ], { stroke: "#00d4ff", strokeWidth: 2, selectable: false, evented: false });

        // Group them
        canvas.remove(line);
        const group = new Group([
          new Line([x1, y1, x2, y2], { stroke: "#00d4ff", strokeWidth: 2 }),
          h1, h2,
        ], { selectable: true });
        canvas.add(group);
        canvas.renderAll();
        line = null;
      });
    }

    if (activeTool === "text") {
      canvas.on("mouse:down", (opt) => {
        if (opt.target) return;
        const pointer = canvas.getScenePoint(opt.e);
        const text = new IText("Type here", {
          left: pointer.x, top: pointer.y,
          fontSize: 16, fill: "#ffffff",
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
        if (opt.target) return;
        const pointer = canvas.getScenePoint(opt.e);
        commentCountRef.current += 1;
        const num = commentCountRef.current;

        // Pin circle
        const circle = new Circle({
          radius: 14, fill: "#4f7df9", stroke: "#00d4ff", strokeWidth: 2,
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
  }, [activeTool]);

  const loadImage = useCallback(async (url: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const fabricImage = await FabricImage.fromURL(url, { crossOrigin: "anonymous" });
      fabricImage.set({ selectable: false, evented: false });
      const scaleX = canvas.width! / fabricImage.width!;
      const scaleY = canvas.height! / fabricImage.height!;
      const scale = Math.min(scaleX, scaleY, 1);
      fabricImage.scale(scale);
      fabricImage.set({
        left: (canvas.width! - fabricImage.width! * scale) / 2,
        top: (canvas.height! - fabricImage.height! * scale) / 2,
      });
      canvas.clear();
      canvas.backgroundColor = "#0d0f14";
      canvas.add(fabricImage);
      canvas.renderAll();
      setHasImage(true);
    } catch (e) {
      console.error("Failed to load image", e);
    }
  }, []);

  const loadImageFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) loadImage(e.target.result as string);
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
    loadImage, loadImageFromFile, exportPNG, exportPDF,
    deleteSelected, updateComment, hasImage,
  };
}
