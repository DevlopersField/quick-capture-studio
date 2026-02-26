import { useState, useRef, useCallback, useEffect } from "react";

/**
 * Hook to manage a Document Picture-in-Picture window.
 * The PiP window floats above all other windows and is NOT captured
 * by screen recording (when sharing a specific tab/window).
 */
export function usePictureInPicture() {
    const [pipWindow, setPipWindow] = useState<Window | null>(null);
    const pipWindowRef = useRef<Window | null>(null);

    const openPiP = useCallback(async (width = 400, height = 120) => {
        try {
            // Check for Document PiP API support (Chrome 116+)
            // @ts-ignore — Document PiP API types not in lib.dom yet
            if (!("documentPictureInPicture" in window)) {
                console.warn("Document Picture-in-Picture API not supported");
                return null;
            }

            // @ts-ignore
            const pipHost = window.documentPictureInPicture;
            const pip: Window = await pipHost.requestWindow({
                width,
                height,
            });

            // Copy stylesheets from the main document into the PiP window
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    const cssRules = [...styleSheet.cssRules]
                        .map((rule) => rule.cssText)
                        .join("");
                    const style = pip.document.createElement("style");
                    style.textContent = cssRules;
                    pip.document.head.appendChild(style);
                } catch {
                    // External stylesheets may throw SecurityError — copy via link
                    if (styleSheet.href) {
                        const link = pip.document.createElement("link");
                        link.rel = "stylesheet";
                        link.href = styleSheet.href;
                        pip.document.head.appendChild(link);
                    }
                }
            });

            // Set PiP document background and styles
            pip.document.body.style.margin = "0";
            pip.document.body.style.padding = "0";
            pip.document.body.style.overflow = "hidden";
            pip.document.body.style.background = "hsl(228 14% 7%)";
            pip.document.title = "1ClickCapture Controls";

            pipWindowRef.current = pip;
            setPipWindow(pip);

            // Handle PiP window being closed by the user
            pip.addEventListener("pagehide", () => {
                pipWindowRef.current = null;
                setPipWindow(null);
            });

            return pip;
        } catch (e) {
            console.error("Failed to open PiP window", e);
            return null;
        }
    }, []);

    const closePiP = useCallback(() => {
        if (pipWindowRef.current) {
            pipWindowRef.current.close();
            pipWindowRef.current = null;
            setPipWindow(null);
        }
    }, []);

    useEffect(() => {
        return () => {
            if (pipWindowRef.current) {
                pipWindowRef.current.close();
            }
        };
    }, []);

    return { pipWindow, openPiP, closePiP };
}
