// Mirrors the Rust serde structs (camelCase).
export interface DocEntry {
  docId: string;
  path: string;
  title: string;
  currentVersion: number;
  lastReadVersion: number;
  lastDecidedVersion: number;
  pinned: boolean;
  tags: string[];
  hash: string;
  mtime: number;
  created: number;
}

export interface Settings {
  scanOnStartup: boolean;
  readLock: boolean;
  wordLevelDiff: boolean;
  acceptChangesOnClose: boolean;
  markReadOnDocClose: boolean;
}

export interface Db {
  version: number;
  docs: Record<string, DocEntry>;
  settings: Settings;
}

export interface DocContent {
  content: string;
  meta: DocEntry;
}

export type DiffOp = "eq" | "del" | "ins";
export interface WordOp {
  op: DiffOp;
  text: string;
}
export interface DiffStats {
  additions: number;
  deletions: number;
}
export interface DiffResult {
  from: number;
  to: number;
  ops: WordOp[];
  stats: DiffStats;
}
export interface ChangeRecord {
  from: number;
  to: number;
  at: number;
  source: string;
  stats: DiffStats;
  ops: WordOp[];
}

export const unreadCount = (d: DocEntry) =>
  Math.max(0, d.currentVersion - d.lastReadVersion);

// Display name = filename without .md (project decision: filename-based titles).
export const docName = (d: DocEntry): string =>
  d.path.split("/").pop()!.replace(/\.md$/i, "");

// Directory segments leading to the doc (excludes the filename).
export const docDirs = (d: DocEntry): string[] => {
  const parts = d.path.split("/");
  parts.pop();
  return parts.filter(Boolean);
};
