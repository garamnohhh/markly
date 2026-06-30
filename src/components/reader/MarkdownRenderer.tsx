import { useEffect, useMemo } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { parseDoc } from "../../lib/markdown";
import type { Heading } from "../../lib/markdown";
import { MermaidDiagram } from "./MermaidDiagram";
import { ShikiCodeBlock } from "./ShikiCodeBlock";
import { useStore } from "../../store";

interface Props {
  source: string;
  onHeadings?: (h: Heading[]) => void;
  onSourceChange?: (newSource: string) => void;
}

export function MarkdownRenderer({ source, onHeadings, onSourceChange }: Props) {
  const { segments, headings } = useMemo(() => parseDoc(source), [source]);

  useEffect(() => {
    onHeadings?.(headings);
  }, [headings, onHeadings]);

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
    const { db, openDoc } = useStore.getState();
    if (!db) return;
    const docs = Object.values(db.docs);
    const byId = new Map(docs.map((d) => [d.docId, d]));
    const byFilename = new Map(docs.map((d) => [d.docId.split("/").pop()!, d]));

    if (href.startsWith("markly-wiki://")) {
      e.preventDefault();
      const slug = href.slice("markly-wiki://".length);
      const doc = byFilename.get(slug + ".md") ?? byFilename.get(slug) ?? byId.get(slug);
      if (doc) openDoc(doc.docId);
      return;
    }
    if (href.startsWith("http://") || href.startsWith("https://")) {
      e.preventDefault();
      openUrl(href);
      return;
    }
    if (href.endsWith(".md") && !href.startsWith("http")) {
      e.preventDefault();
      const filename = href.split("/").pop() ?? href;
      const doc = byId.get(href) ?? byFilename.get(filename);
      if (doc) openDoc(doc.docId);
    }
  }

  return (
    <div className="md-body" onClick={handleClick}>
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
