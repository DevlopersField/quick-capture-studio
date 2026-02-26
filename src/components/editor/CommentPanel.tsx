import { MessageCircle } from "lucide-react";

interface Comment {
  id: number;
  x: number;
  y: number;
  text: string;
}

interface Props {
  comments: Comment[];
  onUpdate: (id: number, text: string) => void;
}

export function CommentPanel({ comments, onUpdate }: Props) {
  if (comments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 px-4">
        <MessageCircle size={32} className="opacity-40" />
        <p className="text-sm text-center leading-relaxed">
          Use the <span className="text-primary font-medium">Comment Pin</span> tool to drop numbered pins on the canvas
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-3 overflow-y-auto">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
        Comments ({comments.length})
      </h3>
      {comments.map((c) => (
        <div key={c.id} className="bg-surface rounded-lg p-3 border border-border animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-semibold text-accent-foreground">
              {c.id}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              ({Math.round(c.x)}, {Math.round(c.y)})
            </span>
          </div>
          <textarea
            value={c.text}
            onChange={(e) => onUpdate(c.id, e.target.value)}
            placeholder="Add your feedback..."
            rows={2}
            className="w-full bg-muted border-none rounded-md px-2.5 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      ))}
    </div>
  );
}
