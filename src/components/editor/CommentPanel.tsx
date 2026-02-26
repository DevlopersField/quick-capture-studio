import { MessageCircle, X } from "lucide-react";

interface Comment {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface Props {
  comments: Comment[];
  onUpdate: (id: number, text: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentPanel({ comments, onUpdate, isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <aside className="fixed top-0 right-0 h-full w-80 z-40 glass-panel border-l border-border/40 flex flex-col animate-slide-in-right shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <MessageCircle size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Feedback
            {comments.length > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">
                ({comments.length})
              </span>
            )}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 px-6">
            <div className="w-14 h-14 rounded-2xl bg-secondary/40 flex items-center justify-center">
              <MessageCircle size={24} className="opacity-40" />
            </div>
            <p className="text-sm text-center leading-relaxed">
              Use the <span className="text-primary font-medium">Comment Pin</span> tool to drop
              numbered pins on the canvas
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 p-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="bg-surface/60 rounded-xl p-3 border border-border/30 animate-fade-in hover:border-border/60 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {c.id}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    ({Math.round(c.x)}, {Math.round(c.y)})
                  </span>
                </div>
                <textarea
                  value={c.text}
                  onChange={(e) => onUpdate(c.id, e.target.value)}
                  placeholder="Add your feedback..."
                  rows={2}
                  className="w-full bg-muted/50 border-none rounded-lg px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
