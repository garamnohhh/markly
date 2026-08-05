import { useEffect, useMemo, useRef } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
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

  // Wrap tables in a scroll box + toolbar (expand/copy). Imperative because
  // tables live inside dangerouslySetInnerHTML; React re-sets innerHTML on
  // source change, discarding these wraps, so we re-run on `segments`.
  useEffect(() => {
    const root = bodyRef.current;
    if (!root) return;
    let expandedWrap: HTMLElement | null = null;
    root.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
      if (table.parentElement?.classList.contains("md-table-wrap")) return;
      const wrap = document.createElement("div");
      wrap.className = "md-table-wrap";
      const bar = document.createElement("div");
      bar.className = "md-table-bar";

      const expand = document.createElement("button");
      expand.type = "button";
      expand.className = "md-table-btn";
      expand.title = "펼치기 / 접기";
      expand.textContent = "⤢";
      expand.addEventListener("click", () => {
        const on = wrap.classList.toggle("expanded");
        document.body.style.overflow = on ? "hidden" : "";
        expandedWrap = on ? wrap : null;
      });

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "md-table-btn";
      copy.title = "Markdown 표로 복사";
      copy.textContent = "⧉";
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(tableToMarkdown(table));
          copy.textContent = "✓";
          setTimeout(() => (copy.textContent = "⧉"), 1200);
        } catch {
          /* clipboard blocked — no-op */
        }
      });

      bar.append(expand, copy);
      table.parentNode!.insertBefore(wrap, table);
      wrap.append(bar, table);
    });
    return () => {
      if (expandedWrap) document.body.style.overflow = "";
    };
  }, [segments]);

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
        ) : (
          <div key={i} dangerouslySetInnerHTML={{ __html: seg.html }} />
        ),
      )}
    </div>
  );
}
