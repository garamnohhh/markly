import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { modalStack } from "../../lib/modalStack";
import type { SlideKind } from "../../lib/slides";

// Full-window slideshow for HTML decks and PDFs. Everything else in the app is
// untouched: this mounts only from FileViewer, only for html/htm/pdf, and only
// when the document actually looks like slides.
//
// Paging is delegated wherever the content already knows how to page itself —
// a deck-stage document has its own arrow-key handling, and the embedded PDF
// viewer has its own. We only page for plain slide-shaped markup.
export function SlideshowOverlay({
  kind,
  html,
  pdfSrc,
  name,
  onClose,
}: {
  kind: SlideKind;
  html?: string;
  pdfSrc?: string;
  name: string;
  onClose: () => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(kind?.kind === "elements" ? kind.count : 0);
  // Bumped on frame load: the hide-all-but-one effect needs a trigger once the
  // document exists, and setCount alone often lands on the same value.
  const [ready, setReady] = useState(0);

  const paging = kind?.kind === "elements";

  useEffect(() => {
    if (html === undefined) return;
    const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [html]);

  useEffect(() => {
    modalStack.push();
    return () => modalStack.pop();
  }, []);

  // Take the whole screen, not just the window: this overlay already covers the
  // app's own title bar, but not the macOS menu bar — and that's the strip still
  // showing during a presentation.
  //
  // Deliberately unconditional in both directions. Reading isFullscreen() first
  // and skipping when already fullscreen looked tidier, but the value goes stale
  // across a cycle: after one enter/exit, the second slideshow opened windowed.
  // Set it, then clear it. The cleanup runs however this component goes away
  // (Escape, the close button, navigation, an error boundary), so no path can
  // strand the window fullscreen.
  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;
    const win = getCurrentWindow();
    void win.setFullscreen(true).catch(() => {});
    return () => { void win.setFullscreen(false).catch(() => {}); };
  }, []);

  // Escape closes. Arrows page only when we own paging — a deck handles its own,
  // and forwarding would double-advance it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (!paging) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, count - 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, paging, count]);

  // Keys land on whichever window has focus, so mirror the handler into the
  // frame. Same-origin only — a data: PDF frame is opaque, which is why the
  // close button below is not optional.
  function onLoad() {
    const cw = frameRef.current?.contentWindow;
    if (!cw) return;
    try {
      cw.focus();
      cw.addEventListener("keydown", (e) => {
        window.dispatchEvent(new KeyboardEvent("keydown", {
          key: e.key, code: e.code, bubbles: true, cancelable: true,
        }));
      }, true);
      if (paging) {
        const found = cw.document.querySelectorAll<HTMLElement>((kind as { selector: string }).selector);
        setCount(found.length);
        setReady((n) => n + 1);
        cw.document.addEventListener("click", () => {
          setIndex((i) => Math.min(i + 1, found.length - 1));
        });
      }
    } catch { /* opaque frame (pdf) — close button and outside clicks still work */ }
  }

  // Show one slide at a time by hiding the rest. Cheaper and more predictable
  // than cloning a slide into a new document, and it survives author CSS.
  useEffect(() => {
    if (!paging) return;
    const cw = frameRef.current?.contentWindow;
    if (!cw) return;
    try {
      const found = cw.document.querySelectorAll<HTMLElement>((kind as { selector: string }).selector);
      found.forEach((el, i) => { el.style.display = i === index ? "" : "none"; });
    } catch { /* not ready yet — onLoad re-runs this via setCount */ }
  }, [index, paging, kind, ready]);

  const frameSrc = pdfSrc ?? src;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "#111" }}
      role="dialog"
      aria-label={`${name} slideshow`}
    >
      {frameSrc && (
        <iframe
          ref={frameRef}
          src={frameSrc}
          onLoad={onLoad}
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{ flex: 1, border: "none", width: "100%", height: "100%", background: "#111" }}
          title={name}
        />
      )}

      <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2">
        {paging && count > 0 && (
          <span
            className="rounded-control px-2 py-1 text-[11px] tabular-nums"
            style={{ background: "rgba(0,0,0,0.55)", color: "#e8e6e1", fontFamily: "var(--font-mono)" }}
          >
            {index + 1} / {count}
          </span>
        )}
        <button
          onClick={onClose}
          className="pointer-events-auto rounded-control px-2 py-1 text-[11px] font-medium"
          style={{ background: "rgba(0,0,0,0.55)", color: "#e8e6e1", fontFamily: "var(--font-mono)" }}
          title="Exit slideshow (Esc)"
        >
          esc
        </button>
      </div>
    </div>
  );
}
