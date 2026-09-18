// Invented sample Base. Nothing here comes from a real vault: no company name,
// no project name, no real document title. See demo/README for how this is
// checked before the file goes out.
export const VAULT_ROOT = "/Users/you/Notes";

type Doc = {
  docId: string; path: string; title: string;
  currentVersion: number; lastReadVersion: number; lastDecidedVersion: number;
  pinned: boolean; tags: string[]; hash: string; mtime: number; created: number;
};

const now = Math.floor(Date.now() / 1000);
const mk = (
  path: string,
  o: Partial<{ cv: number; lrv: number; ldv: number; pinned: boolean; tags: string[]; ago: number }> = {},
): Doc => ({
  docId: path.toLowerCase(),
  path,
  title: path.split("/").pop()!.replace(/\.md$/i, ""),
  currentVersion: o.cv ?? 1,
  lastReadVersion: o.lrv ?? (o.cv ?? 1),
  lastDecidedVersion: o.ldv ?? (o.cv ?? 1),
  pinned: !!o.pinned,
  tags: o.tags ?? [],
  hash: "h" + path.length,
  mtime: now - (o.ago ?? 3600),
  created: now - 86400 * 30,
});

export const DOCS: Doc[] = [
  mk("Reports/Migration Dry Run.md", { cv: 7, lrv: 4, ldv: 4, ago: 240, tags: ["report", "schema"] }),
  mk("Reports/Duplicate Names.md", { cv: 3, lrv: 2, ldv: 2, ago: 900, tags: ["report"] }),
  mk("Agents/Parser Notes.md", { cv: 5, pinned: true, ago: 5400, tags: ["agent", "schema"] }),
  mk("Agents/What It Skipped.md", { cv: 2, lrv: 1, ldv: 1, ago: 7200, tags: ["agent"] }),
  mk("Agents/Run Log.md", { ago: 86400 * 2, tags: ["agent"] }),
  mk("Decisions/Column Types.md", { cv: 4, lrv: 0, ldv: 0, pinned: true, ago: 1800, tags: ["decision"] }),
  mk("Decisions/Keeping Copies.md", { ago: 86400 * 3, tags: ["decision"] }),
  mk("Reading/Schema Versioning.md", { cv: 2, lrv: 0, ldv: 0, ago: 86400 * 3, tags: ["reading"] }),
  mk("Reading/Typography.md", { ago: 86400 * 6, tags: ["reading"] }),
  mk("Inbox.md", { ago: 120 }),
  mk("Scratch.md", { ago: 60 }),
];

export const NON_MD = [
  "Reports/counts.csv",
  "Reports/summary.html",
  "Decisions/layout.pdf",
  "Agents/queue.svg",
  "Decisions/sizes.xlsx",
  "Reading/Makefile",
];

export const DIRS = ["Reports", "Agents", "Decisions", "Reading"];

export const BODY = `# Migration Dry Run

Ran the migration against a copy of the base. Nothing was written. Three of the
four tables convert cleanly. The fourth does not: \`events.payload\` holds both
JSON and plain text, and 41 rows would lose the text.

## Needs a person

- [x] Convert the three clean tables
- [x] Write defaults for 12 nullable columns
- [ ] Decide what happens to the 41 mixed rows

## Counts

| Table | Rows | Converts |
| --- | ---: | --- |
| events | 128,400 | 41 short |
| people | 9,211 | yes |
| notes | 3,004 | yes |

\`\`\`ts
export function isJson(value: string): boolean {
  try { JSON.parse(value); return true; } catch { return false; }
}
\`\`\`

> The copy was thrown away afterwards. Nothing here touched the real base.

See also: [[Parser Notes]]
`;

export const DECK = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:"JetBrains Mono",monospace;background:#0E1011;color:#E6EBE6}
.slide{width:1280px;height:720px;display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box}
h1{font-size:44px;letter-spacing:-.03em;margin:0 0 18px}
p{color:#9AA39B;margin:0;font-size:16px}
b{color:#3ED49C;font-weight:400}
</style></head><body>
<div class="slide"><h1>Dry <b>run</b></h1><p>Three tables convert. One does not.</p></div>
<div class="slide"><h1>events.payload</h1><p>41 rows hold plain text, not JSON.</p></div>
<div class="slide"><h1>Next</h1><p>Someone decides what those 41 become.</p></div>
</body></html>`;

export const CSV = "table,rows,converts\nevents,128400,no\npeople,9211,yes\nnotes,3004,yes\n";

// Ids and paths the screen picker drives, so they stay in step with the set.
export const MAIN_DOC = "reports/migration dry run.md";
export const RABBIT_DOC = "agents/parser notes.md";
export const TAG = "schema";
export const FILE_HTML = "Reports/summary.html";
export const FILE_PDF = "Decisions/layout.pdf";
export const FILE_CSV = "Reports/counts.csv";
export const FILE_NOPE = "Decisions/sizes.xlsx";
