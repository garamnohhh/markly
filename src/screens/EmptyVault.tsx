import { useStore, useDocs } from "../store";
import { api } from "../lib/invoke";
import { docName } from "../lib/types";

export function EmptyVault() {
  const docs = useDocs();
  const s = useStore.getState;

  async function createNote() {
    const name = window.prompt("New note filename (e.g. ideas.md)");
    if (!name) return;
    const rel = name.endsWith(".md") ? name : `${name}.md`;
    const db = await api.createDoc(rel, `# ${rel.replace(/\.md$/i, "")}\n\n`);
    s().applyDb(db);
    s().openDoc(rel.toLowerCase());
    s().setMode("edit");
  }

  const recent = docs.slice(0, 3);

  return (
    <div
      className="flex h-full flex-col items-center justify-center"
      style={{ background: "var(--color-paper)", padding: "0 40px" }}
    >
      {/* Icon */}
      <div
        style={{
          width: 46,
          height: 46,
          border: "1.5px solid var(--color-line)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 20,
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="none"
          stroke="var(--color-mid)"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M8 3.5v9M3.5 8h9" />
        </svg>
      </div>

      <div
        style={{
          fontSize: 17,
          fontWeight: 600,
          color: "var(--color-line)",
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        Select a note or create one
      </div>
      <div
        style={{
          fontSize: 13.5,
          color: "var(--color-muted)",
          marginBottom: 24,
          textAlign: "center",
          lineHeight: 1.6,
        }}
      >
        Pick a note on the left, or start right below.
      </div>

      {/* Actions */}
      <div className="flex gap-[10px] mb-[26px]">
        <button
          onClick={createNote}
          className="flex items-center gap-[7px] hover:bg-[var(--color-ink)] transition-colors"
          style={{
            height: 38,
            padding: "0 18px",
            background: "var(--color-ink)",
            color: "var(--color-surface)",
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          New note
        </button>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            height: 38,
            padding: "0 18px",
            background: "var(--color-paper)",
            border: "1px solid var(--color-line)",
            color: "var(--color-line)",
            fontSize: 13.5,
            fontWeight: 500,
          }}
        >
          Import
        </button>
      </div>

      {/* Recent chips */}
      {recent.length > 0 && (
        <div className="flex gap-[7px] flex-wrap justify-center">
          {recent.map((d) => (
            <button
              key={d.docId}
              onClick={() => s().openDoc(d.docId)}
              style={{
                fontSize: 12,
                color: "var(--color-muted)",
                background: "var(--color-tertiary)",
                padding: "5px 11px",
              }}
            >
              {docName(d)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
