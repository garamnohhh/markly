import type { DocEntry } from "../../lib/types";
import { useStore } from "../../store";

// Callout, accent tone. The handoff's 23 · 면색 is explicit: a callout does not
// paint its face — the surface stays --surface and a 3px left bar carries the
// tone. --accent-weak is for selected rows only, never for a banner.
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
        background: "var(--color-surface)",
        border: "1px solid var(--color-line)",
        borderLeft: "3px solid var(--color-gold)",
        padding: "12px 16px",
        marginBottom: "32px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        {isAccepted ? (
          <>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink)" }}>
              Changes applied to v{doc.currentVersion}
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
              Still reading v{readLock} · mark as read to dismiss
            </span>
          </>
        ) : (
          <>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink)" }}>
              {n} newer version{n > 1 ? "s" : ""} available
            </span>
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
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
              height: "32px",
              padding: "0 12px",
              background: "var(--color-gold)",
              border: "1px solid var(--color-gold)",
              color: "var(--color-on-accent)",
              fontSize: "12.5px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Compare
          </button>
        )}
        <button
          onClick={() => markRead(doc.docId).then(() => {
            useStore.setState({ readLockVersion: doc.currentVersion });
          })}
          style={{
            height: "32px",
            padding: "0 12px",
            border: "1px solid var(--color-line)",
            background: "var(--color-surface)",
            fontSize: "12.5px",
            fontWeight: 600,
            color: "var(--color-ink)",
            cursor: "pointer",
          }}
        >
          Read
        </button>
      </div>
    </div>
  );
}
