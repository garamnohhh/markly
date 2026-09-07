import { useState } from "react";
import { useStore, useDocs } from "../../store";
import { unreadCount, docName } from "../../lib/types";
import { DocContextMenu } from "../ui/DocContextMenu";
import type { CtxMenu } from "../ui/DocContextMenu";
import type { DocEntry } from "../../lib/types";

function timeAgo(mtime: number): string {
  const diff = Date.now() / 1000 - mtime;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const d = new Date(mtime * 1000);
  if (diff < 7 * 86400)
    return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const fullTime = (secs: number) => new Date(secs * 1000).toLocaleString();

export function ReadingQueue() {
  const docs = useDocs();
  const openDoc = useStore((s) => s.openDoc);
  const goChanges = useStore((s) => s.goChanges);
  const openId = useStore((s) => s.openDocId);
  const showEmpty = useStore((s) => s.showEmptySections);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const changes = docs.filter((d) => d.currentVersion > d.lastDecidedVersion);
  // Newest activity first: most recently modified / created docs on top.
  const unread = docs
    .filter((d) => unreadCount(d) > 0)
    .sort((a, b) => Math.max(b.mtime, b.created) - Math.max(a.mtime, a.created));
  const pinned = docs.filter((d) => d.pinned);
  const recent = [...docs].sort((a, b) => b.mtime - a.mtime).slice(0, 12);

  return (
    <div>
      {/* Changes banner */}
      {(changes.length > 0 || showEmpty) && (
        <button
          onClick={() => {
            if (!changes.length) return;
            goChanges();
          }}
          className={`mb-[14px] flex w-full items-center gap-[9px] px-[12px] text-left ${changes.length > 0 ? "hover:brightness-95" : "cursor-default"}`}
          style={{ height: "40px", background: "var(--color-surface)", borderLeft: "3px solid var(--color-gold)", border: "1px solid var(--color-line)", borderLeftWidth: 3, borderLeftColor: "var(--color-gold)" }}
        >
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="var(--color-accent-text)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8h3l1.5 2.5L9 4.5 10.5 8H14" />
          </svg>
          <span className="flex-1 text-[13px] font-semibold" style={{ color: "var(--color-ink)", opacity: changes.length === 0 ? 0.5 : 1 }}>
            Changes
          </span>
          {changes.length > 0 && (
            <span
              className="inline-flex min-w-[20px] items-center justify-center px-[6px] text-[11px] font-bold"
              style={{ height: "20px", background: "var(--color-gold)", color: "var(--color-on-accent)" }}
            >
              {changes.length}
            </span>
          )}
        </button>
      )}

      {/* Unread */}
      {(unread.length > 0 || showEmpty) && (
        <Section label="Unread" count={unread.length || undefined}>
          {unread.length > 0
            ? unread.map((d) => (
                <UnreadRow key={d.docId} doc={d} openId={openId} openDoc={openDoc} onCtx={(x, y) => setCtxMenu({ x, y, doc: d })} />
              ))
            : <EmptyHint text="All caught up" />}
        </Section>
      )}

      {/* Pinned */}
      {(pinned.length > 0 || showEmpty) && (
        <Section label="Pinned" count={pinned.length || undefined}>
          {pinned.length > 0
            ? pinned.map((d) => (
                <PinnedRow key={d.docId} doc={d} openId={openId} openDoc={openDoc} onCtx={(x, y) => setCtxMenu({ x, y, doc: d })} />
              ))
            : <EmptyHint text="No pinned notes" />}
        </Section>
      )}

      {/* Recent */}
      <Section label="Recent">
        {recent.map((d) => (
          <RecentRow key={d.docId} doc={d} openId={openId} openDoc={openDoc} onCtx={(x, y) => setCtxMenu({ x, y, doc: d })} />
        ))}
      </Section>
      <DocContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="px-[11px] py-[6px] text-[12px] text-mid">
      {text}
    </div>
  );
}

function Section({
  label,
  count,
  children,
}: {
  label: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-[18px]">
      <div className="mb-[6px] flex items-center gap-[6px] px-[9px]">
        <span
          className="text-[10px] font-bold uppercase text-mid"
          style={{ letterSpacing: "0.13em" }}
        >
          {label}
        </span>
        {count != null && (
          <span className="ml-auto text-[10px] tabular-nums text-muted">
            {count}
          </span>
        )}
      </div>
      <div className="flex flex-col gap-[1px]">{children}</div>
    </div>
  );
}

function rowBg(openId: string | null | undefined, docId: string) {
  return openId === docId ? "var(--color-row-active)" : undefined;
}

function UnreadRow({
  doc,
  openId,
  openDoc,
  onCtx,
}: {
  doc: DocEntry;
  openId: string | null | undefined;
  openDoc: (id: string) => void;
  onCtx: (x: number, y: number) => void;
}) {
  const n = unreadCount(doc);
  const active = openId === doc.docId;
  const isNew = doc.currentVersion === 1; // v1 = never externally changed → freshly added
  return (
    <button
      onClick={() => openDoc(doc.docId)}
      onContextMenu={(e) => { e.preventDefault(); onCtx(e.clientX, e.clientY); }}
      className="flex w-full items-start gap-[9px] px-[11px] text-left hover:bg-tertiary"
      style={{ minHeight: "34px", paddingTop: "6px", paddingBottom: "6px", background: rowBg(openId, doc.docId) }}
    >
      <span className="mt-[5px] size-[6px] shrink-0 bg-gold" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-[6px]">
          <span
            className="min-w-0 flex-1 truncate text-[13.5px]"
            style={{ color: active ? "var(--color-ink)" : "var(--color-slate)", fontWeight: active ? 600 : 500 }}
          >
            {docName(doc)}
          </span>
          <span
            className="shrink-0 px-[6px] text-[10.5px] font-semibold"
            style={{ border: "1px solid var(--color-line-soft)", color: "var(--color-muted)", fontFamily: "var(--font-mono)", paddingTop: "2px", paddingBottom: "2px" }}
          >
            {isNew ? "new" : `${n} edit${n > 1 ? "s" : ""}`}
          </span>
        </span>
        <span
          className="mt-[2px] block truncate text-[11px] text-muted"
          title={`Modified ${fullTime(doc.mtime)} · Created ${fullTime(doc.created)}`}
        >
          {isNew
            ? `created ${timeAgo(doc.created)}`
            : `edited ${timeAgo(doc.mtime)} · created ${timeAgo(doc.created)}`}
        </span>
      </span>
    </button>
  );
}

function PinnedRow({
  doc,
  openId,
  openDoc,
  onCtx,
}: {
  doc: DocEntry;
  openId: string | null | undefined;
  openDoc: (id: string) => void;
  onCtx: (x: number, y: number) => void;
}) {
  return (
    <button
      onClick={() => openDoc(doc.docId)}
      onContextMenu={(e) => { e.preventDefault(); onCtx(e.clientX, e.clientY); }}
      className="flex w-full items-center gap-[9px] px-[11px] text-left hover:bg-tertiary"
      style={{ minHeight: "32px", background: rowBg(openId, doc.docId) }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--color-gold)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M5 2.5h6l-.6 4 2.1 2.2H3.5L5.6 6.5z" />
        <path d="M8 10.7V13.5" />
      </svg>
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-slate">
        {docName(doc)}
      </span>
    </button>
  );
}

function RecentRow({
  doc,
  openId,
  openDoc,
  onCtx,
}: {
  doc: DocEntry;
  openId: string | null | undefined;
  openDoc: (id: string) => void;
  onCtx: (x: number, y: number) => void;
}) {
  return (
    <button
      onClick={() => openDoc(doc.docId)}
      onContextMenu={(e) => { e.preventDefault(); onCtx(e.clientX, e.clientY); }}
      className="flex w-full items-center gap-[9px] px-[11px] text-left hover:bg-tertiary"
      style={{ minHeight: "32px", background: rowBg(openId, doc.docId) }}
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--color-mid)" strokeWidth="1.3" className="shrink-0">
        <path d="M4 2h5l3 3v9H4z" />
        <path d="M9 2v3h3" strokeLinejoin="round" />
      </svg>
      <span className="min-w-0 flex-1 truncate text-[13.5px] text-slate">
        {docName(doc)}
      </span>
      <span className="shrink-0 text-[11px] text-muted">
        {timeAgo(doc.mtime)}
      </span>
    </button>
  );
}
