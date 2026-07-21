import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const w = window as any;

function applyHL(r: Range | null) {
  if (!w.CSS?.highlights || typeof w.Highlight === "undefined") return;
  if (r) w.CSS.highlights.set("markly-find", new w.Highlight(r.cloneRange()));
  else w.CSS.highlights.delete("markly-find");
}

function buildMatches(q: string): Range[] {
  if (!q) return [];
  const ql = q.toLowerCase();
  // Search only the content area; fall back to body (with sidebar excluded via data-find-exclude)
  const root = document.querySelector(".doc-scroll") ?? document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      (node.parentElement as Element | null)?.closest("[data-find-exclude]")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  const out: Range[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) {
    const t = (n as Text).textContent ?? "";
    const tl = t.toLowerCase();
    let i = 0;
    while (true) {
      const j = tl.indexOf(ql, i);
      if (j === -1) break;
      const r = document.createRange();
      r.setStart(n, j);
      r.setEnd(n, j + q.length);
      out.push(r);
      i = j + 1;
    }
  }
  return out;
}

export function FindBar() {
  const findOpen = useStore((s) => s.findOpen);
  const setFindOpen = useStore((s) => s.setFindOpen);
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState({ total: 0, current: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<Range[]>([]);
  const idxRef = useRef(-1);

  useEffect(() => {
    if (findOpen) {
      setQuery("");
      setInfo({ total: 0, current: 0 });
      matchesRef.current = [];
      idxRef.current = -1;
      applyHL(null);
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      applyHL(null);
    }
  }, [findOpen]);

  if (!findOpen) return null;

  function showAt(matches: Range[], idx: number) {
    idxRef.current = idx;
    setInfo({ total: matches.length, current: idx + 1 });
    applyHL(matches[idx]);
    try {
      matches[idx].startContainer.parentElement?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch { /* node detached */ }
  }

  function doSearch(q: string, backward = false) {
    const matches = buildMatches(q);
    matchesRef.current = matches;
    if (!matches.length) {
      idxRef.current = -1;
      setInfo({ total: 0, current: 0 });
      applyHL(null);
      return;
    }
    showAt(matches, backward ? matches.length - 1 : 0);
  }

  function doNavigate(backward = false) {
    const matches = matchesRef.current;
    if (!matches.length) return;
    const next = backward
      ? (idxRef.current - 1 + matches.length) % matches.length
      : (idxRef.current + 1) % matches.length;
    showAt(matches, next);
  }

  function onFind(backward = false) {
    if (!query) return;
    if (matchesRef.current.length > 0) doNavigate(backward);
    else doSearch(query, backward);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    // Reset when query changes — user must press Enter to search again
    matchesRef.current = [];
    idxRef.current = -1;
    setInfo({ total: 0, current: 0 });
    applyHL(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Escape") { setFindOpen(false); return; }
    if (e.key === "Enter") { e.preventDefault(); onFind(e.shiftKey); }
  }

  const noResult = query && info.total === 0 && matchesRef.current !== undefined && idxRef.current === -1;
  const countLabel = info.total > 0
    ? `${info.current} / ${info.total}`
    : noResult ? "없음" : "";

  return (
    <div
      data-find-exclude
      className="fixed z-[100] flex items-center gap-1.5 rounded-[10px] border border-line bg-paper"
      style={{ top: 52, right: 16, padding: "6px 10px", minWidth: 280, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.18)" }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--color-muted)" strokeWidth="1.6" strokeLinecap="round" style={{ flexShrink: 0 }}>
        <circle cx="6.5" cy="6.5" r="4.5" /><path d="M10.5 10.5L14 14" />
      </svg>
      <input
        ref={inputRef}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder="Find in page…"
        className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-muted"
        style={{ minWidth: 0 }}
      />
      {countLabel && (
        <span className="shrink-0 text-[12px] tabular-nums" style={{ color: "var(--color-muted)", minWidth: 38, textAlign: "right" }}>
          {countLabel}
        </span>
      )}
      <button onClick={() => onFind(true)} title="Previous (Shift+Enter)"
        className="flex items-center justify-center rounded-[5px] text-muted hover:bg-tertiary hover:text-ink"
        style={{ width: 24, height: 24, flexShrink: 0 }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9.5V2.5M2.5 6L6 2.5 9.5 6" />
        </svg>
      </button>
      <button onClick={() => onFind(false)} title="Next (Enter)"
        className="flex items-center justify-center rounded-[5px] text-muted hover:bg-tertiary hover:text-ink"
        style={{ width: 24, height: 24, flexShrink: 0 }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2.5V9.5M2.5 6L6 9.5 9.5 6" />
        </svg>
      </button>
      <button onClick={() => setFindOpen(false)}
        className="flex items-center justify-center rounded-[5px] text-muted hover:bg-tertiary hover:text-ink"
        style={{ width: 24, height: 24, flexShrink: 0 }}>
        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <path d="M1 1l10 10M11 1L1 11" />
        </svg>
      </button>
    </div>
  );
}
