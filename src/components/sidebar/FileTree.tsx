import { useMemo, useState, useCallback } from "react";
import { useStore, useDocs } from "../../store";
import { unreadCount } from "../../lib/types";
import { DocContextMenu } from "../ui/DocContextMenu";
import type { CtxMenu } from "../ui/DocContextMenu";
import type { DocEntry } from "../../lib/types";

interface TreeNode {
  name: string;
  children: Map<string, TreeNode>;
  doc?: DocEntry;
}

function buildTree(docs: DocEntry[]): TreeNode {
  const root: TreeNode = { name: "", children: new Map() };
  for (const d of docs) {
    const parts = d.path.split("/");
    let node = root;
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1;
      let child = node.children.get(part);
      if (!child) {
        child = { name: part, children: new Map() };
        node.children.set(part, child);
      }
      if (isLeaf) child.doc = d;
      node = child;
    });
  }
  return root;
}

function countFiles(node: TreeNode): number {
  let n = 0;
  for (const child of node.children.values()) {
    if (child.doc) n++;
    else n += countFiles(child);
  }
  return n;
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

export function FileTree() {
  const allDocs = useDocs();
  const vaultRoot = useStore((s) => s.vaultRoot);
  const baseName = vaultRoot?.split("/").pop() ?? "Base";

  const tree = useMemo(() => buildTree(allDocs), [allDocs]);
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);

  const onCtx = useCallback((x: number, y: number, doc: DocEntry) => {
    setCtxMenu({ x, y, doc });
  }, []);

  return (
    <div className="flex flex-col" style={{ gap: 1 }}>
      <div className="mb-[2px] flex items-center" style={{ height: 26, paddingLeft: 9, paddingRight: 9 }}>
        <span className="text-[10px] font-bold uppercase text-mid" style={{ letterSpacing: "0.13em" }}>
          {baseName}
        </span>
      </div>
      <NodeChildren node={tree} depth={0} pathPrefix="" onCtx={onCtx} />
      <DocContextMenu menu={ctxMenu} onClose={() => setCtxMenu(null)} />
    </div>
  );
}

type OnCtx = (x: number, y: number, doc: DocEntry) => void;

function NodeChildren({ node, depth, pathPrefix, onCtx }: { node: TreeNode; depth: number; pathPrefix: string; onCtx: OnCtx }) {
  const openDoc = useStore((s) => s.openDoc);
  const openId = useStore((s) => s.openDocId);

  const entries = [...node.children.values()].sort((a, b) => {
    const af = a.doc ? 1 : 0;
    const bf = b.doc ? 1 : 0;
    if (af !== bf) return af - bf;
    return a.name.localeCompare(b.name);
  });

  return (
    <>
      {entries.map((child) => {
        const childPath = pathPrefix ? `${pathPrefix}/${child.name}` : child.name;
        return child.doc ? (
          <FileRow
            key={child.name}
            doc={child.doc}
            name={child.name.replace(/\.md$/i, "")}
            depth={depth}
            openId={openId}
            openDoc={openDoc}
            onCtx={onCtx}
          />
        ) : (
          <FolderRow key={child.name} node={child} depth={depth} path={childPath} onCtx={onCtx} />
        );
      })}
    </>
  );
}

function FolderRow({ node, depth, path, onCtx }: { node: TreeNode; depth: number; path: string; onCtx: OnCtx }) {
  const expandedFolders = useStore((s) => s.expandedFolders);
  const toggleFolder = useStore((s) => s.toggleFolder);
  const open = expandedFolders.includes(path);
  const count = countFiles(node);

  return (
    <>
      <button
        onClick={() => toggleFolder(path)}
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
      {open && <NodeChildren node={node} depth={depth + 1} pathPrefix={path} onCtx={onCtx} />}
    </>
  );
}

function FileRow({
  doc,
  name,
  depth,
  openId,
  openDoc,
  onCtx,
}: {
  doc: DocEntry;
  name: string;
  depth: number;
  openId: string | null;
  openDoc: (id: string) => void;
  onCtx: OnCtx;
}) {
  const active = openId === doc.docId;
  const hasUnread = unreadCount(doc) > 0;
  const pl = depth === 0 ? 9 + 18 : 9 + depth * 21;

  return (
    <button
      onClick={() => openDoc(doc.docId)}
      onContextMenu={(e) => { e.preventDefault(); onCtx(e.clientX, e.clientY, doc); }}
      className="flex w-full items-center rounded-[8px] text-left hover:bg-tertiary"
      style={{
        gap: 7,
        height: 30,
        paddingLeft: pl,
        paddingRight: 9,
        background: active ? "var(--color-row-active)" : undefined,
        color: active ? "var(--color-ink)" : "var(--color-slate)",
        fontWeight: active ? 500 : 400,
        fontSize: "13.5px",
      }}
    >
      <FileIcon active={active} />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {hasUnread && (
        <span className="size-[5px] shrink-0 rounded-full bg-gold" />
      )}
    </button>
  );
}
