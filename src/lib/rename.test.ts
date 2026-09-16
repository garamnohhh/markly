import { describe, expect, it } from "vitest";
import { remapRenameReferences, renamedDocId, renameTargetPath } from "./rename";
import type { Db } from "./types";

const state = {
  openDocId: "notes/old.md",
  openFilePath: null,
  diffTarget: { docId: "notes/old.md", from: 1, to: 2 },
  rabbitTrail: ["notes/old.md", "other.md"],
  relatedSelectedDocId: "notes/old.md",
};

describe("rename state", () => {
  it.each(["한글 이름.md", "이름 (최종).md"])("follows the renamed document: %s", (name) => {
    const next = remapRenameReferences(state, "notes/old.md", `notes/${name.toLowerCase()}`, "notes/old.md", `notes/${name}`);
    expect(next.openDocId).toBe(`notes/${name.toLowerCase()}`);
    expect(next.diffTarget?.docId).toBe(`notes/${name.toLowerCase()}`);
    expect(next.rabbitTrail[0]).toBe(`notes/${name.toLowerCase()}`);
    expect(next.relatedSelectedDocId).toBe(`notes/${name.toLowerCase()}`);
  });

  it("finds the returned id by its real path", () => {
    const db = { docs: { "notes/새 이름.md": { docId: "notes/새 이름.md", path: "Notes/새 이름.md" } } } as unknown as Db;
    expect(renamedDocId(db, "Notes/새 이름.md")).toBe("notes/새 이름.md");
  });

  it.each([
    ["한글 이름", "notes/한글 이름.md"],
    ["이름 (최종).md", "notes/이름 (최종).md"],
  ])("builds a safe target for %s", (input, expected) => {
    expect(renameTargetPath("notes/old.md", input)).toBe(expected);
  });

  it("ignores the same name, including extension case only", () => {
    expect(renameTargetPath("notes/old.md", "old.md")).toBeNull();
    expect(renameTargetPath("notes/old.md", "old.MD")).toBeNull();
  });

  it("rejects changing a document to another extension", () => {
    expect(() => renameTargetPath("notes/old.md", "old.txt")).toThrow(".md 확장자");
  });
});
