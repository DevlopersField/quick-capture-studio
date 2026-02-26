import {
  MousePointer2, Square, MoveRight, Pencil, Type,
  MessageCircle, Trash2
} from "lucide-react";
import type { ToolType } from "@/hooks/useCanvas";
import type { RecordingState } from "@/hooks/useRecorder";
import { RecordingController } from "./RecordingController";
import { Upload, Camera, Download } from "lucide-react";

interface Props {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onDelete: () => void;
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
  onMockCapture: () => void;
  onExport: () => void;
}

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
  recorderState, recorderElapsed, recorderIsMuted,
  onRecordStart, onRecordStop, onRecordPause, onRecordResume,
  onRecordToggleMute, formatTime,
  onUpload, onMockCapture, onExport,
}: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 px-4 pointer-events-none animate-slide-up">
      <div className="glass-panel rounded-2xl px-3 py-2.5 flex items-center gap-1 shadow-2xl shadow-black/40 pointer-events-auto max-w-fit">

        {/* === Annotation Tools (Left) === */}
        <div className="flex items-center gap-0.5">
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
          <button
            onClick={onDelete}
            title="Delete Selected (Del)"
            className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
          >
            <Trash2 size={18} />
          </button>
        </div>

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
            onClick={onMockCapture}
            title="Mock Capture"
            className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-200"
          >
            <Camera size={18} />
          </button>
          <button
            onClick={onExport}
            title="Export / Download"
            className="flex items-center gap-1.5 bg-primary/90 hover:bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-cyan-500/20"
          >
            <Download size={15} />
            Export
          </button>
        </div>

      </div>
    </div>
  );
}
