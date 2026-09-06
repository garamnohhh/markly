import { useEffect, useMemo, useRef, useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { writeImage } from "@tauri-apps/plugin-clipboard-manager";
import { toBlob } from "html-to-image";
import { parseDoc } from "../../lib/markdown";
import type { Heading } from "../../lib/markdown";
import { MermaidDiagram } from "./MermaidDiagram";
import { ShikiCodeBlock } from "./ShikiCodeBlock";
import { useStore } from "../../store";
import { resolveWiki } from "../../lib/wiki";
import type { Db } from "../../lib/types";

const WIKI_PREFIX = "markly-wiki://";

// Rebuild GitHub-flavored Markdown from a rendered table — most portable copy
// form (pastes clean into any editor). Alignment metadata is lost (not in DOM).
function tableToMarkdown(table: HTMLTableElement): string {
  const cell = (el: Element) =>
    (el.textContent ?? "").trim().replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ");
  const rows = Array.from(table.querySelectorAll("tr"));
  if (!rows.length) return "";
  const lines = rows.map((r) => `| ${Array.from(r.children).map(cell).join(" | ")} |`);
  const cols = rows[0].children.length;
  lines.splice(1, 0, `| ${Array(cols).fill("---").join(" | ")} |`);
  return lines.join("\n");
}

// React-owned table wrapper: the toolbar (expand/copy) is JSX so it can't be
// wiped by a re-render, and the table HTML lives in its own inner div. Expand
// toggles a fullscreen overlay; copy emits GFM markdown.
// Render the table at full (expanded) width off-screen and return a PNG blob,
// so the copied image is never cropped regardless of the collapsed UI state.
async function tableToPng(table: HTMLTableElement): Promise<Blob | null> {
  const stage = document.createElement("div");
  stage.className = "md-table-capture";
  stage.appendChild(table.cloneNode(true));
  document.body.appendChild(stage);
  try {
    const bg = getComputedStyle(document.body).backgroundColor || "var(--color-surface)";
    return await toBlob(stage, { pixelRatio: 2, backgroundColor: bg });
  } finally {
    stage.remove();
  }
}

function TableBlock({ html }: { html: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState<false | "img" | "md">(false);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const flash = (kind: "img" | "md") => {
    setCopied(kind);
    setTimeout(() => setCopied(false), 1400);
  };

  // Copy the full-width rendered table as a PNG image. Tauri gives the most
  // reliable image clipboard (writeImage); web falls back to ClipboardItem;
  // if images can't be written at all, fall back to GFM markdown text.
  const copy = async () => {
    const table = innerRef.current?.querySelector("table") as HTMLTableElement | null;
    if (!table) return;
    try {
      const blob = await tableToPng(table);
      if (!blob) throw new Error("render failed");
      if ("__TAURI_INTERNALS__" in window) {
        await writeImage(new Uint8Array(await blob.arrayBuffer()));
      } else {
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      }
      flash("img");
    } catch {
      try {
        await navigator.clipboard.writeText(tableToMarkdown(table));
        flash("md");
      } catch {
        /* clipboard blocked — no-op */
      }
    }
  };

  const copiedMsg = copied === "img" ? "이미지 복사됨" : copied === "md" ? "표 복사됨" : "";

  return (
    <div className={expanded ? "md-table-wrap expanded" : "md-table-wrap"}>
      <div className="md-table-bar">
        <button type="button" className="md-table-btn" title="펼치기 / 접기" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "✕" : "⤢"}
        </button>
        <button type="button" className="md-table-btn" title="펼친 표를 이미지로 복사" onClick={copy}>
          ⧉
        </button>
        {copiedMsg && <span className="md-table-toast">{copiedMsg}</span>}
      </div>
      <div className="md-table-inner" ref={innerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

// Open a vault-relative path inside Markly: markdown docs in the reader, any
// other file in the file viewer.
function openInVault(
  rel: string,
  db: Db,
  openDoc: (id: string) => void,
  openFile: (rel: string) => void,
  fromDocId?: string,
) {
  if (/\.md$/i.test(rel)) {
    const docId = rel.toLowerCase();
    const hit = db.docs[docId] ? docId : resolveWiki(db, rel, fromDocId);
    if (hit) { openDoc(hit); return; }
  }
  openFile(rel); // non-md, or an .md not in the index → file viewer
}

interface Props {
  source: string;
  onHeadings?: (h: Heading[]) => void;
  onSourceChange?: (newSource: string) => void;
}

export function MarkdownRenderer({ source, onHeadings, onSourceChange }: Props) {
  const { segments, headings } = useMemo(() => parseDoc(source), [source]);
  const db = useStore((s) => s.db);
  const openDocId = useStore((s) => s.openDocId);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onHeadings?.(headings);
  }, [headings, onHeadings]);

  // Tag wiki links resolved/unresolved for styling (kept out of parse so it
  // reacts to db changes without re-parsing the whole doc).
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLAnchorElement>(`a[href^="${WIKI_PREFIX}"]`).forEach((a) => {
      a.classList.add("wikilink");
      const raw = decodeURIComponent(a.getAttribute("href")!.slice(WIKI_PREFIX.length));
      const target = raw.split("#")[0];
      const ok = db ? resolveWiki(db, target, openDocId ?? undefined) : null;
      a.classList.toggle("wikilink-unresolved", !ok);
    });
  }, [segments, db, openDocId]);

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;

    // checkbox toggle in task list items
    const li = target.closest("li.task-list-item");
    if (li && onSourceChange && !target.closest("a")) {
      const allItems = (e.currentTarget as HTMLElement).querySelectorAll("li.task-list-item");
      const idx = Array.from(allItems).indexOf(li as HTMLLIElement);
      if (idx >= 0) {
        let count = 0;
        const newSource = source.replace(/- \[[ x]\]/gi, (match) => {
          if (count++ === idx) return match.toLowerCase().includes("x") ? "- [ ]" : "- [x]";
          return match;
        });
        onSourceChange(newSource);
      }
      return;
    }

    const anchor = target.closest("a");
    if (!anchor) return;
    const href = anchor.getAttribute("href") ?? "";

    if (href.startsWith(WIKI_PREFIX)) {
      e.preventDefault();
      const raw = decodeURIComponent(href.slice(WIKI_PREFIX.length));
      void useStore.getState().followWikiLink(raw);
      return;
    }

    const { db, openDoc, openFile, vaultRoot } = useStore.getState();
    if (!db) return;

    if (href.startsWith("http://") || href.startsWith("https://")) {
      e.preventDefault();
      openUrl(href);
      return;
    }

    // Absolute file:// link. Open it inside Markly when it lives in the current
    // vault (never surprise-open the browser); otherwise hand off to the OS.
    if (href.startsWith("file://")) {
      e.preventDefault();
      const abs = decodeURIComponent(href.replace(/^file:\/\//, ""));
      const root = vaultRoot?.replace(/\/+$/, "");
      if (root && (abs === root || abs.startsWith(root + "/"))) {
        openInVault(abs.slice(root.length).replace(/^\/+/, ""), db, openDoc, openFile, openDocId ?? undefined);
      } else {
        openUrl(href); // outside the vault → deliberate OS open
      }
      return;
    }

    // Relative internal link, e.g. [x](../foo/note.md) or (note.md).
    const decoded = decodeURIComponent(href);
    if (/\.md$/i.test(decoded) && !decoded.includes("://")) {
      e.preventDefault();
      const hit = resolveWiki(db, decoded, openDocId ?? undefined);
      if (hit) openDoc(hit);
    }
  }

  return (
    <div ref={bodyRef} className="md-body" onClick={handleClick}>
      {segments.map((seg, i) =>
        seg.kind === "mermaid" ? (
          <MermaidDiagram key={i} code={seg.code} />
        ) : seg.kind === "code" ? (
          <ShikiCodeBlock key={i} code={seg.code} lang={seg.lang} />
        ) : seg.kind === "table" ? (
          <TableBlock key={i} html={seg.html} />
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
        ),
      )}
    </div>
  );
}
