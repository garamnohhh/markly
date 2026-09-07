import { useEffect, useMemo, useState } from "react";
import { useStore, useDocs } from "../../store";
import { docName } from "../../lib/types";
import type { DocEntry } from "../../lib/types";
import { api } from "../../lib/invoke";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Scored {
  doc: DocEntry;
  score: number;
  reason: string;
}

function scoreDoc(current: DocEntry, candidate: DocEntry, content: string): Scored | null {
  if (candidate.docId === current.docId) return null;
  let score = 0;
  const reasons: string[] = [];

  const sharedTags = (current.tags ?? []).filter((t) => (candidate.tags ?? []).includes(t));
  if (sharedTags.length > 0) {
    score += sharedTags.length * 0.3;
    reasons.push("shared tags");
  }

  const currentDir = current.docId.split("/").slice(0, -1).join("/");
  const candidateDir = candidate.docId.split("/").slice(0, -1).join("/");
  if (currentDir && currentDir === candidateDir) {
    score += 0.2;
    reasons.push("same folder");
  }

  const candidateName = docName(candidate).toLowerCase();
  const wikiPattern = new RegExp(`\\[\\[${candidateName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\]\\]`, "i");
  const mdLinkPattern = new RegExp(`\\]\\(${candidate.docId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`, "i");
  if (wikiPattern.test(content) || mdLinkPattern.test(content)) {
    score += 0.35;
    reasons.push("linked");
  }

  const currentWords = current.docId.split(/[\s/_-]+/).filter((w) => w.length >= 4);
  const candidateWords = candidate.docId.split(/[\s/_-]+/).filter((w) => w.length >= 4);
  const commonWords = currentWords.filter((w) =>
    candidateWords.some((cw) => cw.toLowerCase() === w.toLowerCase()),
  );
  if (commonWords.length > 0) {
    score += commonWords.length * 0.1;
    reasons.push("similar terms");
  }

  if (score < 0.15) return null;
  return { doc: candidate, score: Math.min(1, score), reason: reasons.slice(0, 2).join(" · ") };
}

export function RelatedTopics({
  content,
  onClose,
}: {
  content: string;
  onClose: () => void;
}) {
  const openDocId = useStore((s) => s.openDocId);
  const currentDoc = useStore((s) => (openDocId && s.db ? s.db.docs[openDocId] : undefined));
  const openDoc = useStore((s) => s.openDoc);
  const setRelatedSelectedDocId = useStore((s) => s.setRelatedSelectedDocId);
  const docs = useDocs();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  function selectDoc(id: string | null) {
    setSelectedDocId(id);
    setRelatedSelectedDocId(id);
  }
  const [previewContent, setPreviewContent] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const related = useMemo<Scored[]>(() => {
    if (!currentDoc) return [];
    return docs
      .map((d) => scoreDoc(currentDoc, d, content))
      .filter((x): x is Scored => x !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);
  }, [currentDoc, docs, content]);

  const sharedTags = useMemo(() => {
    if (!currentDoc) return [];
    const tagCounts = new Map<string, number>();
    for (const d of docs) {
      if (d.docId === currentDoc.docId) continue;
      for (const t of d.tags ?? []) {
        if ((currentDoc.tags ?? []).includes(t)) {
          tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
        }
      }
    }
    return [...tagCounts.keys()].slice(0, 5);
  }, [currentDoc, docs]);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Load preview when selection changes
  useEffect(() => {
    if (!selectedDocId) { setPreviewContent(""); return; }
    setPreviewLoading(true);
    api.readDoc(selectedDocId)
      .then((dc) => { setPreviewContent(dc.content); setPreviewLoading(false); })
      .catch(() => setPreviewLoading(false));
  }, [selectedDocId]);

  const selectedName = selectedDocId?.split("/").pop()?.replace(/\.md$/i, "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(44,42,39,0.45)" }}>
      <div className="absolute inset-0" onClick={onClose} />

      <div
        className="relative flex flex-col overflow-hidden border border-line bg-paper"
        style={{
          width: "min(1240px, 92vw)",
          height: "74vh",
          boxShadow: "0 24px 60px -12px rgba(44,42,39,0.35)",
        }}
      >
        {/* Shared header — 3 zones aligned with the two panels below */}
        <div className="flex shrink-0 items-center border-b border-line" style={{ height: 42 }}>
          {/* Left zone: label, same width as list panel */}
          <div className="flex shrink-0 items-center" style={{ width: 269, padding: "0 16px" }}>
            <span
              className="text-mid"
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" }}
            >
              Related
            </span>
          </div>

          {/* Center zone: filename of selected doc */}
          <div className="flex min-w-0 flex-1 items-center justify-center">
            {selectedName && (
              <span className="truncate text-ink font-semibold" style={{ fontSize: 13.5 }}>
                {selectedName}
              </span>
            )}
          </div>

          {/* Right zone: Open + esc, same width as list panel for symmetry */}
          <div className="flex shrink-0 items-center justify-end gap-1" style={{ width: 269, padding: "0 12px" }}>
            {selectedDocId && (
              <button
                onClick={() => openDoc(selectedDocId)}
                className="rounded-control px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-tertiary hover:text-ink"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                open
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-control px-2 py-0.5 text-[11px] font-medium text-muted transition-colors hover:bg-tertiary hover:text-ink"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              esc
            </button>
          </div>
        </div>

        {/* Body: list | divider | content */}
        <div className="flex min-h-0 flex-1">
          {/* Left: list */}
          <div className="flex shrink-0 flex-col border-r border-line overflow-y-auto" style={{ width: 269, padding: "8px 10px" }}>
            {related.length === 0 && sharedTags.length === 0 ? (
              <div className="text-muted" style={{ fontSize: 12.5, padding: "12px 6px" }}>
                No related documents found.
              </div>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {related.map(({ doc, reason }) => (
                    <button
                      key={doc.docId}
                      onClick={() => selectDoc(doc.docId)}
                      className={`flex items-center gap-2 text-left transition-colors ${
                        selectedDocId === doc.docId ? "bg-tertiary" : "hover:bg-tertiary"
                      }`}
                      style={{ padding: "9px 10px" }}
                    >
                      <svg
                        width="14" height="14" viewBox="0 0 16 16" fill="none"
                        stroke="var(--color-muted)" strokeWidth="1.3" style={{ flexShrink: 0 }}
                      >
                        <path d="M4 2h5l3 3v9H4z" />
                        <path d="M9 2v3h3" strokeLinejoin="round" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="text-ink"
                          style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {docName(doc)}
                        </div>
                        {reason && (
                          <div className="text-muted" style={{ fontSize: 11, marginTop: 1 }}>
                            {reason}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {sharedTags.length > 0 && (
                  <>
                    <div style={{ height: 1, background: "var(--color-line)", margin: "12px 0" }} />
                    <div
                      className="text-mid"
                      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 10, padding: "0 4px" }}
                    >
                      Shared tags
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 4px" }}>
                      {sharedTags.map((t) => (
                        <span
                          key={t}
                          className="text-slate"
                          style={{ fontSize: 12, background: "var(--color-tertiary)",  padding: "4px 9px" }}
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Right: content, equal left/right padding, centered */}
          <div className="min-w-0 flex-1 overflow-y-auto">
            {selectedDocId ? (
              <div className="mx-auto w-full" style={{ maxWidth: 920, padding: "36px 56px 64px" }}>
                {previewLoading ? (
                  <span className="text-muted" style={{ fontSize: 13 }}>Loading…</span>
                ) : (
                  <MarkdownRenderer source={previewContent} />
                )}
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <span className="text-muted" style={{ fontSize: 13 }}>
                  Select a document to preview
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
