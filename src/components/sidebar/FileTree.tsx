import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useStore, useDocs, useNonMdFiles, useAllDirs } from "../../store";
import { api } from "../../lib/invoke";
import { unreadCount } from "../../lib/types";
import { DocContextMenu } from "../ui/DocContextMenu";
import type { CtxMenu } from "../ui/DocContextMenu";
import type { DocEntry } from "../../lib/types";

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  doc?: DocEntry;
  filePath?: string; // non-md file relative path
}

type FileCtxMenu = { x: number; y: number; relPath: string; name: string; kind: "file" | "folder" };

function buildTree(docs: DocEntry[], files: string[], dirs: string[]): TreeNode {
  const root: TreeNode = { name: "", children: new Map() };

  function insertPath(path: string, setLeaf: (node: TreeNode) => void) {
    const parts = path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, children: new Map() };
        node.children.set(part, child);
      }
      if (isLeaf) setLeaf(child);
      node = child;
    });
  }

  for (const d of docs) insertPath(d.path, (n) => { n.doc = d; });
  for (const f of files) insertPath(f, (n) => { n.filePath = f; });
  for (const dir of dirs) insertPath(dir, () => {});
  return root;
}

function countFiles(node: TreeNode): number {
  let n = 0;
  for (const child of node.children.values()) {
    if (child.doc || child.filePath) n++;
    else n += countFiles(child);
  }
  return n;
}

// Extension → badge color
const EXT_COLORS: Record<string, string> = {
  pdf: "var(--color-red)",
  png: "#8250df", jpg: "#8250df", jpeg: "#8250df", gif: "#8250df", webp: "#8250df", svg: "#8250df",
  json: "#d0834a", yaml: "#d0834a", yml: "#d0834a", toml: "#d0834a",
  js: "#4a78b0", ts: "#4a78b0", jsx: "#4a78b0", tsx: "#4a78b0",
  py: "var(--color-green)", go: "var(--color-green)", rs: "#d0834a",
  csv: "var(--color-green)",
  sh: "var(--color-slate)", bash: "var(--color-slate)",
  html: "var(--color-red)", css: "#4a78b0", scss: "#4a78b0",
};

function ExtBadge({ name }: { name: string }) {
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (!ext) return null;
  const color = EXT_COLORS[ext] ?? "var(--color-mid)";
  return (
    <span
      style={{
        fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.04em",
        color, background: `${color}18`,
        border: `1px solid ${color}30`,
        borderRadius: 4, padding: "1px 5px",
        flexShrink: 0, textTransform: "uppercase",
      }}
    >
      {ext}
    </span>
  );
}

// Icons
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    width="11" height="11" viewBox="0 0 12 12"
    fill="none" stroke="var(--color-mid)" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}
  >
    <path d="M4 2.5L8 6l-4 3.5" />
  </svg>
);

const FolderIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--color-mid)" strokeWidth="1.3" style={{ flexShrink: 0 }}>
    <path d="M2 4.4c0-.5.4-.9.9-.9h2.4l1.1 1.3h6.7c.5 0 .9.4.9.9v6.1c0 .5-.4.9-.9.9H2.9c-.5 0-.9-.4-.9-.9z" />
  </svg>
);

const FileIcon = ({ active }: { active?: boolean }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke={active ? "var(--color-mid)" : "var(--color-muted)"} strokeWidth="1.3" style={{ flexShrink: 0 }}>
    <path d="M4 2h5l3 3v9H4z" />
    <path d="M9 2v3h3" strokeLinejoin="round" />
  </svg>
);

// "+" affordance in the Files header: New file / New folder, created at `dir`
// (current doc's folder, else root). Reuses the small inline-input pattern.
function NewItemControl({ dir }: { dir: string }) {
  const [mode, setMode] = useState<null | "menu" | "file" | "folder">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === "file" || mode === "folder") inputRef.current?.focus();
  }, [mode]);
  useEffect(() => {
    if (!mode) return;
    const close = () => setMode(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [mode]);

  const submit = (val: string) => {
    const kind = mode;
    setMode(null);
    const v = val.trim();
    if (!v) return;
    if (kind === "file") void useStore.getState().createFileAt(dir, v);
    else if (kind === "folder") void useStore.getState().createFolderAt(dir, v);
  };

  const itemCls = "flex w-full items-center px-[13px] py-[7px] text-left text-[13px] text-ink hover:bg-tertiary";

  return (
    <div className="relative" onMouseDown={(e) => e.stopPropagation()}>
      <button
        title="New file or folder"
        onClick={() => setMode((m) => (m ? null : "menu"))}
        className="flex h-[20px] w-[20px] items-center justify-center rounded-[5px] text-[15px] leading-none text-muted hover:bg-tertiary hover:text-ink"
      >
        +
      </button>
      {mode === "menu" && (
        <div
          className="absolute right-0 z-50 mt-1 overflow-hidden rounded-[8px] border border-line bg-paper"
          style={{ minWidth: 150, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.18)" }}
        >
          <button className={itemCls} onClick={() => setMode("file")}>New file</button>
          <button className={itemCls} onClick={() => setMode("folder")}>New folder</button>
        </div>
      )}
      {(mode === "file" || mode === "folder") && (
        <div
          className="absolute right-0 z-50 mt-1 rounded-[8px] border border-line bg-paper px-[10px] py-[8px]"
          style={{ minWidth: 190, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.18)" }}
        >
          <input
            ref={inputRef}
            placeholder={mode === "file" ? "name.md" : "folder name"}
            className="w-full rounded-[5px] border border-line bg-surface px-2 py-1 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") submit((e.target as HTMLInputElement).value);
              if (e.key === "Escape") setMode(null);
              e.stopPropagation();
            }}
          />
          <div className="mt-1 text-[11px] text-muted">in {dir ? `${dir}/` : "root"}</div>
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const allDocs = useDocs();
  const nonMdFiles = useNonMdFiles();
  const allDirs = useAllDirs();
  const vaultRoot = useStore((s) => s.vaultRoot);
  const baseName = vaultRoot?.split("/").pop() ?? "Base";

  const openDocId = useStore((s) => s.openDocId);
  // New-item target: current doc's folder, else vault root.
  const currentDir = openDocId && openDocId.includes("/") ? openDocId.slice(0, openDocId.lastIndexOf("/")) : "";

  const tree = useMemo(() => buildTree(allDocs, nonMdFiles, allDirs), [allDocs, nonMdFiles, allDirs]);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const [fileCtxMenu, setFileCtxMenu] = useState<FileCtxMenu | null>(null);

  const onCtx = useCallback((x: number, y: number, doc: DocEntry) => {
    setCtxMenu({ x, y, doc });
  }, []);

  const onFileCtx = useCallback((x: number, y: number, relPath: string, name: string, kind: "file" | "folder") => {
    setFileCtxMenu({ x, y, relPath, name, kind });
  }, []);

  return (
    <div data-find-exclude className="flex flex-col" style={{ gap: 1 }}>
      <div className="mb-[2px] flex items-center" style={{ height: 26, paddingLeft: 9, paddingRight: 6 }}>
        <span className="text-[10px] font-bold uppercase text-mid" style={{ letterSpacing: "0.13em" }}>
          {baseName}
        </span>
        <div className="ml-auto">
          <NewItemControl dir={currentDir} />
        </div>
      </div>
      <NodeChildren node={tree} depth={0} pathPrefix="" onCtx={onCtx} onFileCtx={onFileCtx} />
      <DocContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />
      <NonDocCtxMenu menu={fileCtxMenu} vaultRoot={vaultRoot} onClose={() => setFileCtxMenu(null)} />
    </div>
  );
}

type OnCtx = (x: number, y: number, doc: DocEntry) => void;
type OnFileCtx = (x: number, y: number, relPath: string, name: string, kind: "file" | "folder") => void;

function NodeChildren({
  node, depth, pathPrefix, onCtx, onFileCtx,
}: { node: TreeNode; depth: number; pathPrefix: string; onCtx: OnCtx; onFileCtx: OnFileCtx }) {
  const openDoc = useStore((s) => s.openDoc);
  const openFile = useStore((s) => s.openFile);
  const openId = useStore((s) => s.openDocId);
  const openFilePath = useStore((s) => s.openFilePath);

  const entries = [...node.children.values()].sort((a, b) => {
    const af = (a.doc || a.filePath) ? 1 : 0;
    const bf = (b.doc || b.filePath) ? 1 : 0;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {entries.map((child) => {
        const childPath = pathPrefix ? `${pathPrefix}/${child.name}` : child.name;
        if (child.doc) {
          return (
            <DocFileRow
              key={child.name}
              doc={child.doc}
              name={child.name.replace(/\.md$/i, "")}
              depth={depth}
              active={openId === child.doc.docId}
              openDoc={openDoc}
              onCtx={onCtx}
            />
          );
        }
        if (child.filePath) {
          return (
            <RawFileRow
              key={child.name}
              name={child.name}
              relPath={child.filePath}
              depth={depth}
              active={openFilePath === child.filePath}
              openFile={openFile}
              onFileCtx={onFileCtx}
            />
          );
        }
        return <FolderRow key={child.name} node={child} depth={depth} path={childPath} onCtx={onCtx} onFileCtx={onFileCtx} />;
      })}
    </>
  );
}

function FolderRow({
  node, depth, path, onCtx, onFileCtx,
}: { node: TreeNode; depth: number; path: string; onCtx: OnCtx; onFileCtx: OnFileCtx }) {
  const expandedFolders = useStore((s) => s.expandedFolders);
  const toggleFolder = useStore((s) => s.toggleFolder);
  const open = expandedFolders.includes(path);
  const count = countFiles(node);

  return (
    <>
      <button
        onClick={() => toggleFolder(path)}
        onContextMenu={(e) => { e.preventDefault(); onFileCtx(e.clientX, e.clientY, path, node.name, "folder"); }}
        className="flex w-full items-center rounded-[8px] text-left hover:bg-tertiary"
        style={{
          gap: 7,
          height: 30,
          paddingLeft: 9 + depth * 21,
          paddingRight: 9,
          color: "var(--color-slate)",
          fontSize: "13.5px",
          userSelect: "none",
        }}
      >
        <ChevronIcon open={open} />
        <FolderIcon />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {count > 0 && (
          <span className="shrink-0 text-[11px] text-muted">
            {count}
          </span>
        )}
      </button>
      {open && <NodeChildren node={node} depth={depth + 1} pathPrefix={path} onCtx={onCtx} onFileCtx={onFileCtx} />}
    </>
  );
}

function DocFileRow({
  doc, name, depth, active, openDoc, onCtx,
}: {
  doc: DocEntry; name: string; depth: number; active: boolean;
  openDoc: (id: string) => void; onCtx: OnCtx;
}) {
  const hasUnread = unreadCount(doc) > 0;
  const pl = depth === 0 ? 9 + 18 : 9 + depth * 21;

  return (
    <button
      onClick={() => openDoc(doc.docId)}
      onContextMenu={(e) => { e.preventDefault(); onCtx(e.clientX, e.clientY, doc); }}
      className="flex w-full items-center rounded-[8px] text-left hover:bg-tertiary"
      style={{
        gap: 7, height: 30, paddingLeft: pl, paddingRight: 9,
        background: active ? "var(--color-row-active)" : undefined,
        color: active ? "var(--color-ink)" : "var(--color-slate)",
        fontWeight: active ? 500 : 400, fontSize: "13.5px",
      }}
    >
      <FileIcon active={active} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {hasUnread && <span className="size-[5px] shrink-0 rounded-full bg-gold" />}
    </button>
  );
}

function RawFileRow({
  name, relPath, depth, active, openFile, onFileCtx,
}: {
  name: string; relPath: string; depth: number; active: boolean;
  openFile: (relPath: string) => void; onFileCtx: OnFileCtx;
}) {
  const pl = depth === 0 ? 9 + 18 : 9 + depth * 21;
  const displayName = name.includes(".") ? name.substring(0, name.lastIndexOf(".")) : name;

  return (
    <button
      onClick={() => openFile(relPath)}
      onContextMenu={(e) => { e.preventDefault(); onFileCtx(e.clientX, e.clientY, relPath, name, "file"); }}
      className="flex w-full items-center rounded-[8px] text-left hover:bg-tertiary"
      style={{
        gap: 7, height: 30, paddingLeft: pl, paddingRight: 9,
        background: active ? "var(--color-row-active)" : undefined,
        color: active ? "var(--color-ink)" : "var(--color-slate)",
        fontWeight: active ? 500 : 400, fontSize: "13.5px",
      }}
    >
      <FileIcon active={active} />
      <span className="min-w-0 flex-1 truncate">{displayName}</span>
      <ExtBadge name={name} />
    </button>
  );
}

function NonDocCtxMenu({
  menu, vaultRoot, onClose,
}: {
  menu: FileCtxMenu | null;
  vaultRoot: string | null;
  onClose: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState<null | "file" | "folder">(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menu) return;
    setRenaming(false);
    setCreating(null);
    const close = () => onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu, onClose]);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
    else if (creating) inputRef.current?.focus();
  }, [renaming, creating]);

  if (!menu) return null;

  const { relPath, name, kind } = menu;
  const absPath = `${vaultRoot}/${relPath}`;

  async function handleReveal() {
    onClose();
    try { await revealItemInDir(absPath); } catch { /* silent */ }
  }

  async function handleCopyPath() {
    onClose();
    try { await navigator.clipboard.writeText(absPath); } catch { /* silent */ }
  }

  async function handleDelete() {
    onClose();
    const yes = await ask(`Delete "${name}"?\nThis cannot be undone.`, { title: "Delete file", kind: "warning" });
    if (!yes) return;
    try { await api.deleteRawFile(relPath); } catch { /* silent */ }
  }

  async function submitRename(value: string) {
    const newName = value.trim();
    onClose();
    if (!newName || newName === name) return;
    try { await api.renameRawFile(relPath, newName); } catch { /* silent */ }
  }

  function submitCreate(value: string) {
    const kind2 = creating;
    onClose();
    const v = value.trim();
    if (!v) return;
    if (kind2 === "file") void useStore.getState().createFileAt(relPath, v);
    else if (kind2 === "folder") void useStore.getState().createFolderAt(relPath, v);
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 overflow-hidden rounded-[8px] border border-line bg-paper"
      style={{ top: menu.y, left: menu.x, minWidth: 180, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.18)" }}
    >
      {kind === "file" && renaming ? (
        <div className="px-[10px] py-[8px]">
          <input
            ref={inputRef}
            defaultValue={name}
            className="w-full rounded-[5px] border border-line bg-surface px-2 py-1 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitRename((e.target as HTMLInputElement).value);
              if (e.key === "Escape") onClose();
              e.stopPropagation();
            }}
            onBlur={(e) => void submitRename(e.target.value)}
            autoFocus
          />
        </div>
      ) : creating ? (
        <div className="px-[10px] py-[8px]">
          <input
            ref={inputRef}
            placeholder={creating === "file" ? "name.md" : "folder name"}
            className="w-full rounded-[5px] border border-line bg-surface px-2 py-1 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitCreate((e.target as HTMLInputElement).value);
              if (e.key === "Escape") onClose();
              e.stopPropagation();
            }}
            autoFocus
          />
          <div className="mt-1 text-[11px] text-muted">in {relPath}/</div>
        </div>
      ) : (
        <>
          {kind === "folder" && (
            <>
              <button
                onClick={() => setCreating("file")}
                className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] text-ink hover:bg-tertiary"
              >
                New file here
              </button>
              <button
                onClick={() => setCreating("folder")}
                className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] text-ink hover:bg-tertiary"
              >
                New folder here
              </button>
              <div className="mx-[8px] border-t border-line" />
            </>
          )}
          {kind === "file" && (
            <button
              onClick={() => setRenaming(true)}
              className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] text-ink hover:bg-tertiary"
            >
              Rename
            </button>
          )}
          <button
            onClick={() => void handleReveal()}
            className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] text-ink hover:bg-tertiary"
          >
            Show in Finder
          </button>
          <button
            onClick={() => void handleCopyPath()}
            className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] text-ink hover:bg-tertiary"
          >
            Copy Path
          </button>
          {kind === "file" && (
            <>
              <div className="mx-[8px] border-t border-line" />
              <button
                onClick={() => void handleDelete()}
                className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] hover:bg-tertiary"
                style={{ color: "var(--color-red)" }}
              >
                Delete
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
