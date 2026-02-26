import { Circle, Square, Mic, MicOff } from "lucide-react";
import type { RecordingState } from "@/hooks/useRecorder";

interface Props {
  state: RecordingState;
  elapsed: number;
  isMuted: boolean;
  onStart: () => void;
  onStop: () => void;
  onToggleMute: () => void;
  formatTime: (s: number) => string;
}

export function RecordingController({
  state, elapsed, isMuted,
  onStart, onStop, onToggleMute, formatTime,
}: Props) {
  if (state === "finished" || state === "idle") {
    return (
      <button
        onClick={onStart}
        className="flex items-center gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        <Circle size={14} className="fill-current" />
        Record Screen
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-toolbar/95 backdrop-blur-md border border-border rounded-xl px-3 py-2 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full bg-destructive animate-pulse-glow" />
        <span className="text-sm font-mono text-foreground">{formatTime(elapsed)}</span>
      </div>
      <div className="w-px h-5 bg-border" />
      <button
        onClick={onToggleMute}
        title={isMuted ? "Unmute" : "Mute"}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
      >
        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
      </button>
      <button
        onClick={onStop}
        className="flex items-center gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
      >
        <Square size={12} className="fill-current" />
        Stop
      </button>
    </div>
  );
}
