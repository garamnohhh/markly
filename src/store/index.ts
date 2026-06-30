import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShallow } from "zustand/react/shallow";
import { api } from "../lib/invoke";
import type { Db, DocEntry } from "../lib/types";

export type Theme = "light" | "dark";
export type SidebarTab = "queue" | "files";
export type View = "onboarding" | "inbox" | "reader" | "diff" | "settings" | "tag-results" | "rabbit-hole";
export type Mode = "read" | "edit";

export interface ShortcutsMap {
  sidebar: string;
  outline: string;
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

export function formatShortcut(combo: string): string {
  const parts = combo.split("+");
  const key = parts[parts.length - 1];
  return [
    parts.includes("Ctrl") ? "⌃" : "",
    parts.includes("Alt") ? "⌥" : "",
    parts.includes("Shift") ? "⇧" : "",
    parts.includes("Meta") ? "⌘" : "",
    key.toUpperCase(),
  ].join("");
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
  // navigation / reader
  view: View;
  previousView: View | null;
  openDocId: string | null;
  mode: Mode;
  readLockVersion: number | null;
  diffTarget: DiffTarget | null;
  rabbitTrail: string[];
  // shell
  sidebarVisible: boolean;
  sidebarTab: SidebarTab;
  tocVisible: boolean;
  cmdPaletteOpen: boolean;
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
  setSidebarTab: (t: SidebarTab) => void;
  toggleToc: () => void;
  setCmdPalette: (open: boolean) => void;
  toggleRelated: () => void;
  setRelatedSelectedDocId: (id: string | null) => void;
  setShortcut: (key: keyof ShortcutsMap, combo: string) => void;
  setTemplates: (t: Template[]) => void;
  newNote: () => Promise<void>;
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
  goInbox: () => void;
  openDiff: (docId: string, from: number, to: number) => void;
  markRead: (docId: string) => Promise<void>;
  acceptChange: (docId: string) => Promise<void>;
  revert: (docId: string, version: number) => Promise<void>;
  applyDb: (db: Db) => void;
}

const docsList = (db: Db | null): DocEntry[] =>
  db ? Object.values(db.docs) : [];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "light",
      vaultRoot: null,
      vaults: [],
      editorWidth: "normal",
      acceptChangesOnClose: false,
      markReadOnDocClose: false,
      expandedFolders: [],
      sidebarWidth: 380,
      tocWidth: 360,
      showEmptySections: true,
      shortcuts: DEFAULT_SHORTCUTS,
      templates: DEFAULT_TEMPLATES,
      db: null,
      scanning: false,
      view: "onboarding",
      previousView: null,
      openDocId: null,
      mode: "read",
      readLockVersion: null,
      diffTarget: null,
      rabbitTrail: [],
      sidebarVisible: true,
      sidebarTab: "queue",
      tocVisible: true,
      cmdPaletteOpen: false,
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
      setSidebarTab: (sidebarTab) => set({ sidebarTab }),
      toggleToc: () => set((s) => ({ tocVisible: !s.tocVisible })),
      setCmdPalette: (cmdPaletteOpen) => set({ cmdPaletteOpen }),
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
        set({ sidebarWidth: Math.min(380, Math.max(256, w)) }),
      setTocWidth: (w) =>
        set({ tocWidth: Math.min(360, Math.max(212, w)) }),
      setShowEmptySections: (showEmptySections) => set({ showEmptySections }),

      applyDb: (db) => set({ db }),

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
          }));
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
        } finally {
          set({ scanning: false });
        }
      },

      openDoc: (docId) => {
        const doc = get().db?.docs[docId];
        set({
          openDocId: docId,
          view: "reader",
          mode: "read",
          readLockVersion: doc?.lastReadVersion ?? doc?.currentVersion ?? null,
          relatedOpen: false,
        });
      },

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
          shortcuts: { ...DEFAULT_SHORTCUTS, ...(p.shortcuts ?? {}) },
          templates: p.templates ?? DEFAULT_TEMPLATES,
        };
      },
    },
  ),
);

// Selectors
// useShallow: docsList builds a fresh array each call; without a shallow compare
// zustand v5 sees a new reference every render → infinite re-render loop.
export const useDocs = () => useStore(useShallow((s) => docsList(s.db)));

if (import.meta.env.DEV) {
  (window as unknown as { __store?: typeof useStore }).__store = useStore;
}
