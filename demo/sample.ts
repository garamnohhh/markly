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
  mk("Field Notes/Rain Gauge.md", { cv: 7, lrv: 4, ldv: 4, ago: 240, tags: ["weather", "garden"] }),
  mk("Field Notes/Soil pH.md", { cv: 3, lrv: 2, ldv: 2, ago: 900, tags: ["garden"] }),
  mk("Reading/Typography.md", { cv: 5, pinned: true, ago: 5400, tags: ["design", "reading"] }),
  mk("Reading/Colour and Light.md", { cv: 2, lrv: 1, ldv: 1, ago: 7200, tags: ["design"] }),
  mk("Reading/Long Walks.md", { ago: 86400 * 2, tags: ["reading"] }),
  mk("Workshop/Bench Plan.md", { cv: 4, lrv: 0, ldv: 0, pinned: true, ago: 1800, tags: ["making"] }),
  mk("Workshop/Sharpening.md", { ago: 86400 * 3, tags: ["making"] }),
  mk("Kitchen/Sourdough.md", { cv: 2, lrv: 0, ldv: 0, ago: 86400 * 3, tags: ["cooking"] }),
  mk("Kitchen/Pickles.md", { ago: 86400 * 6, tags: ["cooking"] }),
  mk("Inbox.md", { ago: 120 }),
  mk("Scratch.md", { ago: 60 }),
];

export const NON_MD = [
  "Workshop/bench.csv",
  "Reading/slides.html",
  "Reading/handout.pdf",
  "Field Notes/plot.svg",
  "Workshop/cutlist.xlsx",
  "Kitchen/Makefile",
];

export const DIRS = ["Field Notes", "Reading", "Workshop", "Kitchen"];

export const BODY = `# Rain Gauge

빗물받이를 처마 밑이 아니라 마당 한가운데로 옮겼다. 처마 밑에서는 값이 늘 적게 나온다.

## 3분기

- [x] 눈금 다시 새기기
- [ ] 뚜껑 만들기
- [ ] 겨울에도 두고 볼지 정하기

## 측정

| 항목 | 이전 | 이후 |
| --- | ---: | ---: |
| 아침 | 12mm | 14mm |
| 저녁 | 5mm | 6mm |

\`\`\`ts
export function reading(mm: number): string {
  return mm.toFixed(1) + "mm";
}
\`\`\`

> 처마 밑 값은 버린다.

관련 문서: [[Soil pH]]
`;

export const DECK = `<!doctype html><html><head><meta charset="utf-8"><style>
body{margin:0;font-family:"JetBrains Mono",monospace;background:#0E1011;color:#E6EBE6}
.slide{width:1280px;height:720px;display:flex;flex-direction:column;justify-content:center;padding:0 80px;box-sizing:border-box}
h1{font-size:44px;letter-spacing:-.03em;margin:0 0 18px}
p{color:#9AA39B;margin:0;font-size:16px}
b{color:#3ED49C;font-weight:400}
</style></head><body>
<div class="slide"><h1>Rain <b>gauge</b></h1><p>세 계절치 기록을 한 장으로.</p></div>
<div class="slide"><h1>측정</h1><p>아침 12mm → 14mm</p></div>
<div class="slide"><h1>다음</h1><p>뚜껑을 만든다.</p></div>
</body></html>`;

export const CSV = "week,before,after\n1,12,14\n2,9,11\n3,5,6\n";
