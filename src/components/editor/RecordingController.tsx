import { Circle, Square, Mic, MicOff, Pause, Play } from "lucide-react";
import type { RecordingState } from "@/hooks/useRecorder";

interface Props {
  state: RecordingState;
  elapsed: number;
  isMuted: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleMute: () => void;
  formatTime: (s: number) => string;
}

export function RecordingController({
  state, elapsed, isMuted,
  onStart, onStop, onPause, onResume, onToggleMute, formatTime,
}: Props) {
  if (state === "finished" || state === "idle") {
    return (
      <button
        onClick={onStart}
        className="flex items-center gap-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-red-500/20"
      >
        <Circle size={12} className="fill-current" />
        Record
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 animate-fade-in">
      {/* Recording indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
        <span className={`recording-dot ${state === "paused" ? "animate-pulse" : ""}`} />
        <span className="text-sm font-mono text-foreground tabular-nums">
          {formatTime(elapsed)}
        </span>
        {state === "paused" && (
          <span className="text-[10px] uppercase tracking-wider text-warning font-semibold">
            Paused
          </span>
        )}
      </div>

      {/* Pause / Resume */}
      {state === "recording" ? (
        <button
          onClick={onPause}
          title="Pause"
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-150"
        >
          <Pause size={16} />
        </button>
      ) : (
        <button
          onClick={onResume}
          title="Resume"
          className="p-2 rounded-lg text-primary hover:text-primary hover:bg-primary/10 transition-all duration-150"
        >
          <Play size={16} />
        </button>
      )}

      {/* Mute Toggle */}
      <button
        onClick={onToggleMute}
        title={isMuted ? "Unmute Mic" : "Mute Mic"}
        className={`p-2 rounded-lg transition-all duration-150 ${isMuted
            ? "text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            : "text-success hover:text-success hover:bg-success/10"
          }`}
      >
        {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
      </button>

      {/* Stop */}
      <button
        onClick={onStop}
        className="flex items-center gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 hover:scale-[1.03]"
      >
        <Square size={10} className="fill-current" />
        Stop
      </button>
    </div>
  );
}
