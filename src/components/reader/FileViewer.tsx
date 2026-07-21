import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { api } from "../../lib/invoke";
import { getHighlighter, normalizeLang } from "../../lib/shiki";
import { createFileEditor } from "../../lib/fileEditor";
import { getMermaid } from "../../lib/mermaid";

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
    return () => view.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} />;
}

// HTML preview — forwards keydown from iframe to outer window so useKeymap works.
//
// Tauri injects its IPC-init script into this same-origin iframe too; it fails there
// ("__TAURI_INTERNALS__.transformCallback undefined") and WKWebView surfaces the
// rejection on the top window. That's swallowed in main.tsx (see isTauriFrameNoise) —
// no per-iframe guard needed, and none can run before Tauri's document_start script
// anyway. allow-same-origin stays: dropping it blanks the frame on #anchor clicks.
function HtmlPreview({ text, name }: { text: string; name: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  function forwardKeys() {
    const cw = iframeRef.current?.contentWindow;
    if (!cw) return;
    // Forward keyboard events to parent window
    cw.addEventListener("keydown", (e) => {
      window.dispatchEvent(new KeyboardEvent("keydown", {
        key: e.key, code: e.code,
        metaKey: e.metaKey, ctrlKey: e.ctrlKey,
        shiftKey: e.shiftKey, altKey: e.altKey,
        bubbles: true, cancelable: true,
      }));
    }, true);
    // Block link navigation (file:// paths fail in Tauri); allow #anchor-only links
    cw.document.addEventListener("click", (e) => {
      const a = (e.target as Element).closest("a");
      if (!a) return;
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("#")) return; // in-page anchor: fine
      e.preventDefault();
    }, true);
  }

  return (
    <iframe
      ref={iframeRef}
      srcDoc={text}
      onLoad={forwardKeys}
      sandbox="allow-scripts allow-same-origin allow-forms"
      style={{ flex: 1, border: "none", width: "100%", height: "100%" }}
      title={name}
    />
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

  if (isPdf) return (
    <iframe
      src={`data:application/pdf;base64,${b64}`}
      style={{ flex: 1, border: "none", width: "100%" }}
      title={name}
    />
  );

  if (isText) {
    // Render mode: view = visual render, edit = raw code
    if (RENDER_EXTS.has(fileExt) && !fileEditMode) {
      return <RenderView text={text} fileExt={fileExt} name={name} />;
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
