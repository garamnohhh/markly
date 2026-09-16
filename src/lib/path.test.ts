import { describe, expect, it } from "vitest";
import { resolveDocRelative } from "./path";

describe("resolveDocRelative", () => {
  const from = "docs/계획 (공개)/README.md";

  it.each([
    ["간트.html", "docs/계획 (공개)/간트.html"],
    ["assets/간트.png", "docs/계획 (공개)/assets/간트.png"],
    ["../보고서.pdf", "docs/보고서.pdf"],
    ["한글 파일.md", "docs/계획 (공개)/한글 파일.md"],
    ["a%20b%20(최종).md", "docs/계획 (공개)/a b (최종).md"],
    ["간트.html?view=1#slide-2", "docs/계획 (공개)/간트.html"],
  ])("resolves %s from the document folder", (href, expected) => {
    expect(resolveDocRelative(href, from)).toBe(expected);
  });

  it.each(["../../../escape.md", "https://example.com/a.md", "http://example.com/a.md", "file:///tmp/a.md", "#제목"])(
    "ignores unsafe or non-relative href %s",
    (href) => expect(resolveDocRelative(href, from)).toBeNull(),
  );
});
