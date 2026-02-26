import {
  MousePointer2, Square, MoveRight, Pencil, Type,
  MessageCircle, Trash2
} from "lucide-react";
import type { ToolType } from "@/hooks/useCanvas";

interface Props {
  activeTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  onDelete: () => void;
}

const tools: { id: ToolType; icon: React.ElementType; label: string }[] = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "rectangle", icon: Square, label: "Rectangle" },
  { id: "arrow", icon: MoveRight, label: "Arrow" },
  { id: "pencil", icon: Pencil, label: "Pencil" },
  { id: "text", icon: Type, label: "Text" },
  { id: "comment", icon: MessageCircle, label: "Comment Pin" },
];

export function FloatingToolbar({ activeTool, onToolChange, onDelete }: Props) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-toolbar/95 backdrop-blur-md border border-border rounded-xl px-2 py-1.5 shadow-lg animate-fade-in">
      {tools.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => onToolChange(id)}
          title={label}
          className={`p-2.5 rounded-lg transition-all duration-150 ${
            activeTool === id
              ? "bg-primary text-primary-foreground glow-cyan-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
          }`}
        >
          <Icon size={18} />
        </button>
      ))}
      <div className="w-px h-6 bg-border mx-1" />
      <button
        onClick={onDelete}
        title="Delete Selected"
        className="p-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-surface-hover transition-all duration-150"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
