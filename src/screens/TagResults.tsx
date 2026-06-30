import { useMemo } from "react";
import { useStore, useDocs } from "../store";
import { docName } from "../lib/types";

function timeAgo(mtime: number): string {
  const diff = Date.now() / 1000 - mtime;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(mtime * 1000);
  if (diff < 7 * 86400) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function docDir(docId: string): string {
  const parts = docId.split("/");
  if (parts.length <= 1) return "Base root";
  return parts.slice(0, -1).join("/") + "/";
}

export function TagResults() {
  const docs = useDocs();
  const activeTag = useStore((s) => s.activeTag)!;
  const openTag = useStore((s) => s.openTag);
  const openDoc = useStore((s) => s.openDoc);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of docs) {
      for (const t of d.tags ?? []) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }));
  }, [docs]);

  const results = useMemo(
    () => docs.filter((d) => (d.tags ?? []).includes(activeTag)),
    [docs, activeTag],
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Left: tag list */}
      <div
        className="flex flex-col overflow-y-auto border-r border-line bg-surface"
        style={{ width: 200, flexShrink: 0, padding: "18px 14px" }}
      >
        <div
          className="text-mid"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", padding: "0 5px", marginBottom: 10 }}
        >
          Tags
        </div>
        <div className="flex flex-col gap-[3px]">
          {allTags.map(({ tag, count }) => {
            const active = tag === activeTag;
            return (
              <button
                key={tag}
                onClick={() => openTag(tag)}
                className="flex items-center gap-2 w-full text-left rounded-[8px] hover:bg-tertiary"
                style={{
                  height: 30,
                  padding: "0 10px",
                  fontSize: 13,
                  background: active ? "var(--color-row-active)" : undefined,
                  color: active ? "var(--color-ink)" : "var(--color-slate)",
                  fontWeight: active ? 500 : 400,
                }}
              >
                {tag}
                <span
                  className="ml-auto"
                  style={{ fontSize: 11, color: active ? "var(--color-mid)" : "var(--color-muted)" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: results */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-paper" style={{ padding: "34px 40px" }}>
        <div className="flex items-baseline gap-[10px] mb-[4px]">
          <span className="text-ink" style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.015em" }}>
            {activeTag}
          </span>
          <span className="text-muted" style={{ fontSize: 13 }}>
            {results.length} note{results.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="text-muted" style={{ fontSize: 13, marginBottom: 24 }}>
          Notes tagged {activeTag} across your Base.
        </div>

        {results.length === 0 ? (
          <p className="text-muted" style={{ fontSize: 13 }}>No notes with this tag.</p>
        ) : (
          <div className="flex flex-col gap-[2px]">
            {results.map((d) => (
              <button
                key={d.docId}
                onClick={() => openDoc(d.docId)}
                className="flex items-flex-start gap-3 w-full text-left rounded-[10px] hover:bg-surface transition-colors"
                style={{ padding: "14px 14px" }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="var(--color-muted)"
                  strokeWidth="1.3"
                  style={{ marginTop: 2, flexShrink: 0 }}
                >
                  <path d="M4 2h5l3 3v9H4z" />
                  <path d="M9 2v3h3" strokeLinejoin="round" />
                </svg>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="flex items-center gap-2">
                    <span className="text-ink" style={{ fontSize: 14.5, fontWeight: 600 }}>
                      {docName(d)}
                    </span>
                    <span className="text-muted" style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
                      {docDir(d.docId)}
                    </span>
                  </div>
                  {(d.tags?.length ?? 0) > 0 && (
                    <div className="flex gap-[6px] mt-[8px]">
                      {(d.tags ?? []).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 11,
                            color: t === activeTag ? "var(--color-slate)" : "var(--color-muted)",
                            background: "var(--color-tertiary)",
                            borderRadius: 5,
                            padding: "2px 7px",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-muted" style={{ marginLeft: "auto", fontSize: 11.5, flexShrink: 0 }}>
                  {timeAgo(d.mtime)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
