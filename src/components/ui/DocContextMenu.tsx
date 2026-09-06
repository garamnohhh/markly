import { useEffect, useRef, useState } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { useStore } from "../../store";
import { docName } from "../../lib/types";
import { api } from "../../lib/invoke";
import type { DocEntry } from "../../lib/types";

export interface CtxMenu {
  x: number;
  y: number;
  doc: DocEntry;
}

export function DocContextMenu({
  menu,
  onClose,
}: {
  menu: CtxMenu | null;
  onClose: () => void;
}) {
  const applyDb = useStore((s) => s.applyDb);
  const openId = useStore((s) => s.openDocId);
  const goInbox = useStore((s) => s.goInbox);
  const vaultRoot = useStore((s) => s.vaultRoot);

  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside mousedown
  useEffect(() => {
    if (!menu) return;
    setRenaming(false);
    const close = () => onClose();
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menu, onClose]);

  // Focus input when rename mode activates
  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  if (!menu) return null;

  const doc = menu.doc;
  const oldName = doc.path.split("/").pop()?.replace(/\.md$/i, "") ?? "";
  const dir = doc.path.includes("/") ? doc.path.slice(0, doc.path.lastIndexOf("/") + 1) : "";

  async function submitRename(value: string) {
    const newName = value.trim();
    onClose();
    if (!newName || newName === oldName) return;
    try {
      const db = await api.renameDoc(doc.docId, `${dir}${newName}.md`);
      applyDb(db);
    } catch (e) {
      console.error("rename failed", e);
    }
  }

  async function handleDelete() {
    onClose();
    const yes = await ask(`Delete "${docName(doc)}"?\nThis cannot be undone.`, {
      title: "Delete file",
      kind: "warning",
    });
    if (!yes) return;
    try {
      const db = await api.deleteDoc(doc.docId);
      applyDb(db);
      if (openId === doc.docId) goInbox();
    } catch (e) {
      console.error("delete failed", e);
    }
  }

  async function handleReveal() {
    onClose();
    if (!vaultRoot) return;
    try {
      await revealItemInDir(`${vaultRoot}/${doc.path}`);
    } catch (e) {
      console.error("reveal failed", e);
    }
  }

  async function handleCopyPath() {
    onClose();
    if (!vaultRoot) return;
    try { await navigator.clipboard.writeText(`${vaultRoot}/${doc.path}`); } catch { /* silent */ }
  }

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="fixed z-50 overflow-hidden rounded-[8px] border border-line bg-paper"
      style={{ top: menu.y, left: menu.x, minWidth: 180, boxShadow: "0 8px 24px -4px rgba(0,0,0,0.18)" }}
    >
      {renaming ? (
        <div className="px-[10px] py-[8px]">
          <input
            ref={inputRef}
            defaultValue={oldName}
            className="w-full rounded-[5px] border border-line bg-surface px-2 py-1 text-[13px] text-ink focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]"
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename((e.target as HTMLInputElement).value);
              if (e.key === "Escape") onClose();
              e.stopPropagation();
            }}
            onBlur={(e) => submitRename(e.target.value)}
            autoFocus
          />
        </div>
      ) : (
        <>
          <button
            onClick={() => setRenaming(true)}
            className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] text-ink hover:bg-tertiary"
          >
            Rename
          </button>
          <button
            onClick={handleReveal}
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
          <div className="mx-[8px] border-t border-line" />
          <button
            onClick={handleDelete}
            className="flex w-full items-center px-[13px] py-[8px] text-left text-[13px] hover:bg-tertiary"
            style={{ color: "var(--color-red)" }}
          >
            Delete
          </button>
        </>
      )}
    </div>
  );
}
