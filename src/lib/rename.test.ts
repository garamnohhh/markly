import { remapRenameReferences, renamedDocId, renameTargetPath } from "./rename.ts";
import type { Db } from "./types.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function throws(fn: () => unknown, needle: string) {
  try {
    fn();
  } catch (e) {
    if (String(e).includes(needle)) return;
    throw new Error(`expected an error containing ${needle}, got ${String(e)}`);
  }
  throw new Error(`expected an error containing ${needle}, got none`);
}

const state = {
  openDocId: "notes/old.md",
  openFilePath: null,
  diffTarget: { docId: "notes/old.md", from: 1, to: 2 },
  rabbitTrail: ["notes/old.md", "other.md"],
  relatedSelectedDocId: "notes/old.md",
};

// Every reference to the old id follows the rename.
for (const name of ["한글 이름.md", "이름 (최종).md"]) {
  const newId = `notes/${name.toLowerCase()}`;
  const next = remapRenameReferences(state, "notes/old.md", newId, "notes/old.md", `notes/${name}`);
  equal(next.openDocId, newId);
  equal(next.diffTarget?.docId, newId);
  equal(next.rabbitTrail, [newId, "other.md"]);
  equal(next.relatedSelectedDocId, newId);
}

// The new id comes from the db entry whose path matches, case kept.
const db = { docs: { "notes/새 이름.md": { docId: "notes/새 이름.md", path: "Notes/새 이름.md" } } } as unknown as Db;
equal(renamedDocId(db, "Notes/새 이름.md"), "notes/새 이름.md");
equal(renamedDocId(db, "Notes/없는 이름.md"), null);

// Target path: .md is added when missing, the folder is kept.
equal(renameTargetPath("notes/old.md", "한글 이름"), "notes/한글 이름.md");
equal(renameTargetPath("notes/old.md", "이름 (최종).md"), "notes/이름 (최종).md");
equal(renameTargetPath("old.md", "새 이름"), "새 이름.md");

// No-ops and refusals.
equal(renameTargetPath("notes/old.md", "old.md"), null);
equal(renameTargetPath("notes/old.md", "old.MD"), null);
equal(renameTargetPath("notes/old.md", "   "), null);
throws(() => renameTargetPath("notes/old.md", "old.txt"), ".md 확장자");
throws(() => renameTargetPath("notes/old.md", "sub/old.md"), "/");

console.log("rename.test.ts ok");
