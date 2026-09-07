import { useEffect, useMemo, useState } from "react";
import { useStore, useDocs } from "../store";
import { api } from "../lib/invoke";
import { docName } from "../lib/types";
import { MarkdownRenderer } from "../components/reader/MarkdownRenderer";
import type { DocEntry } from "../lib/types";

function extractLinkedDocs(content: string, docs: DocEntry[]): DocEntry[] {
  // Index by full docId AND by filename alone (for [[wiki link]] resolution)
  const byId = new Map(docs.map((d) => [d.docId, d]));
  const byFilename = new Map(docs.map((d) => [d.docId.split("/").pop()!, d]));
  const found: DocEntry[] = [];
  const seen = new Set<string>();

  const add = (d: DocEntry | undefined) => {
    if (d && !seen.has(d.docId)) { seen.add(d.docId); found.push(d); }
  };

  for (const m of content.matchAll(/\[\[([^\]]+)\]\]/g)) {
    const raw = m[1].trim();
    const slug = raw.toLowerCase().replace(/\s+/g, "-") + ".md";
    add(byFilename.get(slug) ?? byFilename.get(raw.toLowerCase() + ".md") ?? byId.get(slug));
  }

  for (const m of content.matchAll(/\[[^\]]*\]\(([^)#?]+\.md)\)/g)) {
    const ref = m[1].replace(/^\.\//, "").toLowerCase();
    add(byId.get(ref) ?? byFilename.get(ref.split("/").pop()!));
  }

  return found;
}

export function RabbitHole() {
  const trail = useStore((s) => s.rabbitTrail);
  const push = useStore((s) => s.rabbitHolePush);
  const docs = useDocs();
  const editorWidth = useStore((s) => s.editorWidth);
  const openDoc = useStore((s) => s.openDoc);

  const currentDocId = trail[trail.length - 1];
  const currentDoc = useStore((s) => s.db?.docs[currentDocId]);
  const [content, setContent] = useState("");

  const maxWidth = editorWidth === "wide" ? 920 : 660;

  useEffect(() => {
    if (!currentDocId) return;
    setContent("");
    api.readDoc(currentDocId).then((r) => setContent(r.content));
  }, [currentDocId]);

  const deeper = useMemo(
    () => extractLinkedDocs(content, docs).filter((d) => d.docId !== currentDocId),
    [content, docs, currentDocId],
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Left: trail */}
      <div
        className="flex flex-col overflow-y-auto border-r border-line bg-surface"
        style={{ width: 220, flexShrink: 0, padding: "24px 16px" }}
      >
        <div
          className="text-mid"
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 18 }}
        >
          Your trail
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          {trail.length > 1 && (
            <div
              style={{
                position: "absolute",
                left: 7,
                top: 8,
                bottom: 28,
                width: 2,
                background: "var(--color-line)",
              }}
            />
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {trail.map((docId, i) => {
              const isActive = i === trail.length - 1;
              const d = docs.find((x) => x.docId === docId);
              return (
                <button
                  key={`${docId}-${i}`}
                  onClick={() => {
                    if (isActive) return;
                    if (i === 0) {
                      openDoc(trail[0]);
                    } else {
                      useStore.setState({ rabbitTrail: trail.slice(0, i + 1) });
                    }
                  }}
                  className="flex items-center gap-3 text-left"
                  style={{ position: "relative", minHeight: 28, cursor: isActive ? "default" : "pointer" }}
                >
                  <span
                    style={{
                      width: 16,
                      height: 16,
                      background: isActive ? "var(--color-ink)" : "var(--color-paper)",
                      border: `2px solid ${isActive ? "var(--color-ink)" : "var(--color-line)"}`,
                      flexShrink: 0,
                      zIndex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isActive && <span style={{ width: 5, height: 5,  background: "var(--color-paper)" }} />}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: isActive ? "var(--color-ink)" : "var(--color-muted)",
                      fontWeight: isActive ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {d ? docName(d) : docId}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: doc content + go deeper */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-paper">
        <div style={{ maxWidth, margin: "0 auto", padding: "40px 48px" }}>
          <div
            className="text-muted"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}
          >
            Now reading
          </div>
          <h1
            className="text-ink"
            style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em", margin: "0 0 24px" }}
          >
            {currentDoc ? docName(currentDoc) : currentDocId}
          </h1>

          {content ? (
            <MarkdownRenderer source={content} />
          ) : (
            <div className="text-muted" style={{ fontSize: 13 }}>Loading…</div>
          )}

          {deeper.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div
                className="text-mid"
                style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 12 }}
              >
                Go deeper
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deeper.map((d) => (
                  <button
                    key={d.docId}
                    onClick={() => push(d.docId)}
                    className="flex items-center gap-3 text-left hover:border-mid hover:bg-paper transition-colors"
                    style={{
                      padding: "13px 16px",
                      border: "1px solid var(--color-line)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-ink" style={{ fontSize: 14, fontWeight: 600 }}>{docName(d)}</div>
                      <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>{d.docId}</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--color-muted)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M6 3l5 5-5 5" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
