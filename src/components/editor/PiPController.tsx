import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    MousePointer2, Square, MoveRight, Pencil, Type, MessageCircle, Trash2,
    StopCircle, Pause, Play, Mic, MicOff
} from "lucide-react";
import type { ToolType } from "@/hooks/useCanvas";
import type { RecordingState } from "@/hooks/useRecorder";
import { Theme } from "@/hooks/useTheme";

interface Props {
    pipWindow: Window;
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onDelete: () => void;
    strokeColor: string;
    onColorChange: (color: string) => void;
    hasSelection: boolean;
    theme: Theme;
    // Recording props
    recorderState: RecordingState;
    recorderElapsed: number;
    recorderIsMuted: boolean;
    onRecordStop: () => void;
    onRecordPause: () => void;
    onRecordResume: () => void;
    onRecordToggleMute: () => void;
    formatTime: (s: number) => string;
}

const colors = [
    { label: "Cyan", value: "#00d4ff" },
    { label: "Purple", value: "#a855f7" },
    { label: "Pink", value: "#ec4899" },
    { label: "Orange", value: "#f97316" },
    { label: "White", value: "#ffffff" },
];

const annotationTools: { id: ToolType; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select (V)" },
    { id: "rectangle", icon: Square, label: "Rectangle (R)" },
    { id: "arrow", icon: MoveRight, label: "Arrow (A)" },
    { id: "pencil", icon: Pencil, label: "Pencil (P)" },
    { id: "text", icon: Type, label: "Text (T)" },
    { id: "comment", icon: MessageCircle, label: "Comment Pin (C)" },
];

/**
 * PiP Controller - Annotation Tools + Recording Controls.
 * Shown when user navigates away from studio during recording.
 */
export function PiPController({
    pipWindow,
    activeTool, onToolChange, onDelete,
    strokeColor, onColorChange,
    hasSelection,
    theme,
    recorderState, recorderElapsed, recorderIsMuted,
    onRecordStop, onRecordPause, onRecordResume, onRecordToggleMute,
    formatTime,
}: Props) {
    const [showColors, setShowColors] = useState(false);
    const isRecording = recorderState === "recording" || recorderState === "paused";

    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const bg = isDark ? "hsl(228 14% 8%)" : "#ffffff";
    const textColor = isDark ? "hsl(220 10% 60%)" : "#64748b";
    const activeText = isDark ? "hsl(228 14% 7%)" : "#ffffff";
    const dividerColor = isDark ? "hsla(228, 14%, 30%, 0.3)" : "rgba(0,0,0,0.08)";

    const toggleColors = () => {
        const next = !showColors;
        setShowColors(next);
        try {
            if (next) {
                pipWindow.resizeTo(380, 280);
                pipWindow.focus();
            } else {
                pipWindow.resizeTo(380, isRecording ? 100 : 72);
            }
        } catch (e) {
            console.warn("Resize failed:", e);
        }
    };

    useEffect(() => {
        try {
            if (showColors) return;
            pipWindow.resizeTo(380, isRecording ? 100 : 72);
        } catch (e) { /* ignore */ }
    }, [isRecording, showColors]);

    const btnStyle = (active = false): React.CSSProperties => ({
        padding: "6px",
        borderRadius: "10px",
        background: active ? "hsl(190 100% 50%)" : "transparent",
        color: active ? activeText : textColor,
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        outline: "none",
    });

    return createPortal(
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                padding: "6px 12px",
                background: bg,
                fontFamily: "'Inter', system-ui, sans-serif",
                boxSizing: "border-box",
                overflow: "hidden",
                transition: "background 0.3s ease",
                gap: "6px",
            }}
        >
            {/* Color List (Visible when expanded) */}
            {showColors && (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "4px",
                    padding: "8px",
                    background: isDark ? "hsla(228, 14%, 20%, 0.2)" : "rgba(0,0,0,0.03)",
                    borderRadius: "20px",
                    border: isDark ? "1px solid hsla(228, 14%, 30%, 0.3)" : "1px solid rgba(0,0,0,0.05)",
                }}>
                    {colors.map(c => (
                        <button
                            key={c.value}
                            onClick={() => {
                                onColorChange(c.value);
                                setShowColors(false);
                            }}
                            style={{
                                width: "18px",
                                height: "18px",
                                borderRadius: "50%",
                                backgroundColor: c.value,
                                border: strokeColor === c.value ? (isDark ? "2px solid white" : "2px solid #000") : "1px solid rgba(0,0,0,0.1)",
                                cursor: "pointer",
                                transition: "transform 0.2s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.2)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                        />
                    ))}
                </div>
            )}

            {/* Tool Toolbar Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "1px", width: "100%", justifyContent: "center" }}>

                {/* Expandable Color Toggle */}
                <div style={{ display: "flex", alignItems: "center", marginRight: "6px", paddingRight: "8px", borderRight: `1px solid ${dividerColor}` }}>
                    <button
                        onClick={toggleColors}
                        style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "50%",
                            backgroundColor: strokeColor,
                            border: "2px solid white",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                            cursor: "pointer",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.1)"}
                        onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    />
                </div>

                {annotationTools.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => onToolChange(id)}
                        title={label}
                        style={btnStyle(activeTool === id)}
                        onMouseEnter={(e) => {
                            if (activeTool !== id) {
                                e.currentTarget.style.background = isDark ? "hsla(228, 14%, 20%, 0.4)" : "rgba(0,0,0,0.05)";
                                e.currentTarget.style.color = isDark ? "hsl(220 20% 90%)" : "#1e293b";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTool !== id) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = textColor;
                            }
                        }}
                    >
                        <Icon size={18} />
                    </button>
                ))}

                {/* Divider */}
                <div style={{ width: "1px", height: "24px", background: dividerColor, margin: "0 4px" }} />

                {/* Delete Action */}
                <button
                    onClick={onDelete}
                    disabled={!hasSelection}
                    title={hasSelection ? "Delete Selected (Del)" : "Select object to delete"}
                    style={{
                        ...btnStyle(),
                        color: "hsl(0 72% 55%)",
                        opacity: hasSelection ? 1 : 0.3,
                        pointerEvents: hasSelection ? "auto" : "none",
                        cursor: hasSelection ? "pointer" : "default",
                    }}
                    onMouseEnter={(e) => {
                        if (hasSelection) e.currentTarget.style.background = "hsla(0, 72%, 55%, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                        if (hasSelection) e.currentTarget.style.background = "transparent";
                    }}
                >
                    <Trash2 size={18} />
                </button>
            </div>

            {/* Recording Controls Row (shown when recording) */}
            {isRecording && (
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    width: "100%",
                    justifyContent: "center",
                    borderTop: `1px solid ${dividerColor}`,
                    paddingTop: "6px",
                }}>
                    {/* Recording dot + timer */}
                    <div style={{
                        width: "8px", height: "8px", borderRadius: "50%",
                        background: recorderState === "recording" ? "#ef4444" : "#f59e0b",
                        animation: recorderState === "recording" ? "pulse 1.5s infinite" : "none",
                        boxShadow: recorderState === "recording" ? "0 0 6px rgba(239,68,68,0.5)" : "none",
                    }} />
                    <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "12px",
                        color: textColor,
                        fontVariantNumeric: "tabular-nums",
                        minWidth: "40px",
                    }}>
                        {formatTime(recorderElapsed)}
                    </span>

                    <div style={{ width: "1px", height: "18px", background: dividerColor, margin: "0 2px" }} />

                    {/* Pause / Resume */}
                    <button
                        onClick={recorderState === "paused" ? onRecordResume : onRecordPause}
                        title={recorderState === "paused" ? "Resume" : "Pause"}
                        style={btnStyle()}
                        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "hsla(228, 14%, 20%, 0.4)" : "rgba(0,0,0,0.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        {recorderState === "paused" ? <Play size={16} /> : <Pause size={16} />}
                    </button>

                    {/* Mute toggle */}
                    <button
                        onClick={onRecordToggleMute}
                        title={recorderIsMuted ? "Unmute" : "Mute"}
                        style={btnStyle()}
                        onMouseEnter={(e) => { e.currentTarget.style.background = isDark ? "hsla(228, 14%, 20%, 0.4)" : "rgba(0,0,0,0.05)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        {recorderIsMuted ? <MicOff size={16} /> : <Mic size={16} />}
                    </button>

                    {/* Stop */}
                    <button
                        onClick={onRecordStop}
                        title="Stop Recording"
                        style={{
                            ...btnStyle(),
                            color: "#ef4444",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "hsla(0, 72%, 55%, 0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                        <StopCircle size={18} />
                    </button>
                </div>
            )}
        </div>,
        pipWindow.document.body
    );
}
