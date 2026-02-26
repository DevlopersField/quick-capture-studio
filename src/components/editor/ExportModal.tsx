import { X, Image, FileText, Video } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onExportPNG: () => void;
  onExportPDF: () => void;
  videoUrl: string | null;
  onDownloadVideo: () => void;
}

export function ExportModal({
  open, onClose, onExportPNG, onExportPDF, videoUrl, onDownloadVideo,
}: Props) {
  if (!open) return null;

  const options = [
    {
      icon: Image, label: "Download PNG", desc: "Flattened canvas image",
      onClick: onExportPNG, available: true,
      gradient: "from-cyan-500/10 to-blue-500/10",
    },
    {
      icon: FileText, label: "Download PDF", desc: "Export as PDF document",
      onClick: onExportPDF, available: true,
      gradient: "from-purple-500/10 to-pink-500/10",
    },
    {
      icon: Video, label: "Save Video", desc: videoUrl ? "Download recording" : "Record a session first",
      onClick: onDownloadVideo, available: !!videoUrl,
      gradient: "from-red-500/10 to-orange-500/10",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]" onClick={onClose}>
      <div
        className="glass-panel rounded-2xl w-full max-w-sm p-6 shadow-[0_20px_50px_rgba(0,0,0,0.2)] animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Export</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Video Preview */}
        {videoUrl && (
          <div className="mb-4 rounded-xl overflow-hidden border border-border/40">
            <video
              src={videoUrl}
              controls
              className="w-full h-auto max-h-40 bg-black"
              preload="metadata"
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {options.map(({ icon: Icon, label, desc, onClick, available, gradient }) => (
            <button
              key={label}
              onClick={() => { onClick(); onClose(); }}
              disabled={!available}
              className={`flex items-center gap-3 w-full p-3.5 rounded-xl text-left transition-all duration-200 border border-transparent hover:border-primary/20 hover:bg-gradient-to-r ${gradient} disabled:opacity-30 disabled:cursor-not-allowed group hover:scale-[1.01]`}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <Icon size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
