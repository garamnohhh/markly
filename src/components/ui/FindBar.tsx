import { useEffect, useRef, useState } from "react";
import { useStore } from "../../store";
import { findOccurrences, getFindTarget, wrapFindIndex, type FindMatch, type FindTarget } from "../../lib/find";

export function FindBar() {
  const findOpen = useStore((s) => s.findOpen);
  const setFindOpen = useStore((s) => s.setFindOpen);
  const [query, setQuery] = useState("");
  const [info, setInfo] = useState({ total: 0, current: 0 });
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const matchesRef = useRef<FindMatch[]>([]);
  const targetRef = useRef<FindTarget | null>(null);
  const idxRef = useRef(-1);

  function revealCurrent() {
    const r = matchesRef.current[idxRef.current];
    const target = targetRef.current;
    if (!r || !target) return;
    target.reveal(r);
  }

  useEffect(() => {
    if (findOpen) {
      setQuery("");
      setInfo({ total: 0, current: 0 });
      setSearched(false);
      matchesRef.current = [];
      targetRef.current = null;
      idxRef.current = -1;
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      matchesRef.current = [];
      targetRef.current?.clear?.();
      targetRef.current = null;
      idxRef.current = -1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [findOpen]);

  if (!findOpen) return null;

  function showAt(idx: number) {
    const matches = matchesRef.current;
    const total = matches.length;
    if (!total) return;
    const i = wrapFindIndex(idx, total);
    idxRef.current = i;
    setInfo({ total, current: i + 1 });
    revealCurrent();
  }

  function onFind(backward = false) {
    if (!query) return;
    if (matchesRef.current.length === 0) {
      targetRef.current = getFindTarget();
      matchesRef.current = findOccurrences(targetRef.current.getText(), query);
      setSearched(true);
      if (!matchesRef.current.length) {
        idxRef.current = -1;
        setInfo({ total: 0, current: 0 });
        return;
      }
      showAt(backward ? -1 : 0);
    } else {
      showAt(idxRef.current + (backward ? -1 : 1));
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    matchesRef.current = [];
    targetRef.current?.clear?.();
    targetRef.current = null;
    idxRef.current = -1;
    setInfo({ total: 0, current: 0 });
    setSearched(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Escape") { setFindOpen(false); return; }
    if (e.key === "Enter") { e.preventDefault(); onFind(e.shiftKey); }
  }

  const countLabel = info.total > 0
    ? `${info.current} / ${info.total}`
    : searched && query ? "없음" : "";

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
