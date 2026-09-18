// Invented sample Base. Nothing here comes from a real vault: no company name,
// no project name, no real document title. See demo/README for how this is
// checked before the file goes out.
export const VAULT_ROOT = "/Users/you/Notes";

// Two content sets. VITE_DEMO_LANG=en switches the sample to English for the
// screenshots on the English pages; everything else about the demo is the same.
export const EN = import.meta.env.VITE_DEMO_LANG === "en";

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

export const DOCS: Doc[] = EN ? [
  mk("Reports/Nightly Run.md", { cv: 7, lrv: 4, ldv: 4, ago: 240, tags: ["agent", "report"] }),
  mk("Reports/Index Rebuild.md", { cv: 3, lrv: 2, ldv: 2, ago: 900, tags: ["agent"] }),
  mk("Agents/Crawler Status.md", { cv: 5, pinned: true, ago: 5400, tags: ["agent", "status"] }),
  mk("Agents/Retry Policy.md", { cv: 2, lrv: 1, ldv: 1, ago: 7200, tags: ["agent"] }),
  mk("Agents/Naming.md", { ago: 86400 * 2, tags: ["status"] }),
  mk("Decisions/Storage Layout.md", { cv: 4, lrv: 0, ldv: 0, pinned: true, ago: 1800, tags: ["decision"] }),
  mk("Decisions/Backups.md", { ago: 86400 * 3, tags: ["decision"] }),
  mk("Reading/Diff Algorithms.md", { cv: 2, lrv: 0, ldv: 0, ago: 86400 * 3, tags: ["reading"] }),
  mk("Reading/Typography.md", { ago: 86400 * 6, tags: ["reading"] }),
  mk("Inbox.md", { ago: 120 }),
  mk("Scratch.md", { ago: 60 }),
] : [
  mk("보고/야간 작업.md", { cv: 7, lrv: 4, ldv: 4, ago: 240, tags: ["에이전트", "보고"] }),
  mk("보고/색인 다시 만들기.md", { cv: 3, lrv: 2, ldv: 2, ago: 900, tags: ["에이전트"] }),
  mk("에이전트/수집기 상태.md", { cv: 5, pinned: true, ago: 5400, tags: ["에이전트", "상태"] }),
  mk("에이전트/재시도 규칙.md", { cv: 2, lrv: 1, ldv: 1, ago: 7200, tags: ["에이전트"] }),
  mk("에이전트/이름 짓기.md", { ago: 86400 * 2, tags: ["상태"] }),
  mk("결정/저장 구조.md", { cv: 4, lrv: 0, ldv: 0, pinned: true, ago: 1800, tags: ["결정"] }),
  mk("결정/백업.md", { ago: 86400 * 3, tags: ["결정"] }),
  mk("읽을 거리/차이 알고리즘.md", { cv: 2, lrv: 0, ldv: 0, ago: 86400 * 3, tags: ["읽을거리"] }),
  mk("읽을 거리/타이포그래피.md", { ago: 86400 * 6, tags: ["읽을거리"] }),
  mk("Inbox.md", { ago: 120 }),
  mk("Scratch.md", { ago: 60 }),
];

export const NON_MD = EN ? [
  "Reports/timings.csv",
  "Reports/summary.html",
  "Decisions/layout.pdf",
  "Agents/queue.svg",
  "Decisions/sizes.xlsx",
  "Reading/Makefile",
] : [
  "보고/처리시간.csv",
  "보고/요약.html",
  "결정/구조.pdf",
  "에이전트/대기열.svg",
  "결정/용량.xlsx",
  "읽을 거리/Makefile",
];

export const DIRS = EN
  ? ["Reports", "Agents", "Decisions", "Reading"]
  : ["보고", "에이전트", "결정", "읽을 거리"];

export const BODY = EN ? `# Nightly Run

The index was rebuilt at 03:10. Of 1,284 documents, 17 changed and 3 of those
only changed title. Nothing was deleted.

## What changed

- [x] Rebuild the index
- [x] Repair 12 broken links
- [ ] Four suspected duplicate pairs — a person should look

## Timings

| Step | Before | After |
| --- | ---: | ---: |
| Collect | 41s | 22s |
| Index | 2m 18s | 1m 04s |

\`\`\`ts
export function changed(a: Doc, b: Doc): boolean {
  return a.hash !== b.hash;
}
\`\`\`

> The four suspected duplicates were left in place.

See also: [[Crawler Status]]
` : `# 야간 작업

새벽 3시 10분에 색인을 다시 만들었다. 문서 1,284개 가운데 17개가 바뀌었고,
그중 3개는 제목만 달라졌다. 지운 것은 없다.

## 바뀐 것

- [x] 색인 다시 만들기
- [x] 깨진 링크 12개 고치기
- [ ] 중복으로 의심되는 4쌍 — 사람이 볼 것

## 처리 시간

| 단계 | 이전 | 이후 |
| --- | ---: | ---: |
| 수집 | 41s | 22s |
| 색인 | 2m 18s | 1m 04s |

\`\`\`ts
export function changed(a: Doc, b: Doc): boolean {
  return a.hash !== b.hash;
}
\`\`\`

> 중복으로 의심한 4쌍은 지우지 않았다.

관련 문서: [[수집기 상태]]
`;

export const DECK = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:"JetBrains Mono",monospace;background:#0E1011;color:#E6EBE6}
.slide{width:1280px;height:720px;display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box}
h1{font-size:44px;letter-spacing:-.03em;margin:0 0 18px}
p{color:#9AA39B;margin:0;font-size:16px}
b{color:#3ED49C;font-weight:400}
</style></head><body>
<div class="slide"><h1>Nightly <b>run</b></h1><p>17 of 1,284 documents changed.</p></div>
<div class="slide"><h1>Timings</h1><p>Index 2m 18s &rarr; 1m 04s</p></div>
<div class="slide"><h1>Next</h1><p>Four duplicate pairs need a person.</p></div>
</body></html>`;

export const CSV = "run,collect,index\n1,41,138\n2,29,81\n3,22,64\n";

// Ids and paths the screen picker drives, so the two content sets stay in step.
export const MAIN_DOC = EN ? "reports/nightly run.md" : "보고/야간 작업.md";
export const RABBIT_DOC = EN ? "agents/crawler status.md" : "에이전트/수집기 상태.md";
export const TAG = EN ? "agent" : "에이전트";
export const FILE_HTML = EN ? "Reports/summary.html" : "보고/요약.html";
export const FILE_PDF = EN ? "Decisions/layout.pdf" : "결정/구조.pdf";
export const FILE_CSV = EN ? "Reports/timings.csv" : "보고/처리시간.csv";
export const FILE_NOPE = EN ? "Decisions/sizes.xlsx" : "결정/용량.xlsx";
