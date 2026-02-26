import { useRef, useCallback } from "react";
import { Upload, Download, Camera } from "lucide-react";
import { useCanvas } from "@/hooks/useCanvas";
import { useRecorder } from "@/hooks/useRecorder";
import { FloatingToolbar } from "./FloatingToolbar";
import { CommentPanel } from "./CommentPanel";
import { RecordingController } from "./RecordingController";
import { ExportModal } from "./ExportModal";
import { useState } from "react";

// Demo image for mock capture
const MOCK_IMAGE = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80";

export function EditorWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);

  const {
    activeTool, setActiveTool, comments,
    loadImage, loadImageFromFile, exportPNG, exportPDF,
    deleteSelected, updateComment, hasImage,
  } = useCanvas(containerRef);

  const recorder = useRecorder();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFromFile(file);
  }, [loadImageFromFile]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Top Bar */}
        <header className="flex items-center justify-between px-4 py-2.5 bg-card border-b border-border z-10">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Camera size={14} className="text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground tracking-tight">1ClickCapture</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RecordingController
              state={recorder.state}
              elapsed={recorder.elapsed}
              isMuted={recorder.isMuted}
              onStart={recorder.startRecording}
              onStop={recorder.stopRecording}
              onToggleMute={recorder.toggleMute}
              formatTime={recorder.formatTime}
            />
            <div className="w-px h-6 bg-border" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <Upload size={15} />
              Upload
            </button>
            <button
              onClick={() => loadImage(MOCK_IMAGE)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <Camera size={15} />
              Mock Capture
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 glow-cyan-sm transition-all"
            >
              <Download size={15} />
              Export
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        </header>

        {/* Floating Toolbar */}
        <FloatingToolbar activeTool={activeTool} onToolChange={setActiveTool} onDelete={deleteSelected} />

        {/* Canvas */}
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas id="editor-canvas" />
          {/* Empty State */}
          {!hasImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-secondary/50 flex items-center justify-center">
                  <Camera size={28} className="text-primary/60" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground/60">No capture loaded</p>
                  <p className="text-xs text-muted-foreground mt-1">Upload an image or use Mock Capture to get started</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comment Side Panel */}
      <aside className="w-72 bg-card border-l border-border flex flex-col">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feedback</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <CommentPanel comments={comments} onUpdate={updateComment} />
        </div>
      </aside>

      {/* Export Modal */}
      <ExportModal
        open={showExport}
        onClose={() => setShowExport(false)}
        onExportPNG={exportPNG}
        onExportPDF={exportPDF}
        videoUrl={recorder.videoUrl}
        onDownloadVideo={recorder.downloadVideo}
      />
    </div>
  );
}
