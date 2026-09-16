import { resolveDocRelative } from "./path.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

const from = "docs/계획 (공개)/README.md";

// Resolved from the document's own folder.
equal(resolveDocRelative("간트.html", from), "docs/계획 (공개)/간트.html");
equal(resolveDocRelative("./간트.html", from), "docs/계획 (공개)/간트.html");
equal(resolveDocRelative("assets/간트.png", from), "docs/계획 (공개)/assets/간트.png");
equal(resolveDocRelative("../보고서.pdf", from), "docs/보고서.pdf");
equal(resolveDocRelative("한글 파일.md", from), "docs/계획 (공개)/한글 파일.md");
equal(resolveDocRelative("a%20b%20(최종).md", from), "docs/계획 (공개)/a b (최종).md");
equal(resolveDocRelative("간트.html?view=1#slide-2", from), "docs/계획 (공개)/간트.html");
equal(resolveDocRelative("note.md", "root.md"), "note.md");

// Left alone: escapes the vault, absolute, external, or a bare anchor.
equal(resolveDocRelative("../../../escape.md", from), null);
equal(resolveDocRelative("/absolute.md", from), null);
equal(resolveDocRelative("https://example.com/a.md", from), null);
equal(resolveDocRelative("http://example.com/a.md", from), null);
equal(resolveDocRelative("file:///tmp/a.md", from), null);
equal(resolveDocRelative("#제목", from), null);
equal(resolveDocRelative("", from), null);

console.log("path.test.ts ok");
