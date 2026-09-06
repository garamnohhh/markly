import type { DocEntry } from "../../lib/types";
import { useStore } from "../../store";

export function UpdateNoticeBar({ doc }: { doc: DocEntry }) {
  const readLock = useStore((s) => s.readLockVersion) ?? doc.currentVersion;
  const openDiff = useStore((s) => s.openDiff);
  const markRead = useStore((s) => s.markRead);

  const n = doc.currentVersion - readLock;
  if (n <= 0) return null;

  const isAccepted = doc.lastDecidedVersion >= doc.currentVersion;

  return (
    <div
      style={{
        background: "var(--color-warm-surface)",
        border: "1px solid var(--color-warm-border)",
        borderRadius: "11px",
        padding: "11px 15px",
        marginBottom: "32px",
        display: "flex",
        alignItems: "center",
        gap: "11px",
      }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M8 2.5a3.5 3.5 0 0 0-3.5 3.5c0 3-1.3 4-1.3 4h9.6s-1.3-1-1.3-4A3.5 3.5 0 0 0 8 2.5z"
          fill="var(--color-warm-badge)" stroke="var(--color-warm-mid)" strokeWidth="1.1" strokeLinejoin="round"
        />
        <path d="M6.7 13a1.4 1.4 0 0 0 2.6 0" stroke="var(--color-warm-mid)" strokeWidth="1.1" strokeLinecap="round" />
      </svg>

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        {isAccepted ? (
          <>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-warm-hi)" }}>
              Changes applied to v{doc.currentVersion}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-warm-mid)" }}>
              Still reading v{readLock} · mark as read to dismiss
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-warm-hi)" }}>
              {n} newer version{n > 1 ? "s" : ""} available
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-warm-mid)" }}>
              Reading v{readLock} · latest is v{doc.currentVersion}
            </span>
          </>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        {!isAccepted && (
          <button
            onClick={() => openDiff(doc.docId, readLock, doc.currentVersion)}
            style={{
              height: "30px",
              padding: "0 13px",
              borderRadius: "8px",
              background: "var(--color-gold)",
              color: "var(--color-surface)",
              fontSize: "12.5px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            View changes
          </button>
        )}
        <button
          onClick={() => markRead(doc.docId).then(() => {
            useStore.setState({ readLockVersion: doc.currentVersion });
          })}
          style={{
            height: "30px",
            padding: "0 13px",
            borderRadius: "8px",
            border: "1px solid var(--color-warm-border)",
            background: "none",
            fontSize: "12.5px",
            fontWeight: 500,
            color: "var(--color-warm-mid)",
            cursor: "pointer",
          }}
        >
          Mark as read
        </button>
      </div>
    </div>
  );
}
