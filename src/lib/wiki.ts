import type { Db } from "./types";

export interface ParsedWiki {
  linkPart: string; // "target#heading" (no alias) — encoded into the href
  target: string; // filename/title portion
  heading: string | null; // section after '#', if any
  display: string; // link text shown to the reader
}

// Parse the inside of [[ ... ]]: [[target]], [[target|alias]],
// [[target#heading]], [[target#heading|alias]].
export function parseWikiInner(inner: string): ParsedWiki {
  const [linkRaw, aliasRaw] = inner.split("|");
  const linkPart = linkRaw.trim();
  const [targetRaw, headingRaw] = linkPart.split("#");
  const target = targetRaw.trim();
  const heading = headingRaw?.trim() ? headingRaw.trim() : null;
  const display = (aliasRaw ?? linkPart).trim() || linkPart;
  return { linkPart, target, heading, display };
}

// Percent-encode raw spaces inside markdown link destinations. markdown-it
// truncates a destination at the first space (breaking file paths like
// "file:///…/01. API 명세서.md"), so we encode them first. Destinations using a
// "title" or <angle-bracket> form are left untouched.
export function encodeLinkDestSpaces(md: string): string {
  return md.replace(/\]\(([^)]+)\)/g, (m, dest) => {
    if (dest.startsWith("<") || /\s"[^"]*"\s*$/.test(dest)) return m;
    return `](${dest.replace(/ /g, "%20")})`;
  });
}

// Pick the candidate docId closest to the current document — the one sharing the
// longest leading path with it (keeps a link inside the same project/folder).
// Ties break toward the shortest path.
function nearest(cands: string[], fromDocId?: string): string | null {
  if (cands.length <= 1) return cands[0] ?? null;
  const fromDir = fromDocId ? fromDocId.split("/").slice(0, -1) : [];
  const shared = (id: string) => {
    const b = id.split("/");
    let n = 0;
    while (n < fromDir.length && n < b.length && fromDir[n] === b[n]) n++;
    return n;
  };
  return cands.slice().sort((x, y) => shared(y) - shared(x) || x.length - y.length)[0];
}

// Resolve a wiki target (bare name, relative path, or title) to a docId.
// Case-insensitive; ".md" optional. `fromDocId` is the current document, used to
// disambiguate: a target that carries a path (e.g. "docs/ai/current-state") is
// matched by exact path → path suffix (nearest to the current doc), and NEVER by
// bare basename — so a link in one project can't jump to a same-named file in
// another. A bare name matches basename (nearest) → title.
export function resolveWiki(db: Db, target: string, fromDocId?: string): string | null {
  const raw = target.trim();
  if (!raw) return null;
  const t = raw.toLowerCase();
  const withMd = t.endsWith(".md") ? t : `${t}.md`;
  const ids = Object.keys(db.docs);

  // 1. exact vault-relative path
  if (db.docs[withMd]) return withMd;

  if (withMd.includes("/")) {
    // 2. path suffix match, nearest to the current doc wins (no basename fallback)
    const suffix = ids.filter((id) => id.endsWith(`/${withMd}`));
    return nearest(suffix, fromDocId);
  }

  // 3. bare name: basename (nearest) then title
  const byBase = ids.filter((id) => id.split("/").pop() === withMd);
  if (byBase.length) return nearest(byBase, fromDocId);
  return ids.find((id) => db.docs[id].title.toLowerCase() === t) ?? null;
}
