import { useState, useCallback } from "react";
import { Undo2, Redo2, Clipboard, MousePointer2, Square, MoveRight, Pencil, Type, MessageCircle, Trash2, Upload, Camera, Download, Check, MessageSquare } from "lucide-react";
import type { ToolType } from "@/hooks/useCanvas";
import type { RecordingState } from "@/hooks/useRecorder";
import { RecordingController } from "./RecordingController";

interface Props {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  hasContent: boolean;
  hasSelection: boolean;
  // Recording props
  recorderState: RecordingState;
  recorderElapsed: number;
  recorderIsMuted: boolean;
  onRecordStart: () => void;
  onRecordStop: () => void;
  onRecordPause: () => void;
  onRecordResume: () => void;
  onRecordToggleMute: () => void;
  formatTime: (s: number) => string;
  // Action props
  onUpload: () => void;
  onExport: () => void;

  strokeColor: string;
  onColorChange: (color: string) => void;
}

const colors = [
  { label: "Cyan", value: "#00d4ff" },
  { label: "Purple", value: "#a855f7" },
  { label: "Pink", value: "#ec4899" },
  { label: "Orange", value: "#f97316" },
  { label: "White", value: "#ffffff" },
];

const tools: { id: ToolType; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select (V)" },
  { id: "rectangle", icon: Square, label: "Rectangle (R)" },
  { id: "arrow", icon: MoveRight, label: "Arrow (A)" },
  { id: "pencil", icon: Pencil, label: "Pencil (P)" },
  { id: "text", icon: Type, label: "Text (T)" },
  { id: "comment", icon: MessageCircle, label: "Comment Pin (C)" },
];

export function FloatingToolbar({
  activeTool, onToolChange, onDelete,
  onUndo, onRedo, hasContent, hasSelection,
  recorderState, recorderElapsed, recorderIsMuted,
  onRecordStart, onRecordStop, onRecordPause, onRecordResume,
  onRecordToggleMute, formatTime,
  onUpload, onExport,
  strokeColor, onColorChange,
}: Props) {
  const isRecording = recorderState === "recording" || recorderState === "paused";
  const [showColorPicker, setShowColorPicker] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none animate-slide-up">
      <div className="glass-panel rounded-2xl px-3 py-2.5 flex items-center gap-1 shadow-2xl shadow-black/40 pointer-events-auto max-w-fit relative">

        {/* === Annotation Tools (Left) === */}
        {
          <div className="flex items-center gap-0.5 animate-fade-in">
            {/* Minimal Vertical Color Picker */}
            <div className="relative mr-1.5 pr-2 border-r border-border/40 flex items-center">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-6 h-6 rounded-full border-2 border-white/80 shadow-lg transition-transform hover:scale-110 active:scale-95"
                style={{ backgroundColor: strokeColor }}
                title="Select Color"
              />

              {showColorPicker && (
                <div className="absolute bottom-full left-0 mb-4 flex flex-col gap-2 p-1.5 glass-panel rounded-full animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-xl">
                  {colors.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => {
                        onColorChange(c.value);
                        setShowColorPicker(false);
                      }}
                      className={`w-5 h-5 rounded-full border-1.5 transition-all hover:scale-110 ${strokeColor === c.value ? "border-white scale-110 ring-2 ring-primary/20" : "border-transparent"
                        }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              )}
            </div>

            {tools.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => onToolChange(id)}
                title={label}
                className={`p-2.5 rounded-xl transition-all duration-200 ${activeTool === id
                  ? "bg-primary text-primary-foreground glow-cyan-sm scale-105"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                  }`}
              >
                <Icon size={18} />
              </button>
            ))}

            <div className="w-px h-6 bg-border/40 mx-1" />

            <button
              onClick={onUndo}
              title="Undo (Ctrl+Z)"
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-200"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={onRedo}
              title="Redo (Ctrl+Y)"
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-200"
            >
              <Redo2 size={18} />
            </button>

            <button
              onClick={onDelete}
              disabled={!hasSelection}
              title={hasSelection ? "Delete Selected (Del)" : "Select an object to delete"}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Trash2 size={18} />
            </button>
          </div>
        }

        {/* Divider */}
        <div className="w-px h-8 bg-border/50 mx-2" />

        {/* === Recording Controls (Center) === */}
        <RecordingController
          state={recorderState}
          elapsed={recorderElapsed}
          isMuted={recorderIsMuted}
          onStart={onRecordStart}
          onStop={onRecordStop}
          onPause={onRecordPause}
          onResume={onRecordResume}
          onToggleMute={onRecordToggleMute}
          formatTime={formatTime}
        />

        {/* Divider */}
        <div className="w-px h-8 bg-border/50 mx-2" />

        {/* === Actions (Right) === */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUpload}
            title="Upload Image"
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-200"
          >
            <Upload size={18} />
          </button>
          <button
            onClick={onExport}
            disabled={!hasContent}
            title={hasContent ? "Export / Download" : "Capture something first to export"}
            className="flex items-center gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-cyan-500/20 disabled:opacity-30 disabled:pointer-events-none disabled:grayscale"
          >
            <Download size={15} />
            Export
          </button>
        </div>

      </div>
    </div>
  );
}
