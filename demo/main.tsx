import React from "react";
import ReactDOM from "react-dom/client";
import { DOCS, NON_MD, DIRS, VAULT_ROOT, BODY, DECK, CSV } from "./sample";

// ── Tauri stand-in ────────────────────────────────────────────────────────────
// The app talks to Rust through window.__TAURI_INTERNALS__.invoke. Filling that
// in is the whole trick: every component below is the app's own, unmodified.
const docs: Record<string, unknown> = {};
for (const d of DOCS) docs[d.docId] = d;
const db = {
  version: 1,
  docs,
  settings: {
    scanOnStartup: true, readLock: false, wordLevelDiff: true,
    acceptChangesOnClose: false, markReadOnDocClose: true,
  },
};

const b64 = (s: string) => btoa(unescape(encodeURIComponent(s)));

const handlers: Record<string, (a: Record<string, string>) => unknown> = {
  scan_vault: () => db,
  read_doc: (a) => ({ content: BODY, meta: docs[a.docId] ?? DOCS[0] }),
  write_doc: () => db,
  mark_read: () => db,
  list_updates: () => DOCS.filter((d) => d.currentVersion > d.lastDecidedVersion),
  diff: () => ({
    from: 4, to: 7,
    ops: [{ op: "eq", text: "처마 밑이 아니라 " }, { op: "del", text: "담장 옆" },
          { op: "ins", text: "마당 한가운데" }, { op: "eq", text: "로 옮겼다." }],
    stats: { additions: 1, deletions: 1 },
  }),
  list_changes: () => [],
  revert: () => db,
  create_doc: () => db,
  create_folder: () => db,
  rename_doc: () => db,
  delete_doc: () => db,
  accept_change: () => db,
  decide_version: () => db,
  list_files: () => NON_MD,
  list_dirs: () => DIRS,
  read_raw_file: (a) =>
    b64(a.relPath?.endsWith(".csv") ? CSV : a.relPath?.endsWith(".html") ? DECK : "sample"),
  write_raw_file: () => null,
  rename_raw_file: () => null,
  delete_raw_file: () => null,
};

let cbId = 1;
type W = Window & {
  __TAURI_INTERNALS__?: unknown;
  __TAURI_EVENT_PLUGIN_INTERNALS__?: unknown;
  __ms?: { getState: () => Record<string, (...a: unknown[]) => unknown> };
};
const w = window as W;

w.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener: () => Promise.resolve() };
w.__TAURI_INTERNALS__ = {
  metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main", windowLabel: "main" } },
  transformCallback(cb: unknown) { const id = cbId++; (w as unknown as Record<string, unknown>)["_" + id] = cb; return id; },
  convertFileSrc: (p: string) => p,
  invoke(cmd: string, args: Record<string, string>) {
    if (cmd.startsWith("plugin:")) return Promise.resolve(0);
    const h = handlers[cmd];
    if (!h) return Promise.resolve(null);
    try { return Promise.resolve(h(args || {})); } catch (e) { return Promise.reject(e); }
  },
};

try {
  localStorage.setItem("markly", JSON.stringify({
    state: {
      theme: "dark", vaultRoot: VAULT_ROOT, vaults: [VAULT_ROOT],
      editorWidth: "normal", acceptChangesOnClose: false, markReadOnDocClose: true,
      expandedFolders: ["Field Notes", "Reading", "Workshop"],
      sidebarVisible: true, tocVisible: false, focusMode: false,
      showEmptySections: false,
    },
    version: 0,
  }));
} catch { /* private window */ }

// ── the app itself, untouched ────────────────────────────────────────────────
// Imported dynamically, not with a static import: the store reads localStorage
// the moment its module runs, and a static import is hoisted above the setup
// above — the app came up on the first-run screen every time.
import "katex/dist/katex.min.css";
import "./styles.css";

async function boot() {
  const { default: App } = await import("../src/App");
  const { Picker } = await import("./Picker");

  ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );

  // A separate root, so the picker can never end up inside the app's tree.
  const rail = document.createElement("div");
  document.body.appendChild(rail);
  ReactDOM.createRoot(rail).render(<Picker />);
}

void boot();
