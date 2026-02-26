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
    },
    {
      icon: FileText, label: "Download PDF", desc: "Export as PDF document",
      onClick: onExportPDF, available: true,
    },
    {
      icon: Video, label: "Save Video", desc: videoUrl ? "Download recording" : "Record first",
      onClick: onDownloadVideo, available: !!videoUrl,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-foreground">Export</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {options.map(({ icon: Icon, label, desc, onClick, available }) => (
            <button
              key={label}
              onClick={() => { onClick(); onClose(); }}
              disabled={!available}
              className="flex items-center gap-3 w-full p-3.5 rounded-xl text-left transition-all duration-150 border border-transparent hover:border-primary/30 hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed group"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
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
