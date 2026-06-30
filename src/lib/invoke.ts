import { invoke } from "@tauri-apps/api/core";
import type { Db, DocContent, DiffResult, ChangeRecord, DocEntry } from "./types";

export const api = {
  scanVault: (path: string) => invoke<Db>("scan_vault", { path }),
  readDoc: (docId: string) => invoke<DocContent>("read_doc", { docId }),
  writeDoc: (docId: string, content: string) =>
    invoke<Db>("write_doc", { docId, content }),
  markRead: (docId: string) => invoke<Db>("mark_read", { docId }),
  listUpdates: () => invoke<DocEntry[]>("list_updates"),
  diff: (docId: string, from: number, to: number) =>
    invoke<DiffResult>("diff", { docId, from, to }),
  listChanges: (docId: string) =>
    invoke<ChangeRecord[]>("list_changes", { docId }),
  revert: (docId: string, version: number) =>
    invoke<Db>("revert", { docId, version }),
  createDoc: (relPath: string, content: string) =>
    invoke<Db>("create_doc", { relPath, content }),
  renameDoc: (docId: string, newRelPath: string) =>
    invoke<Db>("rename_doc", { docId, newRelPath }),
  deleteDoc: (docId: string) =>
    invoke<Db>("delete_doc", { docId }),
  acceptChange: (docId: string) =>
    invoke<Db>("accept_change", { docId }),
  decideVersion: (docId: string, version: number) =>
    invoke<Db>("decide_version", { docId, version }),
};
