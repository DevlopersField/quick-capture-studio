import { createPortal } from "react-dom";
import {
    MousePointer2, Square, MoveRight, Pencil, Type, MessageCircle, Trash2
} from "lucide-react";
import type { ToolType } from "@/hooks/useCanvas";

interface Props {
    pipWindow: Window;
    activeTool: ToolType;
    onToolChange: (tool: ToolType) => void;
    onDelete: () => void;
    strokeColor: string;
    onColorChange: (color: string) => void;
}

const colors = [
    { label: "Cyan", value: "#00d4ff" },
    { label: "Purple", value: "#a855f7" },
    { label: "Pink", value: "#ec4899" },
    { label: "Orange", value: "#f97316" },
];

const annotationTools: { id: ToolType; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: "Select (V)" },
    { id: "rectangle", icon: Square, label: "Rectangle (R)" },
    { id: "arrow", icon: MoveRight, label: "Arrow (A)" },
    { id: "pencil", icon: Pencil, label: "Pencil (P)" },
    { id: "text", icon: Text, label: "Text (T)" },
    { id: "comment", icon: MessageCircle, label: "Comment Pin (C)" },
];

/**
 * Minimized PiP Controller - Annotation Tools Only.
 * Designed to look like the main bottom toolbar.
 */
export function PiPController({
    pipWindow,
    activeTool, onToolChange, onDelete,
    strokeColor, onColorChange,
}: Props) {
    return createPortal(
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                width: "100%",
                height: "100%",
                padding: "6px 10px",
                background: "hsl(228 14% 8%)",
                fontFamily: "'Inter', system-ui, sans-serif",
                boxSizing: "border-box",
                border: "1px solid hsla(228, 14%, 20%, 0.4)",
                borderRadius: "12px",
            }}
        >
            {/* Color Selection Row (Minimal) */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "2px" }}>
                {colors.map(c => (
                    <button
                        key={c.value}
                        onClick={() => onColorChange(c.value)}
                        style={{
                            width: "10px",
                            height: "10px",
                            borderRadius: "50%",
                            backgroundColor: c.value,
                            border: strokeColor === c.value ? "1.5px solid white" : "none",
                            cursor: "pointer",
                            padding: 0,
                        }}
                    />
                ))}
            </div>

            {/* Tool Icons Row */}
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
                {annotationTools.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => onToolChange(id)}
                        title={label}
                        style={{
                            padding: "8px",
                            borderRadius: "10px",
                            background: activeTool === id ? "hsl(190 100% 50%)" : "transparent",
                            color: activeTool === id ? "hsl(228 14% 7%)" : "hsl(220 10% 60%)",
                            border: "none",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                            outline: "none",
                        }}
                        onMouseEnter={(e) => {
                            if (activeTool !== id) {
                                e.currentTarget.style.background = "hsla(228, 14%, 20%, 0.4)";
                                e.currentTarget.style.color = "hsl(220 20% 90%)";
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (activeTool !== id) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "hsl(220 10% 60%)";
                            }
                        }}
                    >
                        <Icon size={18} />
                    </button>
                ))}

                {/* Divider */}
                <div style={{ width: "1px", height: "24px", background: "hsla(228, 14%, 30%, 0.3)", margin: "0 6px" }} />

                {/* Delete Action */}
                <button
                    onClick={onDelete}
                    title="Delete (Del)"
                    style={{
                        padding: "8px",
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
