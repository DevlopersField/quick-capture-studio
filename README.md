# 1ClickCapture - Quick Capture Studio 🚀

**1ClickCapture** is a professional-grade browser extension and studio designed for high-performance screen capturing, live recording, and real-time annotation. Built for developers, designers, and educators who need a seamless way to communicate visual ideas.

---

## 💎 Premium Features

### 🎥 Advanced Screen Recording
- **Draggable Universal Toolbar**: A sleek, glassmorphic toolbar that you can drag to any position. It follows you across every tab during recording.
- **Cross-Window Sync**: Annotation tools (Pencil, Arrow, Text, Rect) and colors stay synced instantly across all open browser windows in real-time.
- **Dual Stop Functionality**: Effortlessly stop recordings via our custom toolbar or the browser's native "Stop sharing" button.
- **Export Priority**: Video recordings are prioritized in the export menu, allowing for one-click "Save Video" flows.
- **Loom-Style Workflow**: On stop, you are instantly redirected to the Studio with an auto-popup ready for preview, download, or sharing.

### 📸 Pro Full-Page Capture
- **Pixel-Perfect Stitching**: Advanced engine that handles sticky headers, deep footers, and dynamic layouts without "seams" or gaps.
- **Self-Healing Layouts**: Automatically handles scroll buffers to ensure every pixel of deep, dynamic content is captured.
- **High-Resolution Output**: Export as high-quality PNG or multi-page PDF documents.

### 🎨 Precision Studio Editor
- **Figma-Style Navigation**: 
  - **Zoom**: Pinch-to-zoom or wheel zoom centered at your cursor.
  - **Pan**: Hold `Space + Drag` or use `Middle-Click Drag`.
  - **Grid**: Professional design grid with major/minor lines.
- **Smart Text Tool**: Auto-selects placeholders for instant typing, just like professional design suites.
- **Multi-Image Support**: Upload and append multiple captures or external assets to a single canvas.
- **Theme Engine**: Support for Light, Dark, and System themes with a single toggle.

---

## ⌨️ Pro Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space + Drag` | Pan Workspace |
| `V` | Select / Pointer |
| `R` / `A` / `P` | Rect / Arrow / Pencil |
| `T` / `C` | Text / Comment Pin |
| `Ctrl + Z / Y` | Undo / Redo |
| `Del` | Delete Selection |
| `Shift + Scroll` | Horizontal Pan |

---

## 🛠️ Technical Architecture

- **Engine**: React 18 + TypeScript + Fabric.js for high-performance canvas ops.
- **UI System**: Tailwind CSS with Glassmorphism and Framer Motion animations.
- **Infrastructure**: Chrome Extension Manifest v3, Storage API for global state persistence.
- **Capture**: MediaRecorder API for video, specialized Canvas stitching for full-page images.

---

## 🚀 Getting Started

1. **Build the extension**: `npm run build`
2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` folder.
3. **Start Creating**: Click the extension icon to start a capture or recording!
