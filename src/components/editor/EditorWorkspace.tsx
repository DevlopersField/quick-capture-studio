import { useRef, useCallback, useState, useEffect } from "react";
import { Camera, MessageCircle, Sun, Moon, Monitor } from "lucide-react";
import { useCanvas } from "@/hooks/useCanvas";
import { useRecorder } from "@/hooks/useRecorder";
import { usePictureInPicture } from "@/hooks/usePictureInPicture";
import { useTheme } from "@/hooks/useTheme";
import { useSearchParams } from "react-router-dom";
import { FloatingToolbar } from "./FloatingToolbar";
import { CommentPanel } from "./CommentPanel";
import { ExportModal } from "./ExportModal";
import { PiPController } from "./PiPController";


export function EditorWorkspace() {
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showExport, setShowExport] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [searchParams] = useSearchParams();

  const {
    activeTool, setActiveTool, comments,
    loadImage, loadImageFromFile, exportPNG, exportPDF, copyToClipboard,
    undo, redo,
    deleteSelected, updateComment, hasImage, hasSelection,
    strokeColor, setStrokeColor, setCanvasBackground,
  } = useCanvas(containerRef);

  const recorder = useRecorder();
  const { pipWindow, openPiP, closePiP } = usePictureInPicture();
  const { theme, setTheme } = useTheme();

  // Handle query parameters from extension popup
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (!mode) return;

    // Small delay to ensure everything is ready
    const timer = setTimeout(async () => {
      if (mode === "record") {
        recorder.startRecording();
      } else if (mode === "upload") {
        fileInputRef.current?.click();
      } else if (mode === "capture") {
        try {
          const result = await chrome.storage.local.get(["capturedImage", "capturedVideo"]);
          if (result.capturedImage) {
            loadImage(result.capturedImage as string);
            await chrome.storage.local.remove("capturedImage");
          } else if (result.capturedVideo) {
            recorder.setVideoUrl(result.capturedVideo as string);
            recorder.setState("finished");
            await chrome.storage.local.remove("capturedVideo");
          }
        } catch (err) {
          console.error("Failed to load captured media:", err);
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchParams, recorder.startRecording, loadImage]);

  // Sync canvas background with theme
  useEffect(() => {
    // Resolve "system" to actual light/dark
    let effective = theme;
    if (theme === "system") {
      effective = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    const bgColor = effective === "dark" ? "#0d0f14" : "#f9fafb";
    setCanvasBackground(bgColor);
  }, [theme, setCanvasBackground]);

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

  // Handle recording stop — PiP remains open (sticky)
  const handleRecordStop = useCallback(() => {
    recorder.stopRecording();
    // closePiP(); // Removed to keep tools sticky
  }, [recorder.stopRecording]);

  // Open PiP when recording starts, close when it ends
  useEffect(() => {
    if (recorder.state === "recording" && !pipWindow) {
      openPiP(320, 56);
    } else if (recorder.state === "idle") {
      closePiP();
    }
  }, [recorder.state, pipWindow, openPiP, closePiP]);

  // Auto-open Export Modal when recording finishes
  useEffect(() => {
    if (recorder.state === "finished") {
      setShowExport(true);
    }
  }, [recorder.state]);

  const isRecording = recorder.state === "recording" || recorder.state === "paused";
  const hasContent = hasImage || !!recorder.videoUrl || isRecording;

  const nextTheme = () => {
    if (theme === "system") setTheme("dark");
    else if (theme === "dark") setTheme("light");
    else setTheme("system");
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative transition-colors duration-300">
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

      {/* Top Right Actions (Theme Toggle & Comments) */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2 animate-fade-in">
        <button
          onClick={nextTheme}
          title={`Active Theme: ${theme}`}
          className="flex items-center justify-center w-10 h-10 glass-panel rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200"
        >
          {theme === "system" && <Monitor size={18} />}
          {theme === "dark" && <Moon size={18} />}
          {theme === "light" && <Sun size={18} />}
        </button>

        <button
          onClick={() => setShowComments(prev => !prev)}
          className={`flex items-center gap-1.5 glass-panel rounded-xl px-3 h-10 transition-all duration-200 hover:scale-[1.03] ${showComments ? "border-primary/40 text-primary shadow-lg shadow-primary/10" : "text-muted-foreground hover:text-foreground"
            }`}
        >
          <MessageCircle size={18} />
          <span className="text-sm font-medium">
            {comments.length > 0 ? comments.length : ""}
          </span>
        </button>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex flex-col relative">
        <div ref={containerRef} className="flex-1 relative overflow-hidden pb-[72px]">
          <canvas id="editor-canvas" />

          {/* Empty State */}
          {!hasImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="flex flex-col items-center gap-5 text-muted-foreground animate-fade-in text-center px-6">
                <div className="w-20 h-20 rounded-2xl bg-secondary/30 flex items-center justify-center border border-border/30 shadow-inner">
                  <Camera size={32} className="text-primary/40" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">No capture loaded</p>
                  <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed font-medium">
                    Upload an image or start a screen recording to begin annotating
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
        onUndo={undo}
        onRedo={redo}
        hasContent={hasContent}
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
        onExport={() => setShowExport(true)}
        hasPiP={!!pipWindow}
        strokeColor={strokeColor}
        onColorChange={setStrokeColor}
        hasSelection={hasSelection}
      />

      {/* PiP Controller (rendered in separate window) */}
      {pipWindow && (
        <PiPController
          pipWindow={pipWindow}
          activeTool={activeTool}
          onToolChange={handleToolChange}
          onDelete={deleteSelected}
          strokeColor={strokeColor}
          onColorChange={setStrokeColor}
          hasSelection={hasSelection}
          theme={theme}
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
        onCopyImage={copyToClipboard}
        videoUrl={recorder.videoUrl}
        onDownloadVideo={recorder.downloadVideo}
      />
    </div>
  );
}
