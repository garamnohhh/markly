import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useStore, useDocs } from "../../store";
import type { SidebarTab } from "../../store";
import { ReadingQueue } from "../sidebar/ReadingQueue";
import { FileTree } from "../sidebar/FileTree";

const TABS: { value: SidebarTab; label: string; icon: React.ReactNode }[] = [
  {
    value: "queue",
    label: "Queue",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h7" />
      </svg>
    ),
  },
  {
    value: "files",
    label: "Files",
    icon: (
      <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <path d="M2 4.4c0-.5.4-.9.9-.9h2.4l1.1 1.3h6.7c.5 0 .9.4.9.9v6.1c0 .5-.4.9-.9.9H2.9c-.5 0-.9-.4-.9-.9z" />
      </svg>
    ),
  },
];

function VaultSwitcher() {
  const vaultRoot = useStore((s) => s.vaultRoot);
  const vaults = useStore((s) => s.vaults);
  const openVault = useStore((s) => s.openVault);
  const removeVault = useStore((s) => s.removeVault);
  const [popOpen, setPopOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!popOpen) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setPopOpen(false);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [popOpen]);

  const activeName = vaultRoot?.split("/").pop() ?? "No Base";
  const others = vaults.filter((v) => v !== vaultRoot);

  async function addBase() {
    setPopOpen(false);
    const path = await openDialog({ directory: true, multiple: false });
    if (typeof path === "string") openVault(path);
  }

  return (
    <div ref={ref} className="relative shrink-0 border-t border-line px-[14px] py-[10px]">
      <button
        onClick={() => setPopOpen((v) => !v)}
        className="flex w-full items-center gap-[8px] px-[9px] hover:bg-tertiary"
        style={{ height: 32 }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--color-mid)" strokeWidth="1.3">
          <path d="M2 4.4c0-.5.4-.9.9-.9h2.4l1.1 1.3h6.7c.5 0 .9.4.9.9v6.1c0 .5-.4.9-.9.9H2.9c-.5 0-.9-.4-.9-.9z" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-slate">{activeName}</span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="var(--color-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 4.5L6 7.5l3-3" />
        </svg>
      </button>

      {popOpen && (
        <div
          className="absolute bottom-full left-[14px] right-[14px] mb-[4px] overflow-hidden border border-line bg-paper"
          style={{ boxShadow: "0 8px 24px -4px rgba(0,0,0,0.14)" }}
        >
          {/* current vault */}
          <div className="flex items-center gap-[8px] px-[12px] py-[8px]">
            <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">{activeName}</span>
            <span className="shrink-0 bg-tertiary px-[7px] py-[2px] text-[10.5px] text-muted">active</span>
          </div>

          {/* other vaults */}
          {others.length > 0 && (
            <>
              <div className="mx-[8px] border-t border-line" />
              {others.map((v) => {
                const name = v.split("/").pop() ?? v;
                return (
                  <div key={v} className="group flex items-center gap-[6px] px-[12px] hover:bg-tertiary">
                    <button
                      onClick={() => { setPopOpen(false); openVault(v); }}
                      className="min-w-0 flex-1 truncate py-[8px] text-left text-[12.5px] text-slate"
                    >
                      {name}
                    </button>
                    <button
                      onClick={() => removeVault(v)}
                      className="hidden shrink-0 rounded p-[2px] text-muted hover:text-red group-hover:flex"
                      title="Remove from list"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M2 2l8 8M10 2l-8 8" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </>
          )}

          <div className="mx-[8px] border-t border-line" />
          <button
            onClick={addBase}
            className="flex w-full items-center gap-[8px] px-[12px] py-[9px] text-left text-[12.5px] text-slate hover:bg-tertiary"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 2v8M2 6h8" />
            </svg>
            Add Base
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const tab = useStore((s) => s.sidebarTab);
  const setTab = useStore((s) => s.setSidebarTab);
  const setCmdPalette = useStore((s) => s.setCmdPalette);
  const openTag = useStore((s) => s.openTag);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const showEmpty = useStore((s) => s.showEmptySections);
  const docs = useDocs();
  const tags = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d) => d.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [docs]);

  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    const onMove = (mv: MouseEvent) => setSidebarWidth(startW + mv.clientX - startX);
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [sidebarWidth, setSidebarWidth]);

  return (
    <aside
      className="relative flex shrink-0 flex-col border-r border-line bg-surface"
      style={{ width: sidebarWidth }}
    >
      {/* fixed top: search + tab switcher + new note */}
      <div className="shrink-0 px-[14px] pt-[18px] pb-[12px]" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {/* search */}
        <button
          onClick={() => setCmdPalette(true)}
          className="flex w-full items-center gap-2 border border-line bg-paper px-[11px] text-left hover:border-mid"
          style={{ height: "34px" }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--color-mid)" strokeWidth="1.5">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11l3 3" strokeLinecap="round" />
          </svg>
          <span className="flex-1 text-[13px] text-muted">Search</span>
          <span className="font-mono text-[11px] text-mid">⌘K</span>
        </button>

        {/* Queue / Files toggle */}
        <div className="flex gap-[3px] p-[3px]" style={{ background: "var(--color-tertiary)" }}>
          {TABS.map(({ value, label, icon }) => {
            const active = tab === value;
            return (
              <button
                key={value}
                onClick={() => setTab(value)}
                className="flex flex-1 items-center justify-center gap-[6px] transition-colors"
                style={{
                  height: "28px",
                  fontSize: "12px",
                  fontWeight: active ? 600 : 500,
                  background: active ? "var(--color-paper)" : "transparent",
                  color: active ? "var(--color-ink)" : "var(--color-muted)",
                  boxShadow: active ? "0 1px 2px rgba(44,42,39,0.06)" : "none",
                }}
              >
                {icon}
                {label}
              </button>
            );
          })}
        </div>

        {/* New note */}
        <button
          className="flex w-full items-center justify-center gap-[7px] text-[13px] font-medium hover:opacity-90"
          style={{ height: "36px", background: "var(--color-ink)", color: "var(--color-surface)" }}
          onClick={() => useStore.getState().newNote()}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          New note
        </button>
      </div>

      {/* scrollable content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-[14px] pb-[14px]">
        {tab === "queue" ? <ReadingQueue /> : <FileTree />}
      </div>

      {/* Tags — pinned at bottom */}
      {(tags.length > 0 || showEmpty) && (
        <div className="shrink-0 border-t border-line px-[14px] pt-[12px] pb-[14px]">
          <div
            className="mb-[9px] px-[5px] text-[10px] font-bold uppercase text-mid"
            style={{ letterSpacing: "0.13em" }}
          >
            Tags
          </div>
          <div
            className="flex flex-wrap gap-[6px] px-[5px]"
            style={{ maxHeight: "88px", overflowY: "auto", scrollbarWidth: "none" }}
          >
            {tags.map((t) => (
              <button
                key={t}
                onClick={() => openTag(t)}
                className="cursor-pointer bg-tertiary px-[9px] py-[4px] text-[12px] text-slate hover:bg-line"
              >
                #{t}
              </button>
            ))}
            {tags.length === 0 && (
              <span className="px-[4px] text-[12px] text-muted">No tags yet</span>
            )}
          </div>
        </div>
      )}

      {/* Vault switcher */}
      <VaultSwitcher />

      {/* Drag handle — right edge */}
      <div
        onMouseDown={onDragStart}
        className="absolute right-0 top-0 h-full w-[4px] cursor-col-resize hover:bg-[var(--color-gold)20]"
        style={{ zIndex: 1 }}
      />
    </aside>
  );
}
