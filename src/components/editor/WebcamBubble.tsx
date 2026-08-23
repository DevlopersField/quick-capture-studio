import { useEffect, useRef, useState } from "react";
import { Circle, Square } from "lucide-react";
import type { PipRect, BubbleShape } from "@/hooks/useRecorder";

interface Props {
  stream: MediaStream | null;
  rect: PipRect;
  onChange: (update: PipRect | ((prev: PipRect) => PipRect)) => void;
  /** When false, renders a plain fixed self-view (no drag/resize/toolbar) — used for Camera Only mode where nothing is composited. */
  interactive?: boolean;
}

const MIN_W_PCT = 0.08;
const MAX_W_PCT = 0.4;

const shapes: { id: BubbleShape; icon: React.ElementType; label: string }[] = [
  { id: "circle", icon: Circle, label: "Circle" },
  { id: "square", icon: Square, label: "Rounded square" },
];

const borderColors = [
  { label: "Cyan", value: "#00d4ff" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Orange", value: "#f97316" },
  { label: "White", value: "#ffffff" },
];

export function WebcamBubble({ stream, rect, onChange, interactive = true }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      onChange(prev => {
        const sizePx = prev.wPct * w;
        const xPct = Math.min(Math.max((e.clientX - sizePx / 2) / w, 0), 1 - prev.wPct);
        const yPct = Math.min(Math.max((e.clientY - sizePx / 2) / h, 0), 1 - (sizePx / h));
        return { ...prev, xPct, yPct };
      });
    };
    const handleUp = () => setDragging(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragging, onChange]);

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (e: PointerEvent) => {
      const w = window.innerWidth;
      onChange(prev => {
        const centerX = (prev.xPct + prev.wPct / 2) * w;
        const centerY = (prev.yPct + prev.wPct / 2) * window.innerHeight;
        const dist = Math.hypot(e.clientX - centerX, e.clientY - centerY);
        const newWPct = Math.min(Math.max((dist * 2) / w, MIN_W_PCT), MAX_W_PCT);
        const sizePx = newWPct * w;
        const xPct = Math.min(Math.max((centerX - sizePx / 2) / w, 0), 1 - newWPct);
        const yPct = Math.min(Math.max((centerY - sizePx / 2) / window.innerHeight, 0), 1 - (sizePx / window.innerHeight));
        return { ...prev, wPct: newWPct, xPct, yPct };
      });
    };
    const handleUp = () => setResizing(false);

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [resizing, onChange]);

  const sizePx = rect.wPct * window.innerWidth;
  const isCircle = rect.shape === "circle";
  const showControls = hovering || dragging || resizing;

  return (
    <div
      onPointerDown={interactive ? (e) => {
        e.preventDefault();
        setDragging(true);
      } : undefined}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={`fixed z-40 shadow-2xl shadow-black/50 border-[3px] overflow-visible select-none animate-in fade-in zoom-in-95 duration-300 ${interactive ? (dragging ? "cursor-grabbing scale-[1.02]" : "cursor-grab") : ""
        } ${isCircle ? "rounded-full" : "rounded-2xl"} transition-[border-radius,transform] duration-200`}
      style={{
        left: rect.xPct * window.innerWidth,
        top: rect.yPct * window.innerHeight,
        width: sizePx,
        height: sizePx,
        borderColor: rect.borderColor,
      }}
      title={interactive ? "Drag to reposition" : "Camera preview"}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ transform: "scaleX(-1)" }}
        className={`w-full h-full object-cover pointer-events-none ${isCircle ? "rounded-full" : "rounded-[14px]"}`}
      />

      {!interactive && (
        <div className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          REC
        </div>
      )}

      {interactive && (
        <>
          {/* Hover toolbar: shape + border color */}
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex items-center gap-2.5 px-2.5 py-2 glass-panel rounded-2xl shadow-xl transition-all duration-200 whitespace-nowrap ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none"
              }`}
          >
            {/* Shape picker */}
            <div className="flex items-center gap-1 pr-2 border-r border-border/40">
              {shapes.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => onChange(prev => ({ ...prev, shape: id }))}
                  title={label}
                  className={`p-1.5 rounded-lg transition-all duration-150 ${rect.shape === id
                    ? "bg-primary text-primary-foreground scale-105"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                    }`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Border color picker */}
            <div className="flex items-center gap-1.5">
              {borderColors.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onChange(prev => ({ ...prev, borderColor: c.value }))}
                  title={c.label}
                  className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-110 ${rect.borderColor === c.value ? "border-white scale-110 ring-2 ring-primary/30" : "border-transparent"
                    }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Resize handle */}
          <div
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setResizing(true);
            }}
            title="Drag to resize"
            className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary border-2 border-background cursor-nwse-resize transition-all duration-150 ${showControls ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"
              }`}
          />
        </>
      )}
    </div>
  );
}
