import { parseWikiInner, resolveWiki, encodeLinkDestSpaces } from "./wiki.ts";
import type { Db } from "./types.ts";

function equal(actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// --- parseWikiInner ---
equal(parseWikiInner("My Note"), { linkPart: "My Note", target: "My Note", heading: null, display: "My Note" });
equal(parseWikiInner("My Note|shown"), { linkPart: "My Note", target: "My Note", heading: null, display: "shown" });
equal(parseWikiInner("Doc#Section"), { linkPart: "Doc#Section", target: "Doc", heading: "Section", display: "Doc#Section" });
equal(parseWikiInner("Doc#Section|alias"), { linkPart: "Doc#Section", target: "Doc", heading: "Section", display: "alias" });
equal(parseWikiInner("  spaced  "), { linkPart: "spaced", target: "spaced", heading: null, display: "spaced" });

// --- resolveWiki ---
const db = {
  docs: {
    "notes/my note.md": { docId: "notes/my note.md", title: "My Note" },
    "readme.md": { docId: "readme.md", title: "Read Me" },
  },
} as unknown as Db;

equal(resolveWiki(db, "My Note"), "notes/my note.md"); // basename, spaces preserved (old bug)
equal(resolveWiki(db, "my note"), "notes/my note.md"); // case-insensitive
equal(resolveWiki(db, "notes/My Note.md"), "notes/my note.md"); // full path
equal(resolveWiki(db, "Read Me"), "readme.md"); // by title
equal(resolveWiki(db, "nope"), null); // missing → create path

// --- resolveWiki: multi-project disambiguation (nearest to current doc) ---
const multi = {
  docs: {
    "sideprojects/fitxel/docs/ai/current-state.md": { docId: "sideprojects/fitxel/docs/ai/current-state.md", title: "State" },
    "projects/nh-weekly/docs/ai/current-state.md": { docId: "projects/nh-weekly/docs/ai/current-state.md", title: "State" },
  },
} as unknown as Db;

// path target from a fitxel doc → fitxel's, NOT nh's (was the bug)
equal(
  resolveWiki(multi, "docs/ai/current-state", "sideprojects/fitxel/docs/ai/handoff.md"),
  "sideprojects/fitxel/docs/ai/current-state.md",
);
// same path target from an nh doc → nh's
equal(
  resolveWiki(multi, "docs/ai/current-state", "projects/nh-weekly/readme.md"),
  "projects/nh-weekly/docs/ai/current-state.md",
);
// bare name still resolves, nearest to current doc
equal(
  resolveWiki(multi, "current-state", "sideprojects/fitxel/readme.md"),
  "sideprojects/fitxel/docs/ai/current-state.md",
);
// path target that doesn't exist → null (never a cross-project basename grab)
equal(resolveWiki(multi, "docs/ai/nope", "sideprojects/fitxel/readme.md"), null);

// --- encodeLinkDestSpaces ---
equal(
  encodeLinkDestSpaces("[x](file:///a/01. API 명세서.md)"),
  "[x](file:///a/01.%20API%20명세서.md)",
);
equal(encodeLinkDestSpaces("[x](note.md)"), "[x](note.md)"); // no spaces → unchanged
equal(encodeLinkDestSpaces('[x](note.md "a title")'), '[x](note.md "a title")'); // title form untouched
equal(encodeLinkDestSpaces("[a](x y.md) and [b](p q.md)"), "[a](x%20y.md) and [b](p%20q.md)"); // multiple

console.log("wiki tests passed");
