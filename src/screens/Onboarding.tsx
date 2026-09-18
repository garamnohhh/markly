import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { useStore } from "../store";
import { Wordmark } from "../components/ui/Logo";

export function Onboarding() {
  const openVault = useStore((s) => s.openVault);
  const removeVault = useStore((s) => s.removeVault);
  const vaults = useStore((s) => s.vaults);
  const scanning = useStore((s) => s.scanning);
  const [error, setError] = useState<string | null>(null);

  async function chooseBase(_mode: "new" | "open") {
    setError(null);
    const path = await open({ directory: true, multiple: false });
    if (typeof path !== "string") return;
    try {
      await openVault(path);
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div
      className="grid h-full place-items-center"
      style={{ background: "var(--color-paper)" }}
    >
      <div
        style={{
          width: 560,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 40px",
        }}
      >
        {/* The wordmark is the title here — screen 17 has no separate heading.
            Typeset, never an image (assets/snippets.md). */}
        <div className="mb-[10px]">
          <Wordmark size={44} />
        </div>
        <p
          style={{
            fontSize: 14,
            color: "var(--color-muted)",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          Create your first Base — where your notes, bookmarks, and documents
          live.
        </p>

        {/* Two cards */}
        <div className="flex gap-4 w-full mb-[26px]">
          {/* New Base (dark) */}
          <button
            onClick={() => chooseBase("new")}
            disabled={scanning}
            className="flex-1 text-left p-[22px_20px] border border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors disabled:opacity-50"
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "var(--color-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="var(--color-surface)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 5.2c0-.7.5-1.2 1.2-1.2h3l1.4 1.6h6.2c.7 0 1.2.5 1.2 1.2V13c0 .7-.5 1.2-1.2 1.2H3.2C2.5 14.2 2 13.7 2 13z" />
                <path d="M9 8.2v3.2M7.4 9.8h3.2" />
              </svg>
            </div>
            <div
              style={{ fontSize: 15, fontWeight: 600, color: "var(--color-ink)", marginBottom: 5 }}
            >
              New Base
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.55 }}>
              Create an empty folder and set it as a pirep Base.
            </div>
          </button>

          {/* Open existing (light) */}
          <button
            onClick={() => chooseBase("open")}
            disabled={scanning}
            className="flex-1 text-left p-[22px_20px] border border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-ink)] hover:bg-[var(--color-paper)] transition-colors disabled:opacity-50"
          >
            <div
              style={{
                width: 38,
                height: 38,
                background: "var(--color-tertiary)",
                border: "1px solid var(--color-line)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 18 18"
                fill="none"
                stroke="var(--color-slate)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 5.2c0-.7.5-1.2 1.2-1.2h3l1.4 1.6h6.2c.7 0 1.2.5 1.2 1.2V13c0 .7-.5 1.2-1.2 1.2H3.2C2.5 14.2 2 13.7 2 13z" />
              </svg>
            </div>
            <div
              style={{ fontSize: 15, fontWeight: 600, color: "var(--color-ink)", marginBottom: 5 }}
            >
              Open existing folder
            </div>
            <div style={{ fontSize: 12.5, color: "var(--color-muted)", lineHeight: 1.55 }}>
              Open a folder that already contains markdown.
            </div>
          </button>
        </div>

        {/* Recent Bases section */}
        <div className="w-full mb-[22px]">
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.13em",
              color: "var(--color-mid)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Recent Bases
          </div>
          {vaults.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                height: 46,
                border: "1px dashed var(--color-line)",
                padding: "0 16px",
                color: "var(--color-mid)",
                fontSize: 12.5,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-line)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 7L8 2.5 13.5 7M4 6.2v7.3h8V6.2" />
              </svg>
              No Bases yet — create one above to get started.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {vaults.map((v) => {
                const name = v.split("/").pop() ?? v;
                return (
                  <div key={v} className="group flex items-center gap-[10px] border border-[var(--color-line)] hover:border-[var(--color-ink)]" style={{ padding: "0 14px", height: 46 }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-muted)" strokeWidth="1.3">
                      <path d="M2 4.4c0-.5.4-.9.9-.9h2.4l1.1 1.3h6.7c.5 0 .9.4.9.9v6.1c0 .5-.4.9-.9.9H2.9c-.5 0-.9-.4-.9-.9z" />
                    </svg>
                    <button
                      onClick={() => !scanning && openVault(v).catch((e) => setError(String(e)))}
                      disabled={scanning}
                      className="min-w-0 flex-1 truncate text-left"
                      style={{ fontSize: 13.5, fontWeight: 500, color: "var(--color-ink)" }}
                    >
                      {name}
                    </button>
                    <span className="truncate text-[11.5px]" style={{ color: "var(--color-mid)", maxWidth: 180 }}>{v}</span>
                    <button
                      onClick={() => removeVault(v)}
                      className="hidden shrink-0 rounded p-[3px] text-[var(--color-mid)] hover:text-[var(--color-red)] group-hover:block"
                      title="Remove from list"
                    >
                      <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                        <path d="M2 2l8 8M10 2l-8 8" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <p
          style={{
            fontSize: 11.5,
            color: "var(--color-mid)",
            fontFamily: "var(--font-mono)",
            textAlign: "center",
          }}
        >
          You can change your Base anytime in Settings › Base.
        </p>

        {scanning && (
          <p style={{ marginTop: 16, fontSize: 13, color: "var(--color-muted)" }}>
            Scanning…
          </p>
        )}
        {error && (
          <p style={{ marginTop: 12, fontSize: 13, color: "var(--color-red)" }}>{error}</p>
        )}
      </div>
    </div>
  );
}
