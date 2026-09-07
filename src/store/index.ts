import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { api } from "../lib/invoke";
import { slugify } from "../lib/markdown";
import { resolveWiki } from "../lib/wiki";
import type { Db, DocEntry } from "../lib/types";

export type Theme = "light" | "dark";
export type SidebarTab = "queue" | "files";
export type View = "onboarding" | "inbox" | "reader" | "file-viewer" | "diff" | "settings" | "tag-results" | "rabbit-hole";
export type Mode = "read" | "edit";

export interface ShortcutsMap {
  sidebar: string;
  outline: string;
  focus: string;
  editMode: string;
  palette: string;
  related: string;
  markRead: string;
  goChanges: string;
  newNote: string;
  openRelated: string;
}

export const DEFAULT_SHORTCUTS: ShortcutsMap = {
  sidebar: "Meta+\\",
  outline: "Meta+Shift+\\",
  focus: "Meta+.",
  editMode: "Meta+e",
  palette: "Meta+k",
  related: "Meta+r",
  markRead: "Meta+Shift+r",
  goChanges: "Meta+u",
  newNote: "Meta+n",
  openRelated: "Meta+o",
};

export function matchShortcut(e: KeyboardEvent, combo: string | undefined): boolean {
  if (!combo) return false;
  const parts = combo.split("+");
  const key = parts[parts.length - 1];
  return (
    e.key === key &&
    e.metaKey === parts.includes("Meta") &&
    e.shiftKey === parts.includes("Shift") &&
    e.altKey === parts.includes("Alt") &&
    e.ctrlKey === parts.includes("Ctrl")
  );
}

// One glyph per key, in the order the design system's Kbd rows print them.
export function shortcutKeys(combo: string): string[] {
  const parts = combo.split("+");
  const key = parts[parts.length - 1];
  return [
    parts.includes("Ctrl") ? "⌃" : "",
    parts.includes("Alt") ? "⌥" : "",
    parts.includes("Shift") ? "⇧" : "",
    parts.includes("Meta") ? "⌘" : "",
    key.length === 1 ? key.toUpperCase() : key,
  ].filter(Boolean);
}

export function formatShortcut(combo: string): string {
  return shortcutKeys(combo).join("");
}

export interface Template {
  id: string;
  name: string;
  content: string;
}

export const DEFAULT_TEMPLATES: Template[] = [
  { id: "meeting", name: "Meeting Notes", content: "**Date:** \n**Attendees:** \n\n## Agenda\n\n## Notes\n\n## Action Items\n\n" },
  { id: "book", name: "Book Notes", content: "**Title:** \n**Author:** \n\n## Summary\n\n## Key Takeaways\n\n## Quotes\n\n" },
];

interface DiffTarget {
  docId: string;
  from: number;
  to: number;
}

export type EditorWidth = "normal" | "wide";

interface AppState {
  // persisted
  theme: Theme;
  vaultRoot: string | null;
  vaults: string[];
  editorWidth: EditorWidth;
  acceptChangesOnClose: boolean;
  markReadOnDocClose: boolean;
  expandedFolders: string[];
  sidebarWidth: number;
  tocWidth: number;
  showEmptySections: boolean;
  shortcuts: ShortcutsMap;
  templates: Template[];
  // vault data
  db: Db | null;
  scanning: boolean;
  nonMdFiles: string[];
  allDirs: string[];
  // navigation / reader
  view: View;
  previousView: View | null;
  openDocId: string | null;
  openFilePath: string | null;
  fileEditMode: boolean;
  mode: Mode;
  readLockVersion: number | null;
  diffTarget: DiffTarget | null;
  rabbitTrail: string[];
  pendingScrollSlug: string | null; // heading to land on after a wiki #section jump
  // shell
  sidebarVisible: boolean;
  // Hides both side panels at once without forgetting their own toggles, so
  // leaving focus mode puts the layout back exactly as it was.
  focusMode: boolean;
  sidebarTab: SidebarTab;
  tocVisible: boolean;
  cmdPaletteOpen: boolean;
  findOpen: boolean;
  relatedOpen: boolean;
  relatedSelectedDocId: string | null;
  activeTag: string | null;
  activeFolderFilter: string | null;

  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setEditorWidth: (w: EditorWidth) => void;
  setAcceptChangesOnClose: (b: boolean) => void;
  setMarkReadOnDocClose: (b: boolean) => void;
  setView: (v: View) => void;
  goChanges: () => void;
  goBack: () => void;
  toggleSidebar: () => void;
  toggleFocus: () => void;
  setSidebarTab: (t: SidebarTab) => void;
  toggleToc: () => void;
  setCmdPalette: (open: boolean) => void;
  setFindOpen: (open: boolean) => void;
  toggleRelated: () => void;
  setRelatedSelectedDocId: (id: string | null) => void;
  setShortcut: (key: keyof ShortcutsMap, combo: string) => void;
  setTemplates: (t: Template[]) => void;
  newNote: () => Promise<void>;
  createFileAt: (dir: string, name: string) => Promise<void>;
  createFolderAt: (dir: string, name: string) => Promise<void>;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
  openTag: (tag: string) => void;
  setFolderFilter: (path: string | null) => void;
  toggleFolder: (path: string) => void;
  setSidebarWidth: (w: number) => void;
  setTocWidth: (w: number) => void;
  setShowEmptySections: (v: boolean) => void;

  goRabbitHole: (docId: string) => void;
  rabbitHolePush: (docId: string) => void;
  rabbitHoleBack: () => void;

  openVault: (path: string) => Promise<void>;
  clearVault: () => void;
  removeVault: (path: string) => void;
  rescan: () => Promise<void>;
  openDoc: (docId: string) => void;
  followWikiLink: (raw: string) => Promise<void>;
  openFile: (relPath: string) => void;
  toggleFileEditMode: () => void;
  loadNonMdFiles: () => Promise<void>;
  goInbox: () => void;
  openDiff: (docId: string, from: number, to: number) => void;
  markRead: (docId: string) => Promise<void>;
  acceptChange: (docId: string) => Promise<void>;
  revert: (docId: string, version: number) => Promise<void>;
  applyDb: (db: Db) => void;
}

const docsList = (db: Db | null): DocEntry[] =>
  db ? Object.values(db.docs) : [];

function _build() { return create<AppState>()(
  persist(
    (set, get) => ({
      theme: "dark",
      vaultRoot: null,
      vaults: [],
      editorWidth: "normal",
      acceptChangesOnClose: false,
      markReadOnDocClose: false,
      expandedFolders: [],
      sidebarWidth: 269,
      tocWidth: 269,
      showEmptySections: true,
      shortcuts: DEFAULT_SHORTCUTS,
      templates: DEFAULT_TEMPLATES,
      db: null,
      scanning: false,
      nonMdFiles: [],
      allDirs: [],
      view: "onboarding",
      previousView: null,
      openDocId: null,
      openFilePath: null,
      fileEditMode: false,
      mode: "read",
      readLockVersion: null,
      diffTarget: null,
      rabbitTrail: [],
      pendingScrollSlug: null,
      sidebarVisible: true,
      focusMode: false,
      sidebarTab: "queue",
      tocVisible: true,
      cmdPaletteOpen: false,
      findOpen: false,
      relatedOpen: false,
      relatedSelectedDocId: null,
      activeTag: null,
      activeFolderFilter: null,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      setEditorWidth: (editorWidth) => set({ editorWidth }),
      setAcceptChangesOnClose: (acceptChangesOnClose) => set({ acceptChangesOnClose }),
      setMarkReadOnDocClose: (markReadOnDocClose) => set({ markReadOnDocClose }),
      setView: (view) => {
        const current = get().view;
        if (view === "settings" && current !== "settings") {
          set({ view, previousView: current });
        } else {
          set({ view });
        }
      },
      goBack: () => {
        const prev = get().previousView;
        set({ view: prev ?? "inbox", previousView: null });
      },
      toggleSidebar: () => set((s) => ({ sidebarVisible: !s.sidebarVisible })),
      toggleFocus: () => set((s) => ({ focusMode: !s.focusMode })),
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      toggleToc: () => set((s) => ({ tocVisible: !s.tocVisible })),
      setCmdPalette: (cmdPaletteOpen) => set({ cmdPaletteOpen }),
      setFindOpen: (findOpen) => set({ findOpen }),
      toggleRelated: () => set((s) => ({ relatedOpen: !s.relatedOpen, relatedSelectedDocId: null })),
      setRelatedSelectedDocId: (relatedSelectedDocId) => set({ relatedSelectedDocId }),
      setShortcut: (key, combo) =>
        set((s) => ({ shortcuts: { ...s.shortcuts, [key]: combo } })),
      setTemplates: (templates) => set({ templates }),
      newNote: async () => {
        const now = new Date();
        const p = (n: number) => String(n).padStart(2, "0");
        const name = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}.md`;
        try {
          const db = await api.createDoc(name, "");
          set({ db });
          const docId = Object.keys(db.docs).find((k) => k.endsWith(name.toLowerCase())) ?? name.toLowerCase();
          get().openDoc(docId);
          set({ mode: "edit" });
        } catch (e) {
          console.error("newNote failed:", e);
        }
      },
      // Create a file/folder at a chosen directory (dir = "" means vault root).
      // Names are sanitized; file defaults to .md when no extension is given.
      createFileAt: async (dir, rawName) => {
        const name = rawName.trim().replace(/^\/+|\/+$/g, "");
        if (!name || /[\\]/.test(name)) return;
        const fname = /\.[^./]+$/.test(name) ? name : `${name}.md`;
        const rel = dir ? `${dir.replace(/\/+$/, "")}/${fname}` : fname;
        try {
          const db = await api.createDoc(rel, "");
          set({ db });
          await get().loadNonMdFiles();
          const id = rel.toLowerCase();
          const docId = db.docs[id] ? id : Object.keys(db.docs).find((k) => k.endsWith(fname.toLowerCase())) ?? id;
          get().openDoc(docId);
          set({ mode: "edit" });
        } catch (e) {
          console.error("createFileAt failed:", e);
        }
      },
      createFolderAt: async (dir, rawName) => {
        const name = rawName.trim().replace(/^\/+|\/+$/g, "");
        if (!name || /[\\]/.test(name)) return;
        const rel = dir ? `${dir.replace(/\/+$/, "")}/${name}` : name;
        try {
          const db = await api.createFolder(rel);
          set({ db });
          await get().loadNonMdFiles();
          set((s) => ({
            expandedFolders: s.expandedFolders.includes(rel) ? s.expandedFolders : [...s.expandedFolders, rel],
          }));
        } catch (e) {
          console.error("createFolderAt failed:", e);
        }
      },
      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set((s) => ({ mode: s.mode === "read" ? "edit" : "read" })),
      openTag: (tag) => {
        const current = get().view;
        set({ activeTag: tag, view: "tag-results", previousView: current });
      },
      setFolderFilter: (activeFolderFilter) => set({ activeFolderFilter }),
      toggleFolder: (path) =>
        set((s) => ({
          expandedFolders: s.expandedFolders.includes(path)
            ? s.expandedFolders.filter((p) => p !== path)
            : [...s.expandedFolders, path],
        })),
      setSidebarWidth: (w) =>
        set({ sidebarWidth: Math.min(380, Math.max(212, w)) }),
      setTocWidth: (w) =>
        set({ tocWidth: Math.min(360, Math.max(212, w)) }),
      setShowEmptySections: (showEmptySections) => set({ showEmptySections }),

      applyDb: (db) => set({ db }),

      loadNonMdFiles: async () => {
        try {
          const [files, dirs] = await Promise.all([api.listFiles(), api.listDirs()]);
          set({ nonMdFiles: files, allDirs: dirs });
        } catch { /* silent */ }
      },

      openVault: async (path) => {
        set({ scanning: true });
        try {
          const db = await api.scanVault(path);
          set((s) => ({
            db,
            vaultRoot: path,
            vaults: s.vaults.includes(path) ? s.vaults : [path, ...s.vaults],
            scanning: false,
            view: docsList(db).length ? "inbox" : "onboarding",
            openDocId: null,
            openFilePath: null,
          }));
          await get().loadNonMdFiles();
        } catch (e) {
          set({ scanning: false });
          throw e;
        }
      },

      clearVault: () =>
        set({ vaultRoot: null, db: null, view: "onboarding", openDocId: null }),

      removeVault: (path) =>
        set((s) => ({
          vaults: s.vaults.filter((v) => v !== path),
          ...(s.vaultRoot === path
            ? { vaultRoot: null, db: null, view: "onboarding" as View, openDocId: null }
            : {}),
        })),

      rescan: async () => {
        const root = get().vaultRoot;
        if (!root) return;
        set({ scanning: true });
        try {
          const db = await api.scanVault(root);
          set({ db });
          await get().loadNonMdFiles();
        } finally {
          set({ scanning: false });
        }
      },

      openDoc: (docId) => {
        const doc = get().db?.docs[docId];
        set({
          openDocId: docId,
          openFilePath: null,
          view: "reader",
          mode: "read",
          readLockVersion: doc?.lastReadVersion ?? doc?.currentVersion ?? null,
          relatedOpen: false,
        });
      },

      followWikiLink: async (raw) => {
        const [targetRaw, headingRaw] = raw.split("#");
        const target = targetRaw.trim();
        const slug = headingRaw?.trim() ? slugify(headingRaw.trim()) : null;
        const s = get();
        if (!s.db || !target) return;

        const hit = resolveWiki(s.db, target, s.openDocId ?? undefined);
        if (hit) {
          set({ pendingScrollSlug: slug });
          get().openDoc(hit);
          return;
        }

        // Not found → create in the current doc's folder (Obsidian-style).
        const cur = s.openDocId;
        const curDir = cur && cur.includes("/") ? cur.slice(0, cur.lastIndexOf("/")) : "";
        let rel = target.replace(/^\/+/, "");
        if (!/\.md$/i.test(rel)) rel += ".md";
        if (curDir && !rel.includes("/")) rel = `${curDir}/${rel}`;
        try {
          const db = await api.createDoc(rel, "");
          set({ db, pendingScrollSlug: slug });
          get().openDoc(rel.toLowerCase());
          set({ mode: "edit" });
        } catch (e) {
          console.error("wiki create failed:", e);
        }
      },

      openFile: (relPath) => {
        set({ openFilePath: relPath, openDocId: null, view: "file-viewer", fileEditMode: false });
      },

      toggleFileEditMode: () => set((s) => ({ fileEditMode: !s.fileEditMode })),

      goInbox: () => set({ view: "inbox", openDocId: null }),

      goChanges: () => {
        const current = get().view;
        set({ view: "diff", diffTarget: null, previousView: current });
      },

      goRabbitHole: (docId) => {
        const current = get().view;
        set({ view: "rabbit-hole", rabbitTrail: [docId], previousView: current });
      },
      rabbitHolePush: (docId) =>
        set((s) => ({ rabbitTrail: [...s.rabbitTrail, docId] })),
      rabbitHoleBack: () => {
        const { rabbitTrail } = get();
        if (rabbitTrail.length <= 1) {
          if (rabbitTrail[0]) get().openDoc(rabbitTrail[0]);
          return;
        }
        set({ rabbitTrail: rabbitTrail.slice(0, -1) });
      },

      openDiff: (docId, from, to) => {
        const current = get().view;
        set({ diffTarget: { docId, from, to }, view: "diff", previousView: current });
      },

      markRead: async (docId) => {
        const db = await api.markRead(docId);
        set({ db });
      },

      acceptChange: async (docId) => {
        const db = await api.acceptChange(docId);
        set({ db });
      },

      revert: async (docId, version) => {
        const db = await api.revert(docId, version);
        const doc = db.docs[docId];
        set({
          db,
          view: "reader",
          openDocId: docId,
          mode: "read",
          readLockVersion: doc?.currentVersion ?? null,
        });
      },
    }),
    {
      name: "markly",
      partialize: (s) => ({
        theme: s.theme,
        vaultRoot: s.vaultRoot,
        vaults: s.vaults,
        editorWidth: s.editorWidth,
        acceptChangesOnClose: s.acceptChangesOnClose,
        markReadOnDocClose: s.markReadOnDocClose,
        expandedFolders: s.expandedFolders,
        sidebarVisible: s.sidebarVisible,
        tocVisible: s.tocVisible,
        focusMode: s.focusMode,
        sidebarWidth: s.sidebarWidth,
        tocWidth: s.tocWidth,
        showEmptySections: s.showEmptySections,
        shortcuts: s.shortcuts,
        templates: s.templates,
      }),
      // Merge persisted shortcuts with defaults so new keys are never undefined.
      merge: (persisted, current) => {
        const p = persisted as Partial<AppState>;
        const vaults = p.vaults ?? [];
        const root = p.vaultRoot ?? null;
        return {
          ...current,
          ...p,
          vaults: root && !vaults.includes(root) ? [root, ...vaults] : vaults,
          // Panel columns are 269px: the 268px SideNav plus its 1px border,
          // which border-box would otherwise eat (23 · 패널 · 사이드바). Only
          // previous defaults migrate — a width the user dragged to is theirs.
          sidebarWidth: p.sidebarWidth === 380 || p.sidebarWidth === 268 ? 269 : (p.sidebarWidth ?? 269),
          tocWidth: p.tocWidth === 360 || p.tocWidth === 268 ? 269 : (p.tocWidth ?? 269),
          shortcuts: { ...DEFAULT_SHORTCUTS, ...(p.shortcuts ?? {}) },
          templates: p.templates ?? DEFAULT_TEMPLATES,
        };
      },
    },
  ),
); }
// ponytail: stable across HMR — reuse first store instance so all modules share one object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _w = window as any;
export const useStore: ReturnType<typeof _build> = _w.__ms ?? (_w.__ms = _build());

// The singleton above freezes the action set: actions added to _build() after
// the first instance won't appear on a hot update ("x is not a function").
// On any hot update of this module, drop it and force a full reload so the store
// rebuilds with every action. App re-scans the persisted vault on startup, so
// the in-memory db is restored automatically.
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    delete _w.__ms;
    import.meta.hot!.invalidate();
  });
}

// Selectors
// useShallow: docsList builds a fresh array each call; without a shallow compare
// zustand v5 sees a new reference every render → infinite re-render loop.
export const useDocs = () => useStore(useShallow((s) => docsList(s.db)));
export const useNonMdFiles = () => useStore(useShallow((s) => s.nonMdFiles));
export const useAllDirs = () => useStore(useShallow((s) => s.allDirs));
