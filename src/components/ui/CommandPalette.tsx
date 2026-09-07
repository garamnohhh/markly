import { useMemo, useState } from "react";
import { useStore, useDocs } from "../../store";
import { api } from "../../lib/invoke";
import { fuzzyFilter } from "../../lib/fuzzy";
import { docName, unreadCount } from "../../lib/types";

interface Item {
  id: string;
  label: string;
  group: "Recent · with updates" | "Notes" | "Actions";
  badge?: string;
  kbd?: string;
  icon: React.ReactNode;
  run: () => void;
}

const NoteIcon = ({ active }: { active?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke={active ? "var(--color-muted)" : "var(--color-mid)"}
    strokeWidth="1.3"
  >
    <path d="M4 2h5l3 3v9H4z" />
    <path d="M9 2v3h3" strokeLinejoin="round" />
  </svg>
);

export function CommandPalette() {
  const open = useStore((s) => s.cmdPaletteOpen);
  const setOpen = useStore((s) => s.setCmdPalette);
  const docs = useDocs();
  const s = useStore.getState;

  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);

  const items: Item[] = useMemo(() => {
    const close = () => setOpen(false);

    const commands: Item[] = [
      {
        id: "c:new",
        label: "New note",
        group: "Actions",
        kbd: "⌘N",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-slate)" strokeWidth="1.5" strokeLinecap="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
        ),
        run: async () => {
          close();
          const name = window.prompt("New note filename (e.g. ideas.md)");
          if (!name) return;
          const rel = name.endsWith(".md") ? name : `${name}.md`;
          const db = await api.createDoc(rel, `# ${rel.replace(/\.md$/i, "")}\n\n`);
          s().applyDb(db);
          s().openDoc(rel.toLowerCase());
          s().setMode("edit");
        },
      },
      {
        id: "c:edit",
        label: "Toggle edit mode",
        group: "Actions",
        kbd: "⌘E",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-slate)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 2.5l2.5 2.5L6 12.5l-3 .5.5-3z" />
          </svg>
        ),
        run: () => { s().toggleMode(); close(); },
      },
      {
        id: "c:inbox",
        label: "Go to Knowledge Inbox",
        group: "Actions",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-slate)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8h3l1.5 2.5L9 4.5 10.5 8H14" />
          </svg>
        ),
        run: () => { s().goInbox(); close(); },
      },
      {
        id: "c:rescan",
        label: "Re-scan Base",
        group: "Actions",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-slate)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 8a5.5 5.5 0 1 1 1.6 3.9" />
            <path d="M2.5 13v-3h3" />
          </svg>
        ),
        run: () => { s().rescan(); close(); },
      },
      {
        id: "c:sidebar",
        label: "Toggle Sidebar",
        group: "Actions",
        kbd: "⌘\\",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-slate)" strokeWidth="1.4" strokeLinecap="round">
            <path d="M14 4h-7M14 8h-7M14 12h-5" />
            <path d="M3 4v8" strokeWidth="1.6" />
          </svg>
        ),
        run: () => { s().toggleSidebar(); close(); },
      },
      {
        id: "c:settings",
        label: "Open Settings",
        group: "Actions",
        icon: (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-slate)" strokeWidth="1.4" strokeLinecap="round">
            <path d="M2.5 5h6M11 5h2.5M2.5 11h2.5M8 11h5.5" />
            <circle cx="9.5" cy="5" r="1.7" />
            <circle cx="6.5" cy="11" r="1.7" />
          </svg>
        ),
        run: () => { s().setView("settings"); close(); },
      },
    ];

    // Split docs into "with updates" (recent first) and "rest"
    const withUpdates: Item[] = docs
      .filter((d) => unreadCount(d) > 0)
      .slice(0, 5)
      .map((d) => ({
        id: `n:${d.docId}`,
        label: docName(d),
        group: "Recent · with updates" as const,
        badge: `${unreadCount(d)} new`,
        icon: <NoteIcon active />,
        run: () => { s().openDoc(d.docId); close(); },
      }));

    const rest: Item[] = docs
      .filter((d) => unreadCount(d) === 0)
      .slice(0, 20)
      .map((d) => ({
        id: `n:${d.docId}`,
        label: docName(d),
        group: "Notes" as const,
        icon: <NoteIcon />,
        run: () => { s().openDoc(d.docId); close(); },
      }));

    return [...withUpdates, ...rest, ...commands];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, setOpen]);

  const filtered = useMemo(
    () => (q ? fuzzyFilter(q, items, (i) => i.label) : items),
    [q, items],
  );

  const clamped = Math.min(active, Math.max(0, filtered.length - 1));

  if (!open) return null;

  // Group labels to show
  const groups: string[] = [];
  for (const it of filtered) {
    if (!groups.includes(it.group)) groups.push(it.group);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
      style={{ background: "rgba(44,42,39,0.18)" }}
      onClick={() => setOpen(false)}
    >
      <div
        style={{
          width: 460,
          background: "var(--color-paper)",
          border: "1px solid var(--color-line)",
          borderRadius: 14,
          boxShadow: "0 30px 60px -20px rgba(44,42,39,0.45)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div
          className="flex items-center gap-[11px]"
          style={{ padding: "15px 18px", borderBottom: "1px solid var(--color-tertiary)" }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke={q ? "var(--color-slate)" : "var(--color-mid)"}
            strokeWidth="1.5"
          >
            <circle cx="7" cy="7" r="4.5" />
            <path d="M11 11l3 3" strokeLinecap="round" />
          </svg>
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                filtered[clamped]?.run();
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Search notes or type a command…"
            className="flex-1 bg-transparent focus:outline-none"
            style={{ fontSize: 16, color: q ? "var(--color-ink)" : "var(--color-mid)" }}
          />
          <button
            onClick={() => setOpen(false)}
            className="rounded-control px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-tertiary hover:text-ink"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            esc
          </button>
        </div>

        {/* Results */}
        <div style={{ padding: "8px 8px 10px", maxHeight: "50vh", overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "12px", fontSize: 13, color: "var(--color-mid)" }}>
              No matches
            </div>
          )}
          {groups.map((group) => {
            const groupItems = filtered.filter((it) => it.group === group);
            if (!groupItems.length) return null;
            const startIndex = filtered.indexOf(groupItems[0]);
            return (
              <div key={group}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "var(--color-mid)",
                    textTransform: "uppercase",
                    padding: "8px 12px 6px",
                  }}
                >
                  {group}
                </div>
                {groupItems.map((it, localIdx) => {
                  const idx = startIndex + localIdx;
                  const isActive = idx === clamped;
                  return (
                    <button
                      key={it.id}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => it.run()}
                      className="flex items-center gap-[11px] w-full text-left rounded-[9px]"
                      style={{
                        padding: "9px 12px",
                        background: isActive ? "var(--color-tertiary)" : undefined,
                      }}
                    >
                      <span style={{ flexShrink: 0 }}>{it.icon}</span>
                      <span
                        style={{
                          fontSize: 14,
                          color: isActive ? "var(--color-ink)" : "var(--color-line)",
                          flex: 1,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {it.label}
                      </span>
                      {it.badge && (
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: "var(--color-muted)",
                            border: "1px solid var(--color-line-soft)",
                            fontFamily: "var(--font-mono)",
                            padding: "2px 7px",
                            flexShrink: 0,
                          }}
                        >
                          {it.badge}
                        </span>
                      )}
                      {it.kbd && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--color-line)",
                            fontFamily: "var(--font-mono)",
                            flexShrink: 0,
                          }}
                        >
                          {it.kbd}
                        </span>
                      )}
                      {isActive && !it.kbd && (
                        <span
                          style={{
                            fontSize: 11,
                            color: "var(--color-line)",
                            fontFamily: "var(--font-mono)",
                            flexShrink: 0,
                          }}
                        >
                          ↵
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4"
          style={{
            padding: "10px 18px",
            borderTop: "1px solid var(--color-tertiary)",
            background: "var(--color-paper)",
          }}
        >
          {[
            { key: "↑↓", label: "navigate" },
            { key: "↵", label: "open" },
            { key: "⌘↵", label: "open in split" },
          ].map(({ key, label }) => (
            <span key={key} style={{ fontSize: 11.5, color: "var(--color-mid)" }}>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--color-muted)" }}>
                {key}
              </span>{" "}
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
