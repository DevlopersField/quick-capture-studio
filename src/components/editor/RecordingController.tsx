import { useState } from "react";
import { Circle, Square, Mic, MicOff, Pause, Play, MonitorUp, Video, PictureInPicture2, ChevronDown } from "lucide-react";
import type { RecordingState, RecordingMode } from "@/hooks/useRecorder";

interface Props {
  state: RecordingState;
  elapsed: number;
  isMuted: boolean;
  onStart: (mode: RecordingMode) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onToggleMute: () => void;
  formatTime: (s: number) => string;
}

const recordModes: { id: RecordingMode; icon: React.ElementType; label: string; hint: string }[] = [
  { id: "screen", icon: MonitorUp, label: "Screen Only", hint: "Record your screen" },
  { id: "camera", icon: Video, label: "Camera Only", hint: "Record your webcam" },
  { id: "both", icon: PictureInPicture2, label: "Screen + Camera", hint: "Webcam overlay while recording" },
];

export function RecordingController({
  state, elapsed, isMuted,
  onStart, onStop, onPause, onResume, onToggleMute, formatTime,
}: Props) {
  const [showModeMenu, setShowModeMenu] = useState(false);

  if (state === "finished" || state === "idle") {
    return (
      <div className="relative">
        <button
          onClick={() => setShowModeMenu((v) => !v)}
          className={`flex items-center gap-2 bg-destructive/90 hover:bg-destructive text-destructive-foreground px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] hover:shadow-lg hover:shadow-red-500/20 ${showModeMenu ? "scale-[1.03]" : ""
            }`}
        >
          <Circle size={12} className="fill-current" />
          Record
          <ChevronDown size={14} className={`transition-transform duration-200 ${showModeMenu ? "rotate-180" : ""}`} />
        </button>

        {showModeMenu && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col gap-1 p-1.5 w-56 glass-panel rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 shadow-xl z-10">
            {recordModes.map(({ id, icon: Icon, label, hint }, i) => (
              <button
                key={id}
                onClick={() => {
                  onStart(id);
                  setShowModeMenu(false);
                }}
                style={{ animationDelay: `${i * 40}ms` }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-200 hover:scale-[1.02] animate-in fade-in slide-in-from-left-1"
              >
                <Icon size={17} className="shrink-0 text-primary" />
                <span className="flex flex-col">
                  <span className="text-sm font-medium leading-tight">{label}</span>
                  <span className="text-[11px] text-muted-foreground/70 leading-tight">{hint}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
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
