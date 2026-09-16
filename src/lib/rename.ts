import type { Db } from "./types";

export interface RenameReferences {
  openDocId: string | null;
  openFilePath: string | null;
  diffTarget: { docId: string; from: number; to: number } | null;
  rabbitTrail: string[];
  relatedSelectedDocId: string | null;
}

export function renameTargetPath(currentPath: string, input: string): string | null {
  let name = input.trim();
  if (!name) return null;
  if (/[\\/]/.test(name)) throw new Error("파일명에는 / 또는 \\를 사용할 수 없어요.");
  if (!/\.[^./]+$/.test(name)) name += ".md";
  if (!/\.md$/i.test(name)) throw new Error("Markdown 문서는 .md 확장자만 사용할 수 있어요.");
  name = name.replace(/\.md$/i, ".md");

  const dir = currentPath.includes("/") ? currentPath.slice(0, currentPath.lastIndexOf("/") + 1) : "";
  const next = `${dir}${name}`;
  return next.toLowerCase() === currentPath.toLowerCase() ? null : next;
}

export function renamedDocId(db: Db, newPath: string): string | null {
  return Object.values(db.docs).find((doc) => doc.path === newPath)?.docId ?? null;
}

export function remapRenameReferences(
  state: RenameReferences,
  oldDocId: string,
  newDocId: string,
  oldPath: string,
  newPath: string,
): RenameReferences {
  const remap = (id: string | null) => id === oldDocId ? newDocId : id;
  return {
    openDocId: remap(state.openDocId),
    openFilePath: state.openFilePath === oldPath ? newPath : state.openFilePath,
    diffTarget: state.diffTarget?.docId === oldDocId
      ? { ...state.diffTarget, docId: newDocId }
      : state.diffTarget,
    rabbitTrail: state.rabbitTrail.map((id) => remap(id)!),
    relatedSelectedDocId: remap(state.relatedSelectedDocId),
  };
}
