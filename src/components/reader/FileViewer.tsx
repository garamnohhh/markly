import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../store";
import { api } from "../../lib/invoke";
import { getHighlighter, normalizeLang } from "../../lib/shiki";
import { createFileEditor } from "../../lib/fileEditor";
import { getMermaid } from "../../lib/mermaid";
import { registerFindTarget } from "../../lib/find";
import { detectSlides, withAssetBase } from "../../lib/slides";
import type { SlideKind } from "../../lib/slides";
import { SlideshowOverlay } from "./SlideshowOverlay";
import { EditorView } from "@codemirror/view";

// svg moved out of IMAGE_EXTS so it becomes editable text
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);
// render visually in view mode, raw code in edit mode
const RENDER_EXTS = new Set(["html", "htm", "svg", "csv", "tsv", "mmd"]);
const TEXT_EXTS = new Set([
  "txt", "json", "yaml", "yml", "toml", "ini", "env",
  "js", "ts", "jsx", "tsx", "mjs", "cjs",
  "html", "css", "scss", "sass", "less",
  "py", "go", "rs", "java", "kt", "swift", "rb", "php",
  "sh", "bash", "zsh", "fish",
  "csv", "tsv", "xml", "sql",
  "c", "cpp", "h", "hpp",
  "dockerfile", "makefile", "gitignore", "gitattributes",
  "mdx", "graphql",
  "svg", "mmd",
]);

function getExt(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

function imageMime(e: string): string {
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  return `image/${e}`;
}

// base64 → UTF-8 string (handles multi-byte CJK, Korean, etc.)
function b64ToUtf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}

function RawShikiView({ code, lang }: { code: string; lang: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHighlighter().then((hl) => {
      if (cancelled) return;
      try {
        const result = hl.codeToHtml(code, {
          lang: normalizeLang(lang) ?? "text",
          themes: { light: "github-light", dark: "github-dark" },
        });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled) setHtml(null);
      }
    });
    return () => { cancelled = true; };
  }, [code, lang]);

  if (!html) {
    return (
      <pre style={{ fontFamily: "var(--font-mono)", fontSize: 14, lineHeight: 1.85, margin: 0, color: "var(--color-ink)", overflowX: "auto" }}>
        {code}
      </pre>
    );
  }
  return <div className="file-raw-shiki" dangerouslySetInnerHTML={{ __html: html }} />;
}

function FileEditorHost({
  filename, text, onChange,
}: { filename: string; text: string; onChange: (v: string) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const cb = useRef(onChange);
  cb.current = onChange;

  useEffect(() => {
    if (!host.current) return;
    const view = createFileEditor(host.current, filename, text, {
      onChange: (v) => cb.current(v),
    });
    const unregisterFind = registerFindTarget({
      getText: () => view.state.doc.toString(),
      reveal: ({ from, to }, scroll = true) => {
        if (!scroll) return [];
        view.dispatch({
          selection: { anchor: from, head: to },
          effects: EditorView.scrollIntoView(from, { y: "center" }),
        });
        return [];
      },
    });
    return () => { unregisterFind(); view.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} />;
}

// HTML preview — forwards keydown from iframe to outer window so useKeymap works.
//
// Served from a blob: URL rather than srcdoc. In a srcdoc frame the document is
// `about:srcdoc`, so relative URLs (incl. bare "#frag") resolve against the PARENT
// (tauri://localhost) and the frame cannot own a hash at all — history/hash writes
// throw SecurityError. That left hash-routed single-file docs (nav links driving
// `hashchange`) completely dead. A blob URL gives the frame a real origin, so
// in-page anchors and hashchange routing work natively, like in a browser.
//
// Tauri injects its IPC-init script into this same-origin iframe too; it fails there
// ("__TAURI_INTERNALS__.transformCallback undefined") and WKWebView surfaces the
// rejection on the top window. That's swallowed in main.tsx (see isTauriFrameNoise).
function HtmlPreview({ text, name }: { text: string; name: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/html" }));
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [text]);
  // `text` already carries a <base> pointing at the file's directory (see
  // FileViewer) — a blob: URL has no directory of its own, so without it the
  // document's relative stylesheets, scripts and images never load.

  function forwardKeys() {
    const cw = iframeRef.current?.contentWindow;
    if (!cw) return;
    if (!cw.document.querySelector("style[data-markly-find]")) {
      const style = cw.document.createElement("style");
      style.dataset.marklyFind = "";
      style.textContent = "::selection{background:rgba(255,210,74,.72);color:inherit}";
      cw.document.head.appendChild(style);
    }
    // Forward keyboard events to parent window
    cw.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") e.preventDefault();
      window.dispatchEvent(new KeyboardEvent("keydown", {
        key: e.key, code: e.code,
        metaKey: e.metaKey, ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey, altKey: e.altKey,
        bubbles: true, cancelable: true,
      }));
    }, true);
    // In-page anchors and hash routing are native here. Only block navigation
    // that would replace the preview (external/file links); those can't load in
    // the frame anyway.
    cw.document.addEventListener("click", (e) => {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (!href || href.startsWith("#")) return; // let the document handle it
      e.preventDefault();
    }, true);
  }

  if (!src) return <div style={{ flex: 1 }} />;

  return (
    <iframe
      ref={iframeRef}
      src={src}
      onLoad={forwardKeys}
      sandbox="allow-scripts allow-same-origin allow-forms"
      style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
      title={name}
    />
  );
}

// Entry point for the slideshow. Rendered only next to an HTML deck or a PDF —
// see `slideKind` in FileViewer.
function SlideButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="Slideshow"
      className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-control px-2.5 py-1 text-[12px] font-medium text-slate transition-colors hover:bg-tertiary hover:text-ink"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-line)" }}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <rect x="2" y="3" width="12" height="8" rx="1.5" />
        <path d="M6.6 5.8v3.4l3-1.7z" fill="currentColor" stroke="none" />
        <path d="M5.5 13.5h5" strokeLinecap="round" />
      </svg>
      Slides
    </button>
  );
}

function SvgPreview({ text, name }: { text: string; name: string }) {
  return (
    <div className="flex flex-1 items-center justify-center overflow-auto p-8">
      <img
        src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`}
        alt={name}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

function parseDelimited(text: string, sep: string): string[][] {
  return text.trim().split("\n").map((line) => {
    const cells: string[] = [];
    let inQ = false, cell = "";
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (!inQ && ch === sep) { cells.push(cell); cell = ""; continue; }
      cell += ch;
    }
    cells.push(cell);
    return cells;
  });
}

function CsvPreview({ text, fileExt }: { text: string; fileExt: string }) {
  const rows = parseDelimited(text, fileExt === "tsv" ? "\t" : ",");
  if (!rows.length) return null;
  const [header, ...body] = rows;
  return (
    <div className="flex-1 overflow-auto" style={{ padding: "32px 56px" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 13, fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>
        <thead>
          <tr>
            {header.map((h, i) => (
              <th key={i} style={{ padding: "6px 24px 6px 0", borderBottom: "1.5px solid var(--color-line)", textAlign: "left", color: "var(--color-ink)", fontWeight: 600 }}>
                {h.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "5px 24px 5px 0", borderBottom: "1px solid var(--color-line)", color: "var(--color-slate)" }}>
                  {cell.trim()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MmdPreview({ text }: { text: string }) {
  const dark = useStore((s) => s.theme === "dark");
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!text.trim()) return;
    let alive = true;
    getMermaid(dark)
      .then((m) => m.render(`mmd-fv-${Math.random().toString(36).slice(2)}`, text.trim()))
      .then(({ svg }) => { if (alive) { setSvg(svg); setFailed(false); } })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [text, dark]);

  if (failed || !svg) {
    return (
      <div className="doc-scroll flex-1 overflow-y-auto">
        <div style={{ padding: "40px 56px" }}>
          <RawShikiView code={text} lang="mermaid" />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-1 items-center justify-center overflow-auto p-8">
      <div dangerouslySetInnerHTML={{ __html: svg }} style={{ maxWidth: "100%" }} />
    </div>
  );
}

function RenderView({ text, fileExt, name }: { text: string; fileExt: string; name: string }) {
  if (fileExt === "html" || fileExt === "htm") return <HtmlPreview text={text} name={name} />;
  if (fileExt === "svg") return <SvgPreview text={text} name={name} />;
  if (fileExt === "csv" || fileExt === "tsv") return <CsvPreview text={text} fileExt={fileExt} />;
  if (fileExt === "mmd") return <MmdPreview text={text} />;
  return null;
}

const SAVE_DELAY = 1200;

export function FileViewer() {
  const relPath = useStore((s) => s.openFilePath)!;
  const fileEditMode = useStore((s) => s.fileEditMode);
  const editorWidth = useStore((s) => s.editorWidth);
  const vaultRoot = useStore((s) => s.vaultRoot);
  const [showSlides, setShowSlides] = useState(false);

  const [b64, setB64] = useState<string | null>(null);
  const [text, setText] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const draft = useRef<string>("");
  const prevEditMode = useRef(fileEditMode);

  // Sync draft → text when exiting edit mode so read view stays up to date
  useEffect(() => {
    if (prevEditMode.current && !fileEditMode) {
      setText(draft.current);
    }
    prevEditMode.current = fileEditMode;
  }, [fileEditMode]);

  const name = relPath.split("/").pop() ?? relPath;
  const fileExt = getExt(name);
  const isText = TEXT_EXTS.has(fileExt) || fileExt === "";
  const isImage = IMAGE_EXTS.has(fileExt);
  const isPdf = fileExt === "pdf";
  const isHtml = fileExt === "html" || fileExt === "htm";

  // Absolute directory of this file, used as the <base> for its sibling assets.
  const assetDir = vaultRoot
    ? [vaultRoot.replace(/\/$/, ""), ...relPath.split("/").slice(0, -1)].join("/")
    : null;
  const htmlText = useMemo(
    () => (isHtml && assetDir ? withAssetBase(text, assetDir) : text),
    [isHtml, assetDir, text],
  );

  // Slideshow is offered only for HTML that actually looks like slides, and for
  // PDFs (already paginated). Prose HTML gets no button — we don't guess breaks.
  const slideKind: SlideKind = useMemo(() => {
    if (isPdf) return { kind: "pdf" };
    if (!isHtml || !text) return null;
    return detectSlides(text);
  }, [isPdf, isHtml, text]);

  const maxW = editorWidth === "wide" ? "var(--spacing-reading-wide)" : "var(--spacing-reading)";

  useEffect(() => {
    setB64(null); setText(""); setError(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);

    api.readRawFile(relPath).then((data) => {
      setB64(data);
      if (isText) {
        const decoded = b64ToUtf8(data);
        setText(decoded);
        draft.current = decoded;
      }
    }).catch((e) => setError(String(e)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relPath]);

  function handleEdit(value: string) {
    draft.current = value;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try { await api.writeRawFile(relPath, draft.current); } catch { /* silent */ }
    }, SAVE_DELAY);
  }

  if (error) return (
    <div className="flex flex-1 items-center justify-center text-muted text-sm">{error}</div>
  );

  if (!b64) return (
    <div className="flex flex-1 items-center justify-center text-muted text-sm">Loading…</div>
  );

  if (isImage) return (
    <div className="flex flex-1 items-center justify-center overflow-auto p-8">
      <img
        src={`data:${imageMime(fileExt)};base64,${b64}`}
        alt={name}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8 }}
      />
    </div>
  );

  const pdfSrc = isPdf ? `data:application/pdf;base64,${b64}` : undefined;

  const slideshow = slideKind && (
    <>
      <SlideButton onClick={() => setShowSlides(true)} />
      {showSlides && (
        <SlideshowOverlay
          kind={slideKind}
          html={isHtml ? htmlText : undefined}
          pdfSrc={pdfSrc}
          name={name}
          onClose={() => setShowSlides(false)}
        />
      )}
    </>
  );

  if (isPdf) return (
    <div className="relative min-w-0 flex-1">
      <iframe
        src={pdfSrc}
        style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
        title={name}
      />
      {slideshow}
    </div>
  );

  if (isText) {
    // Render mode: view = visual render, edit = raw code
    if (RENDER_EXTS.has(fileExt) && !fileEditMode) {
      return (
        <div className="relative flex min-w-0 flex-1">
          <RenderView text={isHtml ? htmlText : text} fileExt={fileExt} name={name} />
          {slideshow}
        </div>
      );
    }

    return (
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="doc-scroll h-full overflow-y-auto">
          <div style={{ maxWidth: maxW, margin: "0 auto", padding: "40px 56px" }}>
            {fileEditMode ? (
              <FileEditorHost
                key={relPath}
                filename={name}
                text={text}
                onChange={handleEdit}
              />
            ) : (
              <RawShikiView code={text} lang={fileExt} />
            )}
          </div>
        </div>
        {fileEditMode && (
          <div
            className="pointer-events-none absolute inset-[10px] rounded-[13px]"
            style={{
              border: "1.5px solid #cfcbc1",
              boxShadow: "inset 0 0 0 3px rgba(44,42,39,0.025)",
            }}
          />
        )}
        {fileEditMode && (
          <div className="pointer-events-none fixed inset-x-0 bottom-5 flex justify-center">
            <div
              className="flex items-center gap-2 rounded-full px-[15px] text-[11.5px] font-medium"
              style={{
                height: "30px",
                background: "var(--color-ink)",
                color: "var(--color-paper)",
                boxShadow: "0 8px 20px -6px rgba(44,42,39,0.45)",
              }}
            >
              <span className="inline-block size-[6px] shrink-0 rounded-full bg-[#9cc59c]" />
              <span>
                Editing ·{" "}
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-mid)" }}>⌘E</span>
                {" "}to finish
              </span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3" style={{ color: "var(--color-muted)" }}>
      <svg width="36" height="36" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 2h5l3 3v9H4z" /><path d="M9 2v3h3" />
      </svg>
      <span style={{ fontSize: 13 }}>Binary file — no preview</span>
      <span style={{ fontSize: 12, color: "var(--color-mid)" }}>{name}</span>
    </div>
  );
}
