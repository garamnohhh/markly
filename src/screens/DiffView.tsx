import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, useDocs } from "../store";
import { api } from "../lib/invoke";
import { docName, unreadCount } from "../lib/types";
import type { WordOp, ChangeRecord } from "../lib/types";

function timeAgo(mtime: number): string {
  const diff = Date.now() / 1000 - mtime;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(mtime * 1000);
  if (diff < 7 * 86400) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface DiffLine {
  num: number;
  kind: "ctx" | "del" | "ins" | "chg";
  segments: Array<{ op: "eq" | "ins" | "del"; text: string }>;
}

function buildLines(ops: WordOp[]): DiffLine[] {
  const lines: DiffLine[] = [];
  let cur: Array<{ op: "eq" | "ins" | "del"; text: string }> = [];
  let num = 1;

  function flush() {
    if (!cur.length) return;
    const hasDel = cur.some((o) => o.op === "del");
    const hasIns = cur.some((o) => o.op === "ins");
    let kind: DiffLine["kind"] = "ctx";
    if (hasDel && hasIns) kind = "chg";
    else if (hasDel) kind = "del";
    else if (hasIns) kind = "ins";
    lines.push({ num: num++, kind, segments: cur });
    cur = [];
  }

  for (const op of ops) {
    const parts = op.text.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (parts[i]) cur.push({ op: op.op, text: parts[i] });
      if (i < parts.length - 1) flush();
    }
  }
  flush();
  return lines;
}

type ViewMode = "combined" | "step";

export function DiffView() {
  const target = useStore((s) => s.diffTarget);
  const doc = useStore((s) => target ? s.db?.docs[target.docId] : undefined);
  const docs = useDocs();
  const acceptChange = useStore((s) => s.acceptChange);
  const revert = useStore((s) => s.revert);
  const openDiff = useStore((s) => s.openDiff);
  const applyDb = useStore((s) => s.applyDb);

  const [view, setView] = useState<ViewMode>("combined");

  // Combined diff state
  const [ops, setOps] = useState<WordOp[]>([]);
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffError, setDiffError] = useState<string | null>(null);

  // Step mode state
  const [stepRecords, setStepRecords] = useState<ChangeRecord[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [stepLoading, setStepLoading] = useState(false);

  // track current docId for cleanup effect (fires only on full unmount)
  const activeDocIdRef = useRef<string | null>(target?.docId ?? null);
  activeDocIdRef.current = target?.docId ?? null;

  useEffect(() => {
    return () => {
      const s = useStore.getState();
      if (s.acceptChangesOnClose && activeDocIdRef.current) {
        s.acceptChange(activeDocIdRef.current);
      }
    };
  }, []);

  const effectiveFrom = target ? target.from : 0;

  // Combined diff
  useEffect(() => {
    if (!target) return;
    setOps([]);
    setDiffError(null);
    setDiffLoading(true);
    api.diff(target.docId, effectiveFrom, target.to)
      .then((r) => { setOps(r.ops); setDiffLoading(false); })
      .catch((e: unknown) => { setDiffError(String(e)); setDiffLoading(false); });
  }, [target?.docId, effectiveFrom, target?.to]);

  // Step records
  useEffect(() => {
    if (!target) return;
    setStepRecords([]);
    setStepIndex(0);
    setStepLoading(true);
    api.listChanges(target.docId)
      .then((records) => {
        const relevant = records.filter(
          (r) => r.from >= effectiveFrom && r.to <= target.to,
        );
        setStepRecords(relevant);
        setStepLoading(false);
      })
      .catch(() => setStepLoading(false));
  }, [target?.docId, effectiveFrom, target?.to]);

  const lines = useMemo(() => buildLines(ops), [ops]);
  const stepOps = stepRecords[stepIndex]?.ops ?? [];
  const stepLines = useMemo(() => buildLines(stepOps), [stepOps]);

  // Changes list = cv > lastDecidedVersion
  const changes = useMemo(
    () => docs.filter((d) => d.currentVersion > d.lastDecidedVersion).sort((a, b) => b.mtime - a.mtime),
    [docs],
  );

  return (
    <div className="flex h-full min-h-0">
      {/* Left panel: pending changes */}
      <div
        className="flex flex-col min-h-0 border-r border-line bg-surface"
        style={{ width: 268, flexShrink: 0 }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, padding: "18px 16px 12px" }}>
          <div className="flex items-center gap-2">
            <span
              className="text-mid"
              style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" }}
            >
              Pending changes
            </span>
            <span className="text-muted" style={{ marginLeft: "auto", fontSize: 11, fontVariantNumeric: "tabular-nums" }}>
              {changes.length} doc{changes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: "0 12px 0" }}>
          <div className="flex flex-col gap-[3px]">
            {changes.map((d) => {
              const active = d.docId === target?.docId;
              const n = d.currentVersion - d.lastDecidedVersion;
              return (
                <button
                  key={d.docId}
                  onClick={() => openDiff(d.docId, d.lastDecidedVersion, d.currentVersion)}
                  className="w-full text-left"
                  style={{
                    padding: "11px 12px",
                    background: active ? "var(--color-paper)" : undefined,
                    border: active ? "1px solid var(--color-line)" : "1px solid transparent",
                    boxShadow: active ? "0 1px 2px rgba(44,42,39,0.04)" : undefined,
                  }}
                >
                  <div className="flex items-center gap-[7px]">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none"
                      stroke={active ? "var(--color-mid)" : "var(--color-muted)"} strokeWidth="1.3" style={{ flexShrink: 0 }}>
                      <path d="M4 2h5l3 3v9H4z" />
                      <path d="M9 2v3h3" strokeLinejoin="round" />
                    </svg>
                    <span style={{
                      fontSize: 13.5, fontWeight: active ? 600 : 400,
                      color: active ? "var(--color-ink)" : "var(--color-slate)",
                      flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {docName(d)}
                    </span>
                    {active && <span style={{ width: 6, height: 6,  background: "var(--color-gold)", flexShrink: 0 }} />}
                  </div>
                  <div className="flex items-center gap-[9px]" style={{ marginTop: 7, paddingLeft: 20 }}>
                    <span style={{ fontSize: 11, color: active ? "var(--color-accent-text)" : "var(--color-muted)", fontFamily: "var(--font-mono)" }}>
                      v{d.lastDecidedVersion} → v{d.currentVersion}
                    </span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, color: "var(--color-muted)",
                      border: "1px solid var(--color-line-soft)", fontFamily: "var(--font-mono)", padding: "1px 6px",
                    }}>
                      {n} change{n !== 1 ? "s" : ""}
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--color-muted)" }}>
                      {timeAgo(d.mtime)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right: diff view */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0 bg-paper">
        {!target ? (
          <div className="flex flex-1 items-center justify-center">
            <span className="text-muted" style={{ fontSize: 13 }}>Select a document to review its changes.</span>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 shrink-0 border-b border-line" style={{ padding: "16px 24px" }}>
              <div style={{ minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span className="text-ink" style={{ fontSize: 15, fontWeight: 600 }}>
                    {doc ? docName(doc) : target.docId}
                  </span>
                  <span className="text-muted" style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
                    {target.docId}
                  </span>
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 5, fontSize: 11.5 }}>
                  <span className="text-slate" style={{ fontFamily: "var(--font-mono)" }}>
                    {effectiveFrom === 0 ? "New file" : `Decided v${effectiveFrom}`}
                  </span>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--color-line)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8h9M9 5l3 3-3 3" />
                  </svg>
                  <span className="text-ink" style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                    Current v{target.to}
                  </span>
                  {doc && unreadCount(doc) > 0 && (
                    <span style={{
                      fontSize: 10.5, fontWeight: 600, color: "var(--color-muted)",
                      border: "1px solid var(--color-line-soft)", fontFamily: "var(--font-mono)", padding: "1px 7px",
                    }}>
                      unread
                    </span>
                  )}
                </div>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {/* Combined / Step toggle */}
                <div className="flex gap-[2px] p-[2px]" style={{ background: "var(--color-tertiary)" }}>
                  {(["combined", "step"] as ViewMode[]).map((v) => (
                    <button key={v} onClick={() => setView(v)} style={{
                      fontSize: 11.5, fontWeight: view === v ? 600 : 500, padding: "5px 11px", 
                      background: view === v ? "var(--color-paper)" : "transparent",
                      color: view === v ? "var(--color-ink)" : "var(--color-muted)",
                      boxShadow: view === v ? "0 1px 2px rgba(44,42,39,0.05)" : undefined,
                    }}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>

                <StepActions
                  view={view}
                  target={target}
                  effectiveFrom={effectiveFrom}
                  stepRecord={stepRecords[stepIndex] ?? null}
                  revert={revert}
                  acceptChange={acceptChange}
                  applyDb={applyDb}
                />
              </div>
            </div>

            {/* Diff body */}
            <div className="flex-1 min-h-0 overflow-y-auto text-slate"
              style={{ fontFamily: "var(--font-mono)", fontSize: 13.5, lineHeight: 1.85 }}
            >
              {view === "combined" && (
                <>
                  {diffLoading && <div className="text-muted" style={{ padding: "40px 24px", fontSize: 13 }}>Loading diff…</div>}
                  {!diffLoading && diffError && <div style={{ padding: "40px 24px", fontSize: 13, color: "var(--color-red)" }}>Failed to load diff: {diffError}</div>}
                  {!diffLoading && !diffError && lines.length === 0 && (
                    <div className="text-muted" style={{ padding: "40px 24px", fontSize: 13 }}>No changes detected between these versions.</div>
                  )}
                  {!diffLoading && !diffError && lines.map((line) => <DiffLineRow key={line.num} line={line} />)}
                </>
              )}

              {view === "step" && (
                <>
                  {stepLoading && <div className="text-muted" style={{ padding: "40px 24px", fontSize: 13 }}>Loading change history…</div>}
                  {!stepLoading && stepRecords.length === 0 && (
                    <div className="text-muted" style={{ padding: "40px 24px", fontSize: 13 }}>No step history available for this range.</div>
                  )}
                  {!stepLoading && stepRecords.length > 0 && (
                    <>
                      {/* Step nav bar */}
                      <div className="flex items-center gap-3 border-b border-line bg-surface" style={{ padding: "10px 24px", flexShrink: 0 }}>
                        <button
                          onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                          disabled={stepIndex === 0}
                          className="flex items-center justify-center hover:bg-tertiary disabled:opacity-30 transition-colors"
                          style={{ width: 28, height: 28, border: "1px solid var(--color-line)" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8 2L4 6l4 4" />
                          </svg>
                        </button>
                        <span className="text-slate" style={{ fontSize: 12 }}>
                          Change {stepIndex + 1} of {stepRecords.length}
                          <span className="text-muted" style={{ marginLeft: 8, fontFamily: "var(--font-mono)" }}>
                            v{stepRecords[stepIndex].from} → v{stepRecords[stepIndex].to}
                          </span>
                        </span>
                        <button
                          onClick={() => setStepIndex((i) => Math.min(stepRecords.length - 1, i + 1))}
                          disabled={stepIndex === stepRecords.length - 1}
                          className="flex items-center justify-center hover:bg-tertiary disabled:opacity-30 transition-colors"
                          style={{ width: 28, height: 28, border: "1px solid var(--color-line)" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 2l4 4-4 4" />
                          </svg>
                        </button>
                      </div>
                      {stepLines.length === 0 ? (
                        <div className="text-muted" style={{ padding: "40px 24px", fontSize: 13 }}>No changes in this step.</div>
                      ) : (
                        stepLines.map((line) => <DiffLineRow key={line.num} line={line} />)
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 flex items-center gap-[9px] border-t border-line bg-surface text-muted" style={{ padding: "11px 24px", fontSize: 12 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-muted)" strokeWidth="1.4">
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 7.5v3.5" strokeLinecap="round" />
                <circle cx="8" cy="5" r="0.6" fill="var(--color-muted)" />
              </svg>
              {effectiveFrom === 0
                ? `New file — v${target.to} shown in full. Accept to clear from Changes.`
                : `Changes from v${effectiveFrom} to v${target.to}. Accept keeps current version; Dismiss reverts to v${effectiveFrom}.`
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DiffTarget { docId: string; from: number; to: number; }

function StepActions({
  view,
  target,
  effectiveFrom,
  stepRecord,
  revert,
  acceptChange,
  applyDb,
}: {
  view: ViewMode;
  target: DiffTarget;
  effectiveFrom: number;
  stepRecord: ChangeRecord | null;
  revert: (docId: string, version: number) => Promise<void>;
  acceptChange: (docId: string) => Promise<void>;
  applyDb: (db: import("../lib/types").Db) => void;
}) {
  const isStep = view === "step" && !!stepRecord;
  const dismissTo = isStep ? stepRecord!.from : effectiveFrom;
  const acceptTo  = isStep ? stepRecord!.to  : target.to;

  async function handleAccept() {
    if (acceptTo === target.to) {
      await acceptChange(target.docId);
      useStore.getState().openDoc(target.docId);
    } else {
      const db = await api.decideVersion(target.docId, acceptTo);
      applyDb(db);
    }
  }

  return (
    <>
      {/* Dismiss */}
      {dismissTo > 0 && (
        <button
          onClick={() => revert(target.docId, dismissTo)}
          className="flex items-center gap-[7px] text-slate hover:border-mid hover:bg-surface transition-colors"
          style={{ height: 32, padding: "0 13px", border: "1px solid var(--color-line)",  fontSize: 12.5, fontWeight: 500 }}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3.5 8a5 5 0 1 1 1.5 3.6" />
            <path d="M3.5 12.5V9h3.5" />
          </svg>
          Dismiss
          {isStep && (
            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-muted)", marginLeft: 1 }}>
              → v{dismissTo}
            </span>
          )}
        </button>
      )}

      {/* Accept */}
      <button
        onClick={handleAccept}
        className="flex items-center gap-[7px] transition-colors"
        style={{ height: 32, padding: "0 14px", background: "var(--color-ink)", color: "var(--color-surface)",  fontSize: 12.5, fontWeight: 600 }}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor"
          strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3.5 8.5l3 3 6-7" />
        </svg>
        Accept
        {isStep && (
          <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", opacity: 0.6, marginLeft: 1 }}>
            → v{acceptTo}
          </span>
        )}
      </button>
    </>
  );
}

function DiffLineRow({ line }: { line: DiffLine }) {
  const numStyle: React.CSSProperties = {
    width: 46,
    flexShrink: 0,
    textAlign: "right",
    padding: "2px 12px 2px 0",
    userSelect: "none",
  };

  if (line.kind === "ctx") {
    const empty = line.segments.every((s) => !s.text.trim());
    return (
      <div style={{ display: "flex" }}>
        <span style={{ ...numStyle, color: "var(--color-muted)", background: "var(--color-surface)", borderRight: "1px solid var(--color-line)" }}>
          {line.num}
        </span>
        <span style={{ padding: "2px 18px", color: empty ? "var(--color-muted)" : undefined }}>
          {empty ? " " : line.segments.map((s) => s.text).join(" ")}
        </span>
      </div>
    );
  }

  if (line.kind === "ins") {
    return (
      <div style={{ display: "flex", background: "var(--color-ok-weak)" }}>
        <span style={{ ...numStyle, color: "var(--color-green)", background: "var(--color-ok-weak)", borderRight: "1px solid var(--color-line)" }}>
          {line.num}
        </span>
        <span style={{ padding: "2px 18px", color: "var(--color-ink)" }}>
          <span style={{ color: "var(--color-green)", marginRight: 8 }}>+</span>
          {line.segments.map((s) => s.text).join(" ")}
        </span>
      </div>
    );
  }

  if (line.kind === "del") {
    return (
      <div style={{ display: "flex", background: "var(--color-err-weak)" }}>
        <span style={{ ...numStyle, color: "var(--color-mid)", background: "var(--color-err-weak)", borderRight: "1px solid var(--color-line)" }}>
          {line.num}
        </span>
        <span style={{ padding: "2px 18px", color: "var(--color-ink)" }}>
          <span style={{ color: "var(--color-red)", marginRight: 8 }}>−</span>
          <span style={{ textDecoration: "line-through", textDecorationColor: "var(--color-mid)" }}>
            {line.segments.map((s) => s.text).join(" ")}
          </span>
        </span>
      </div>
    );
  }

  // chg: word-level inline highlights
  return (
    <div style={{ display: "flex", background: "var(--color-tertiary)" }}>
      <span style={{ ...numStyle, color: "var(--color-mid)", background: "var(--color-tertiary)", borderRight: "1px solid var(--color-line)" }}>
        {line.num}
      </span>
      <span style={{ padding: "2px 18px" }}>
        {line.segments.map((seg, i) => {
          if (seg.op === "del") {
            return (
              <span key={i} style={{ background: "var(--color-err-weak)", color: "var(--color-red)", textDecoration: "line-through", padding: "0 2px" }}>
                {seg.text}
              </span>
            );
          }
          if (seg.op === "ins") {
            return (
              <span key={i} style={{ background: "var(--color-ok-weak)", color: "var(--color-green)", padding: "0 2px" }}>
                {seg.text}
              </span>
            );
          }
          return <span key={i}>{seg.text} </span>;
        })}
      </span>
    </div>
  );
}
