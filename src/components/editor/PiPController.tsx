import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
    MousePointer2, Square, MoveRight, Pencil, Type, MessageCircle, Trash2
} from "lucide-react";
import type { ToolType } from "@/hooks/useCanvas";
import { Theme } from "@/hooks/useTheme";

interface Props {
    pipWindow: Window;
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onDelete: () => void;
    strokeColor: string;
    onColorChange: (color: string) => void;
    theme: Theme;
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
 * Minimized PiP Controller - Annotation Tools Only.
 * Resizes dynamically when color picker is toggled.
 */
export function PiPController({
    pipWindow,
    activeTool, onToolChange, onDelete,
    strokeColor, onColorChange,
    theme,
}: Props) {
    const [showColors, setShowColors] = useState(false);

    // Resolve theme
    const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

    const bg = isDark ? "hsl(228 14% 8%)" : "#ffffff";
    const border = isDark ? "1px solid hsla(228, 14%, 20%, 0.4)" : "1px solid rgba(0,0,0,0.1)";
    const textColor = isDark ? "hsl(220 10% 60%)" : "#64748b";
    const activeText = isDark ? "hsl(228 14% 7%)" : "#ffffff";

    // Handle dynamic window resizing (safety check included)
    useEffect(() => {
        if (typeof pipWindow?.resizeTo !== "function") return;

        try {
            if (showColors) {
                pipWindow.resizeTo(320, 240); // Expand for color list
                pipWindow.focus?.();
            } else {
                pipWindow.resizeTo(320, 56); // Reset to base height
            }
        } catch (e) {
            console.warn("Could not resize PiP window:", e);
        }
    }, [showColors, pipWindow]);

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
            }}
        >
            {/* Color List (Visible when expanded) */}
            {showColors && (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "12px",
                    padding: "8px",
                    background: isDark ? "hsla(228, 14%, 20%, 0.2)" : "rgba(0,0,0,0.03)",
                    borderRadius: "20px",
                    border: isDark ? "1px solid hsla(228, 14%, 30%, 0.3)" : "1px solid rgba(0,0,0,0.05)",
                    animation: "fade-in 0.2s ease-out",
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
                <div style={{ display: "flex", alignItems: "center", marginRight: "6px", paddingRight: "8px", borderRight: isDark ? "1px solid hsla(228, 14%, 30%, 0.3)" : "1px solid rgba(0,0,0,0.08)" }}>
                    <button
                        onClick={() => setShowColors(!showColors)}
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
                        style={{
                            padding: "6px",
                            borderRadius: "10px",
                            background: activeTool === id ? "hsl(190 100% 50%)" : "transparent",
                            color: activeTool === id ? activeText : textColor,
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s ease",
                            outline: "none",
                        }}
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
                <div style={{ width: "1px", height: "24px", background: isDark ? "hsla(228, 14%, 30%, 0.3)" : "rgba(0,0,0,0.08)", margin: "0 4px" }} />

                {/* Delete Action */}
                <button
                    onClick={onDelete}
                    title="Delete (Del)"
                    style={{
                        padding: "6px",
                        borderRadius: "10px",
                        background: "transparent",
                        color: "hsl(0 72% 55%)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                        outline: "none",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = "hsla(0, 72%, 55%, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                    }}
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>,
        pipWindow.document.body
    );
}
