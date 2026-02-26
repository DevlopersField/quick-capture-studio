import { useRef, useCallback, useState, useEffect } from "react";
import { Camera, MessageCircle } from "lucide-react";
import { useCanvas } from "@/hooks/useCanvas";
import { useRecorder } from "@/hooks/useRecorder";
import { usePictureInPicture } from "@/hooks/usePictureInPicture";
import { FloatingToolbar } from "./FloatingToolbar";
import { CommentPanel } from "./CommentPanel";
import { ExportModal } from "./ExportModal";
import { PiPController } from "./PiPController";

// Demo image for mock capture
const MOCK_IMAGE = "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80";

export function EditorWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const {
    activeTool, setActiveTool, comments,
    loadImage, loadImageFromFile, exportPNG, exportPDF,
    deleteSelected, updateComment, hasImage,
  } = useCanvas(containerRef);

  const recorder = useRecorder();
  const { pipWindow, openPiP, closePiP } = usePictureInPicture();

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFromFile(file);
  }, [loadImageFromFile]);

  // When comment tool is selected, auto-open the comment panel
  const handleToolChange = useCallback((tool: typeof activeTool) => {
    setActiveTool(tool);
    if (tool === "comment") {
      setShowComments(true);
    }
  }, [setActiveTool]);

  // Handle recording stop — close PiP controller
  const handleRecordStop = useCallback(() => {
    recorder.stopRecording();
    closePiP();
  }, [recorder.stopRecording, closePiP]);

  // Open PiP when recording starts, close when it ends
  useEffect(() => {
    if (recorder.state === "recording" && !pipWindow) {
      openPiP(320, 56);
    } else if (recorder.state === "finished" || recorder.state === "idle") {
      closePiP();
    }
  }, [recorder.state, pipWindow, openPiP, closePiP]);

  // Auto-open Export Modal when recording finishes
  useEffect(() => {
    if (recorder.state === "finished" && recorder.videoUrl) {
      setShowExport(true);
    }
  }, [recorder.state, recorder.videoUrl]);

  const isRecording = recorder.state === "recording" || recorder.state === "paused";

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      {/* Floating Logo Badge (top-left) */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 glass-panel rounded-xl px-3 py-2 animate-fade-in">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Camera size={14} className="text-primary-foreground" />
        </div>
        <span className="text-sm font-semibold text-foreground tracking-tight">1ClickCapture</span>
        {isRecording && (
          <div className="flex items-center gap-1.5 ml-1 pl-2 border-l border-border/40">
            <span className="recording-dot" />
            <span className="text-xs font-mono text-muted-foreground">
              {recorder.formatTime(recorder.elapsed)}
            </span>
          </div>
        )}
      </div>

      {/* Comment Panel Toggle (top-right) */}
      <button
        onClick={() => setShowComments(prev => !prev)}
        className={`absolute top-4 right-4 z-30 flex items-center gap-1.5 glass-panel rounded-xl px-3 py-2 transition-all duration-200 hover:scale-[1.03] animate-fade-in ${showComments ? "border-primary/40 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
      >
        <MessageCircle size={16} />
        <span className="text-sm font-medium">
          {comments.length > 0 ? comments.length : ""}
        </span>
      </button>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col relative">
        <div ref={containerRef} className="flex-1 relative overflow-hidden pb-[72px]">
          <canvas id="editor-canvas" />

          {/* Empty State */}
          {!hasImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="flex flex-col items-center gap-5 text-muted-foreground animate-fade-in">
                <div className="w-20 h-20 rounded-2xl bg-secondary/30 flex items-center justify-center border border-border/30">
                  <Camera size={32} className="text-primary/40" />
                </div>
                <div className="text-center">
                  <p className="text-base font-medium text-foreground/50">No capture loaded</p>
                  <p className="text-sm text-muted-foreground/60 mt-1.5 max-w-xs leading-relaxed">
                    Upload an image, use Mock Capture, or start a screen recording to get started
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comment Side Panel (collapsible) */}
      <CommentPanel
        comments={comments}
        onUpdate={updateComment}
        isOpen={showComments}
        onClose={() => setShowComments(false)}
      />

      {/* Unified Bottom Toolbar */}
      <FloatingToolbar
        activeTool={activeTool}
        onToolChange={handleToolChange}
        onDelete={deleteSelected}
        recorderState={recorder.state}
        recorderElapsed={recorder.elapsed}
        recorderIsMuted={recorder.isMuted}
        onRecordStart={recorder.startRecording}
        onRecordStop={handleRecordStop}
        onRecordPause={recorder.pauseRecording}
        onRecordResume={recorder.resumeRecording}
        onRecordToggleMute={recorder.toggleMute}
        formatTime={recorder.formatTime}
        onUpload={() => fileInputRef.current?.click()}
        onMockCapture={() => loadImage(MOCK_IMAGE)}
        onExport={() => setShowExport(true)}
        hasPiP={!!pipWindow}
      />

      {/* PiP Controller (rendered in separate window) */}
      {pipWindow && (
        <PiPController
          pipWindow={pipWindow}
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onDelete={deleteSelected}
        />
      )}

      {/* Hidden File Input */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

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
