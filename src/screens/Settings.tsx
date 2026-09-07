import { useEffect, useState } from "react";
import { LogoTile } from "../components/ui/Logo";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { useStore, formatShortcut, DEFAULT_SHORTCUTS, DEFAULT_TEMPLATES } from "../store";
import type { Template } from "../store";
import type { ShortcutsMap } from "../store";
import { captureMode } from "../lib/captureMode";
import { modalStack } from "../lib/modalStack";

type Tab = "appearance" | "editor" | "tracking" | "account" | "shortcuts" | "templates" | "about";

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  {
    id: "appearance",
    label: "Appearance",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="8" cy="8" r="6" />
        <path d="M5 8.5l2 2 4-4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "editor",
    label: "Editor",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 2.5l2.5 2.5L6 12.5l-3 .5.5-3z" />
      </svg>
    ),
  },
  {
    id: "account",
    label: "Account & Sync",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round">
        <path d="M4 4l4-2 4 2-4 2zM4 4L1 6l3 2 4-2zM12 4l3 2-3 2-4-2zM4 8l4 2 4-2M8 10v3" />
      </svg>
    ),
  },
  {
    id: "tracking",
    label: "Version tracking",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8h3l1.5 2.5L9 4.5 10.5 8H14" />
      </svg>
    ),
  },
  {
    id: "templates",
    label: "Templates",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
        <rect x="2.5" y="2.5" width="11" height="11" rx="1.6" />
        <path d="M2.5 6h11M6 6v7.5" />
      </svg>
    ),
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3">
        <rect x="1.5" y="4" width="13" height="8" rx="1.5" />
        <path d="M4 6.5h.01M6 6.5h.01M8 6.5h.01M10 6.5h.01M4 9h6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 7.5v3.5" strokeLinecap="round" />
        <circle cx="8" cy="5" r="0.6" fill="currentColor" />
      </svg>
    ),
  },
];

export function Settings() {
  const [tab, setTab] = useState<Tab>("appearance");

  return (
    <div className="flex h-full min-h-0">
      {/* Left nav */}
      <nav className="flex shrink-0 flex-col overflow-y-auto border-r border-line bg-surface"
        style={{ width: 269, padding: "16px 12px", gap: 1 }}
      >
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className="flex w-full items-center gap-[10px] text-left transition-colors hover:bg-tertiary"
              style={{
                height: 34,
                padding: "0 11px",
                fontSize: 13.5,
                background: active ? "var(--color-row-active)" : undefined,
                color: active ? "var(--color-ink)" : "var(--color-slate)",
                fontWeight: active ? 500 : 400,
              }}
            >
              <span style={{ color: active ? "var(--color-ink)" : "var(--color-muted)" }}>
                {item.icon}
              </span>
              {item.label}
            </button>
          );
        })}

      </nav>

      {/* Content area */}
      <div className="min-w-0 flex-1 overflow-y-auto bg-paper" style={{ padding: "32px 48px" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {tab === "appearance" && <AppearanceTab />}
          {tab === "editor" && <EditorTab />}
          {tab === "tracking" && <TrackingTab />}
          {tab === "account" && <AccountTab />}
          {tab === "shortcuts" && <ShortcutsTab />}
          {tab === "templates" && <TemplatesTab />}
          {tab === "about" && <AboutTab />}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-mid"
      style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase", marginBottom: 12 }}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  sub,
  children,
  last,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "12px 0", borderBottom: last ? undefined : "1px solid var(--color-line)" }}
    >
      <div style={{ maxWidth: 330 }}>
        <div className="text-ink" style={{ fontSize: 14 }}>{label}</div>
        {sub && (
          <div className="text-mid" style={{ fontSize: 12, marginTop: 2 }}>{sub}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function Choice({
  options,
  value,
  onChange,
}: {
  options: { v: string; l: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      className="flex gap-[2px] p-[2px]"
      style={{ background: "var(--color-line)" }}
    >
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          style={{
            fontSize: 12.5,
            padding: "5px 14px",
            background: value === o.v ? "var(--color-gold)" : "transparent",
            color: value === o.v ? "var(--color-on-accent)" : "var(--color-muted)",
            fontWeight: value === o.v ? 600 : 400,
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (b: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="transition-colors"
      style={{
        display: "flex",
        alignItems: "center",
        width: 42,
        height: 24,
        padding: "0 2px",
        border: on ? "1px solid var(--color-gold)" : "1px solid var(--color-line)",
        background: on ? "var(--color-gold)" : "transparent",
        flexShrink: 0,
      }}
    >
      <span
        className="transition-transform"
        style={{
          width: 18,
          height: 18,
          background: on ? "var(--color-on-accent)" : "var(--color-mid)",
          transform: on ? "translateX(18px)" : undefined,
        }}
      />
    </button>
  );
}

function AppearanceTab() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const width = useStore((s) => s.editorWidth);
  const setWidth = useStore((s) => s.setEditorWidth);
  const sidebarTab = useStore((s) => s.sidebarTab);
  const setSidebarTab = useStore((s) => s.setSidebarTab);
  const showEmpty = useStore((s) => s.showEmptySections);
  const setShowEmpty = useStore((s) => s.setShowEmptySections);

  return (
    <section>
      <div className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        Appearance
      </div>
      <div className="text-muted" style={{ fontSize: 13, marginBottom: 18 }}>
        Personalise the look and feel of Markly.
      </div>
      <Row label="Theme">
        <Choice
          options={[
            { v: "light", l: "Light" },
            { v: "dark", l: "Dark" },
          ]}
          value={theme}
          onChange={(v) => setTheme(v as "light" | "dark")}
        />
      </Row>
      <Row label="Editor width" last>
        <Choice
          options={[
            { v: "normal", l: "Normal" },
            { v: "wide", l: "Wide" },
          ]}
          value={width}
          onChange={(v) => setWidth(v as "normal" | "wide")}
        />
      </Row>

      <div style={{ marginTop: 28 }}>
        <SectionLabel>Sidebar</SectionLabel>
        <Row label="Default mode" sub="Reading Queue, or the classic file tree">
          <Choice
            options={[
              { v: "queue", l: "Reading Queue" },
              { v: "files", l: "Files" },
            ]}
            value={sidebarTab}
            onChange={(v) => setSidebarTab(v as "queue" | "files")}
          />
        </Row>
        <Row label="Always show section titles" sub="Show Unread, Pinned, Tags labels even when empty" last>
          <Toggle on={showEmpty} onChange={setShowEmpty} />
        </Row>
      </div>
    </section>
  );
}

function EditorTab() {
  const tocVisible = useStore((s) => s.tocVisible);
  const toggleToc = useStore((s) => s.toggleToc);

  return (
    <section>
      <div className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>
        Editor
      </div>
      <Row label="Show right outline" sub="Quartz-style TOC">
        <Toggle on={tocVisible} onChange={toggleToc} />
      </Row>
      <Row label="Show syntax while typing" sub="Reveal markdown on the focused line" last>
        <Toggle on={true} onChange={() => {}} />
      </Row>
    </section>
  );
}

function AccountTab() {
  const vaultRoot = useStore((s) => s.vaultRoot);
  const vaults = useStore((s) => s.vaults);
  const openVault = useStore((s) => s.openVault);
  const removeVault = useStore((s) => s.removeVault);
  const [baseModalOpen, setBaseModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!baseModalOpen) return;
    modalStack.push();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); setBaseModalOpen(false); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); modalStack.pop(); };
  }, [baseModalOpen]);

  async function addBase() {
    setError(null);
    const path = await openDialog({ directory: true, multiple: false });
    if (typeof path === "string") {
      try { await openVault(path); setBaseModalOpen(false); }
      catch (e) { setError(String(e)); }
    }
  }

  return (
    <>
    {baseModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(44,42,39,0.32)" }} onClick={() => setBaseModalOpen(false)}>
        <div className=" border border-line bg-paper" style={{ width: 480, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="text-ink" style={{ fontSize: 14, fontWeight: 600 }}>Change Base</span>
            <button onClick={() => setBaseModalOpen(false)} className=" px-2 py-1 text-[12px] text-muted hover:bg-tertiary" style={{ fontFamily: "var(--font-mono)" }}>esc</button>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            {vaults.map((v) => {
              const name = v.split("/").pop() ?? v;
              const active = v === vaultRoot;
              return (
                <div key={v} className="flex items-center gap-3 border" style={{ padding: "10px 14px", borderColor: active ? "var(--color-gold)" : "var(--color-line)", background: active ? "var(--color-accent-weak)" : "var(--color-surface)" }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={active ? "var(--color-gold)" : "var(--color-mid)"} strokeWidth="1.3">
                    <path d="M2 4.4c0-.5.4-.9.9-.9h2.4l1.1 1.3h6.7c.5 0 .9.4.9.9v6.1c0 .5-.4.9-.9.9H2.9c-.5 0-.9-.4-.9-.9z" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-ink" style={{ fontSize: 13, fontWeight: active ? 600 : 400 }}>{name}</div>
                    <div className="text-muted truncate" style={{ fontSize: 11 }}>{v}</div>
                  </div>
                  {active ? (
                    <span className="shrink-0 px-[7px] py-[2px] text-[10.5px] font-semibold" style={{ border: "1px solid var(--color-gold)", color: "var(--color-accent-text)" }}>Active</span>
                  ) : (
                    <div className="flex shrink-0 gap-2">
                      <button onClick={() => openVault(v).then(() => setBaseModalOpen(false)).catch((e) => setError(String(e)))} className=" border border-line px-[9px] py-[4px] text-[12px] text-slate hover:bg-tertiary">Switch</button>
                      <button onClick={() => removeVault(v)} className=" border border-line px-[9px] py-[4px] text-[12px] hover:bg-tertiary" style={{ color: "var(--color-red)" }}>Remove</button>
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addBase} className="flex items-center gap-2 border border-line px-[12px] py-[8px] text-[13px] text-slate hover:bg-tertiary" style={{ marginTop: 4 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
              Add Base
            </button>
            {error && <div className="text-[12px]" style={{ color: "var(--color-red)" }}>{error}</div>}
          </div>
        </div>
      </div>
    )}
    <section>
      <div className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        Account &amp; Sync
      </div>
      <div className="text-muted" style={{ fontSize: 13, marginBottom: 18 }}>
        Markly works fully offline. Your Base is a local folder you own.
      </div>

      <SectionLabel>Base</SectionLabel>
      <div
        className="flex items-center gap-3 border border-line bg-surface"
        style={{ padding: "14px 16px", marginBottom: 10 }}
      >
        <div
          style={{
            width: 38, height: 38,  flexShrink: 0,
            background: "var(--color-tertiary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="var(--color-slate)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 13V6l6-4 6 4v7H2z" />
            <path d="M6 13V9h4v4" />
          </svg>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-ink" style={{ fontSize: 14, fontWeight: 600 }}>Local Base</div>
          <div className="text-muted truncate" style={{ fontSize: 12, marginTop: 2 }}>
            {vaultRoot ?? "No base selected"}
          </div>
        </div>
        <button
          onClick={() => setBaseModalOpen(true)}
          className="border border-line text-slate hover:border-mid transition-colors"
          style={{ fontSize: 12.5, fontWeight: 500,  padding: "6px 12px", flexShrink: 0 }}
        >
          Change Base…
        </button>
      </div>

      <div style={{ marginTop: 28 }}>
        <SectionLabel>Sync</SectionLabel>
        <div
          className="flex items-center justify-between border border-line bg-surface"
          style={{ padding: "14px 16px" }}
        >
          <div>
            <div className="text-ink" style={{ fontSize: 14, fontWeight: 500 }}>Markly Sync</div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>
              End-to-end encrypted multi-device sync
            </div>
          </div>
          <div
            className="border border-line text-slate"
            style={{ fontSize: 12.5, fontWeight: 500,  padding: "6px 14px" }}
          >
            Coming soon
          </div>
        </div>
      </div>
    </section>
    </>
  );
}

function TrackingTab() {
  const acceptChangesOnClose = useStore((s) => s.acceptChangesOnClose);
  const setAcceptChangesOnClose = useStore((s) => s.setAcceptChangesOnClose);
  const markReadOnDocClose = useStore((s) => s.markReadOnDocClose);
  const setMarkReadOnDocClose = useStore((s) => s.setMarkReadOnDocClose);

  return (
    <section>
      <div className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>
        Version Tracking
      </div>
      <Row label="Read lock" sub="Keep the open document on a stable snapshot; never refresh under you">
        <Toggle on={true} onChange={() => {}} />
      </Row>
      <Row label="Word-level diff" sub="Highlight changes word by word">
        <Toggle on={true} onChange={() => {}} />
      </Row>
      <Row label="Accept changes when diff closes" sub="Leaving the Changes screen accepts all reviewed changes automatically">
        <Toggle on={acceptChangesOnClose} onChange={setAcceptChangesOnClose} />
      </Row>
      <Row label="Mark as read when document closes" sub="Navigating away from a document marks it as read" last>
        <Toggle on={markReadOnDocClose} onChange={setMarkReadOnDocClose} />
      </Row>
      <div style={{ marginTop: 24 }}>
        <SectionLabel>AI metadata · optional</SectionLabel>
        <Row
          label="Read sidecar metadata"
          sub="Use .markly/meta/*.json written by AI tools — summaries, topics, importance. Local only, no API calls."
          last
        >
          <Toggle on={true} onChange={() => {}} />
        </Row>
      </div>
    </section>
  );
}

function ShortcutsTab() {
  const shortcuts = useStore((s) => s.shortcuts);
  const setShortcut = useStore((s) => s.setShortcut);
  const [capturing, setCapturing] = useState<keyof ShortcutsMap | null>(null);

  const ROWS: { key: keyof ShortcutsMap; label: string }[] = [
    { key: "palette", label: "Command palette" },
    { key: "editMode", label: "Toggle edit mode" },
    { key: "sidebar", label: "Toggle sidebar" },
    { key: "outline", label: "Toggle outline" },
    { key: "focus", label: "Focus mode (hide both panels)" },
    { key: "related", label: "Related topics" },
    { key: "openRelated", label: "Open doc from Related (⌘O)" },
    { key: "markRead", label: "Mark as read" },
    { key: "goChanges", label: "Go to Changes" },
    { key: "newNote", label: "New note" },
  ];

  useEffect(() => {
    if (!capturing) return;
    captureMode.set(true);

    function onKey(e: KeyboardEvent) {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === "Escape") { setCapturing(null); return; }
      const modifiers = ["Meta", "Shift", "Alt", "Control"];
      if (modifiers.includes(e.key)) return;
      const parts: string[] = [];
      if (e.ctrlKey) parts.push("Ctrl");
      if (e.altKey) parts.push("Alt");
      if (e.shiftKey) parts.push("Shift");
      if (e.metaKey) parts.push("Meta");
      parts.push(e.key);
      setShortcut(capturing!, parts.join("+"));
      setCapturing(null);
    }

    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      captureMode.set(false);
    };
  }, [capturing, setShortcut]);

  return (
    <section>
      <div className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
        Keyboard shortcuts
      </div>
      <div className="text-muted" style={{ fontSize: 12.5, marginBottom: 16 }}>
        Click a shortcut to reassign. Press Esc to cancel.
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {ROWS.map(({ key, label }) => {
          const isCapturing = capturing === key;
          return (
            <div
              key={key}
              className="flex items-center justify-between"
              style={{ padding: "10px 2px", borderBottom: "1px solid var(--color-line)" }}
            >
              <span className="text-ink" style={{ fontSize: 13.5 }}>{label}</span>
              <button
                onClick={() => setCapturing(isCapturing ? null : key)}
                className={` border transition-colors ${
                  isCapturing
                    ? "border-[var(--color-gold)] bg-[color-mix(in_srgb,var(--color-gold)_10%,transparent)] text-[var(--color-gold)]"
                    : "border-line bg-surface text-muted hover:border-[var(--color-mid)] hover:text-ink"
                }`}
                style={{ fontSize: 12, fontFamily: "var(--font-mono)", padding: "4px 12px", minWidth: 64, textAlign: "center" }}
              >
                {isCapturing ? "Press keys…" : formatShortcut(shortcuts[key])}
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => {
          Object.entries(DEFAULT_SHORTCUTS).forEach(([k, v]) =>
            setShortcut(k as keyof ShortcutsMap, v)
          );
        }}
        className="text-muted hover:text-ink transition-colors"
        style={{ fontSize: 12, marginTop: 16 }}
      >
        Reset to defaults
      </button>
    </section>
  );
}

function TemplatesTab() {
  const templates = useStore((s) => s.templates);
  const setTemplates = useStore((s) => s.setTemplates);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Template>({ id: "", name: "", content: "" });

  useEffect(() => {
    if (editingId === null) return;
    modalStack.push();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); setEditingId(null); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { window.removeEventListener("keydown", onKey, true); modalStack.pop(); };
  }, [editingId]);

  function startNew() {
    const t: Template = { id: crypto.randomUUID(), name: "", content: "" };
    setDraft(t);
    setEditingId(t.id);
  }

  function startEdit(t: Template) {
    setDraft({ ...t });
    setEditingId(t.id);
  }

  function save() {
    if (!draft.name.trim()) return;
    const exists = templates.find((t) => t.id === draft.id);
    if (exists) {
      setTemplates(templates.map((t) => t.id === draft.id ? draft : t));
    } else {
      setTemplates([...templates, draft]);
    }
    setEditingId(null);
  }

  function remove(id: string) {
    setTemplates(templates.filter((t) => t.id !== id));
    if (editingId === id) setEditingId(null);
  }

  const editing = editingId !== null;
  const isNew = editingId !== null && !templates.find((t) => t.id === editingId);

  return (
    <section>
      <div className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>Templates</div>
      <div className="text-muted" style={{ fontSize: 13, marginBottom: 20 }}>
        Templates are reusable note starters. Use <code style={{ fontSize: 12, background: "var(--color-tertiary)",  padding: "1px 5px" }}>{"{{tplDate}}"}</code>, <code style={{ fontSize: 12, background: "var(--color-tertiary)",  padding: "1px 5px" }}>{"{{tplTime}}"}</code>, <code style={{ fontSize: 12, background: "var(--color-tertiary)",  padding: "1px 5px" }}>{"{{tplTitle}}"}</code> as variables.
      </div>

      {editing ? (
        <div className=" border border-line bg-surface" style={{ padding: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>Name</div>
            <input
              autoFocus
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="e.g. Weekly Review"
              className="w-full border border-line bg-paper px-3 py-2 text-[13.5px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
              onKeyDown={(e) => e.stopPropagation()}
            />
          </div>
          <div>
            <div className="text-muted" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 5 }}>Content</div>
            <textarea
              value={draft.content}
              onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
              placeholder={"## Notes\n\n"}
              rows={10}
              className="w-full border border-line bg-paper px-3 py-2 text-[13px] font-mono text-ink focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)] resize-none"
              onKeyDown={(e) => e.stopPropagation()}
              style={{ lineHeight: 1.6 }}
            />
          </div>
          <div className="flex justify-between" style={{ marginTop: 12 }}>
            {!isNew && (
              <button onClick={() => remove(draft.id)} className="text-[12.5px] hover:opacity-80" style={{ color: "var(--color-red)" }}>Delete template</button>
            )}
            <div className="ml-auto flex gap-2">
              <button onClick={() => setEditingId(null)} className=" border border-line px-3 py-[6px] text-[12.5px] text-slate hover:bg-tertiary">Cancel</button>
              <button
                onClick={save}
                disabled={!draft.name.trim()}
                className=" px-3 py-[6px] text-[12.5px] font-medium hover:opacity-90 disabled:opacity-40"
                style={{ background: "var(--color-ink)", color: "var(--color-surface)" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => startEdit(t)}
                className="flex w-full items-center gap-3 border border-line bg-surface px-4 text-left hover:bg-tertiary transition-colors"
                style={{ minHeight: 52, padding: "10px 14px" }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="var(--color-mid)" strokeWidth="1.4" strokeLinecap="round">
                  <rect x="2.5" y="2.5" width="11" height="11" rx="1.6" />
                  <path d="M2.5 6h11M6 6v7.5" />
                </svg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="text-ink" style={{ fontSize: 13.5, fontWeight: 500 }}>{t.name}</div>
                  <div className="text-muted truncate" style={{ fontSize: 12, marginTop: 1 }}>{t.content.slice(0, 60).replace(/\n/g, " ") || "No content"}</div>
                </div>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="var(--color-muted)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 2.5l2.5 2.5L6 12.5l-3 .5.5-3z" />
                </svg>
              </button>
            ))}
          </div>
          <button
            onClick={startNew}
            className="mt-3 flex items-center gap-2 border border-line px-[12px] py-[8px] text-[13px] text-slate hover:bg-tertiary"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2v8M2 6h8" /></svg>
            New template
          </button>
          <button
            onClick={() => setTemplates(DEFAULT_TEMPLATES)}
            className="mt-2 text-[12px] text-muted hover:text-ink transition-colors"
          >
            Reset to defaults
          </button>
        </>
      )}
    </section>
  );
}

function AboutTab() {
  return (
    <section>
      <div className="text-ink" style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>
        About
      </div>
      <div
        className="flex items-center gap-[14px] border border-line bg-surface"
        style={{ padding: 16 }}
      >
        {/* The one screen that carries the full 128px tile (handoff, 16 · 설정 — 정보). */}
        <LogoTile size={128} />
        <div style={{ flex: 1 }}>
          <div className="text-ink" style={{ fontSize: 15, fontWeight: 600 }}>
            Markly{" "}
            <span className="text-mid" style={{ fontWeight: 400 }}>1.0.0</span>
          </div>
          <div className="text-muted" style={{ fontSize: 12.5, marginTop: 2 }}>
            Local-first markdown reader
          </div>
          <div className="text-muted" style={{ fontSize: 12, marginTop: 4 }}>
            Created by Garam · © 2026 Markly. All rights reserved.
          </div>
        </div>
        <div className="flex gap-2">
          {["Release notes", "Check for updates"].map((label) => (
            <button
              key={label}
              className="border border-line text-slate"
              style={{ fontSize: 12.5, fontWeight: 500,  padding: "7px 12px" }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
