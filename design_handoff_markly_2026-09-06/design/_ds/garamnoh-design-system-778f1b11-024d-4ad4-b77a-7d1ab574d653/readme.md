# garamnoh Design System

**Owner** garamnoh — one person, Jeonju, Korea. A developer who builds tools, not a designer.
**Surfaces** personal site (`garamnoh.pages.dev`), the design-system reference site, project pages, personal web apps, presentation decks, throwaway prototypes.
**Flagship product** Pilo — an orchestrator that directs several coding agents from the terminal.
**Why the system exists** picking colours, spacing and components again in every project cost more time than building features. The single source of values comes first; screens come after.
**DNA** terminal. Near-black ground, one fluorescent green signal, square corners, no shadows, mono labels.
**Name** always lowercase `garamnoh`. `Garamnoh` and `GARAMNOH` are wrong.

## Sources

- **The attached `garamnoh-system/` folder is the single source of truth.** The current copy is the 2026.09.04 handoff at `uploads/handoff/assets-to-register/garamnoh-system/` (brief: `uploads/handoff/BRIEF.md`), copied verbatim into this project's root: `styles.css`, `tokens/`, `components/{layout,components,wordmark}.css`, `components/snippets/`, `assets/`, `boot.js`, `panels.js`, `counts.js`, `ELEMENTS.md`.
- **Scripts that ship with the system**: `boot.js` applies the stored theme and language to `<html>` before first paint (keys `garamnoh-system-mode`, `garamnoh-system-lang`) — load it in `<head>`, not deferred. `panels.js` drives snap-panel marks and the section-nav highlight. `counts.js` fills `[data-count="tokens"|"classes"]` from the loaded CSS, because **the system never hardcodes counts of itself**.
- No external repo, no Figma file, no design tool. This system was born as code.
- Fonts are loaded from the web, not from binaries: **Pretendard Variable** (jsDelivr, `orioncactus/pretendard@v1.3.9`) and **JetBrains Mono** (Google Fonts). There are no local font files to ship — `tokens/fonts.css` holds the two `@import`s.
- The written brief (2026.09.04 handover) froze sections 0–15 of the spec, including the new §4 layout grammar (`components/layout.css`). This project reproduces those values unchanged and adds only what the brief's "확장 요청" asked for.

**One change to a frozen file:** `tokens/colors.css` originally scoped every colour under `[data-theme="light"]` / `[data-theme="dark"]` only, so a document without the attribute had no colours at all. The dark block is now also bound to `:root` (identical values, dark first, light after). Nothing else was touched.

---

## CONTENT FUNDAMENTALS

**Write like a log. Facts first; drop most adjectives.**

Yes:
- "커밋 e96ecaf. 로컬만, 배포 안 함."
- "남은 것: 한글에서 셀이 네 줄로 보이는지 확인."
- "원인: 업스트림 타임아웃. 잠시 후 재시도한다."

No:
- ~~"혁신적인 워크플로우 경험을 제공합니다"~~
- ~~"성공적으로 완료되었어요! 🎉"~~
- ~~"죄송합니다. 문제가 발생했습니다"~~

Rules:
- Sentences under ~20 characters; paragraphs under 3 lines.
- **No emoji. No exclamation marks.** Ever.
- Buttons are a single verb: 저장 / 복사 / 보기 / 삭제 / 재시도. Never "저장하기" or "지금 시작하세요".
- Errors are cause + next action, and never apologise.
- Dates `2026.09.02`, times `14:22`. Numbers, ids and paths in mono; table numbers tabular-nums, right-aligned.
- Labels are uppercase English mono (`SELECTED WORK`, `META`, `RUNNING`); body copy is Korean. The label vocabulary is UI, not prose — do not translate it.
- First person is rare and never plural: there is no "we". The voice states what the tool does, or what the author did.
- No marketing adjectives (강력한, 혁신적인, seamless). Say what it does.
- Empty state copy says what accumulates here; loading copy says nothing at all (the skeleton is the message).

---

## VISUAL FOUNDATIONS

### Colour
Two themes, **one set of token names**; component markup does not change a single character between them. `data-theme="dark"` (default, also bound to `:root`) / `data-theme="light"`.

- Surfaces: `--bg` page · `--bg-2` one step in (sidebar, strip headers) · `--surface` card floor.
- Text: `--text` / `--text-2` / `--text-3`. Lines: `--line` / `--line-soft`.
- **`--accent` (#3ED49C) is shared by both themes and is for FILLS ONLY.** Text and 1px lines use `--accent-text` (#3ED49C dark, #0B6B4A light). Text on an accent fill is always `--on-accent`.
- Semantic (`--ok --warn --err --info` + `-weak`) is for state only, never decoration. Chart series `--chart-1…5`.
- **Maximum three accent occurrences per screen.** Four makes it a background, not an emphasis.
- 112 tokens in the original spec, plus this project's additions (z-index, density, print). **Zero literal colours in any class** — everything is `var()`. A page that states how many tokens or classes exist must measure them with `counts.js`; a hardcoded count drifts.
- Killed direction: "Paper" (cream + terracotta + hard shadows), dropped 2026.09.02. Warm tones, cream, beige, terracotta and hard shadows do not exist here. Do not revive them.

### Type
- One family for Korean and Latin alike: **Pretendard**. No separate Korean font.
- **JetBrains Mono** for labels, numbers, paths, code, dates, ids and state values only — never for sentences.
- Six sizes, no intermediate values: label 11 / small 13 / body 15 / h2 22 / h1 34 / display 66. Slides have their own ladder: display 132 / title 60 / h3 44 / body 32 / caption 24, with three label ranks — `--fs-slide-label` 24 (a box's own label, the content floor), `--fs-slide-micro` 20 (a secondary label inside a box), `--fs-slide-chrome` 20 (frame furniture only).
- Two weights: 400 and 600. **Nothing 700 or above.** Hierarchy comes from size, space and brightness — emphasis means going `--text-2` → `--text`, not going bold.
- **The uppercase mono label (11px / 0.14em / uppercase) is the system's only signature.** Keep it in every extension.
- Korean line breaking: `word-break: keep-all` + `text-wrap: pretty` globally; code and paths are exempt. Reading measure 660px.

### Shape, borders, shadows
- **Every radius token is `0px`** — including `--r-pill`. No circles either: status dots, avatars and switch knobs are all square.
- **No shadows.** `--shadow` and `--shadow-sm` are `none`. Depth is one step of `--surface` plus a 1px line.
- When more hierarchy is needed: a **3–4px accent bar on the left edge**. That is the shadow substitute, and the only one.
- Borders are 1px (`--bw`, `--hairline`); inner separators use `--line-soft`.
- Cards: `--surface` + 1px `--line`, square, no shadow. Interactive cards change **border colour only** on hover.
- Transparency and blur appear in exactly two places: the dialog scrim and the command palette scrim (`color-mix` ground + `blur(3px)`). Nowhere else.

### Spacing and layout
- **Multiples of four only**: 4 8 12 16 24 32 48 76. No eyeballed values.
- Three control heights: 32 / 38 / 44. No values between. Touch targets ≥ 44px.
- Site container 1120 (28px gutters) · reading measure 660 · app shell `268px + 1fr` · topbar 54.
- Two densities, same tokens: site is roomy, console rows are 34px (`data-density="console"`).
- Sibling groups are always flex/grid + `gap`. Never inline flow or per-element margins.
- **Layout grammar (`components/layout.css`)** is what makes two screens read as one system: `.gn-box` + one of three padding steps (16/24/32); a box uses its height either as `.gn-fill` (one stretching child) or `.gn-card-dist` (label/value/caption with the last child a footer strip) — mixing them is the amateur tell; `.gn-rows` divides a box's height across a list; grids are fixed column counts (`.gn-grid-2/3/4`, never `auto-fit`); `.gn-split` divides cells by lines, `.gn-pair` is a baseline label/value pair, `.gn-strip` is four hard numbers between two rules; `.gn-band` closes a view. **Dashed always means future** (`-future` on boxes, chips and bands). `.gn-pagehead` gives every document page the same four slots — kicker (scale, as a figure) / title (name) / lead (what the page decides) / strip — and level shows in the title size only.
- Document shell `.gn-page` → `.gn-page-body` (`156px` sticky section nav + `1fr`); a mockup wider than the column is scaled with `zoom`, never squeezed. Landing pages use `.gn-panels` / `.gn-panel` snap panels with `.gn-hero`.
- **Links carry no underline** anywhere; affordance is `--accent-text`, hover, or the shape the link sits in.
- Fixed elements: sticky topbar (z 60), toolbar under it, toaster bottom-right (z 300), drawer/dialog/palette above. Nothing else is pinned.

### Motion
- Three durations — 120ms colour, 180ms transform, 260ms enter — and **one easing**, `cubic-bezier(.2, .8, .2, 1)`.
- Hover and focus change **colour only**. Movement is capped at 4px; cards never lift, grow or scale.
- **Blinking exists in exactly two places**: the running status dot and the wordmark cursor. One blinking cursor per page.
- Banned: scroll parallax, staggered entrances, bounce/spring easing, anything over 300ms.
- `prefers-reduced-motion` stops every animation and transition (enforced globally in `tokens/motion.css`).

### States and focus
- Five states on every interactive element: default · hover · focus-visible · active · disabled. A missing one means unfinished.
- One focus ring everywhere: `outline: 2px solid var(--accent); outline-offset: 2px`, `:focus-visible` only — mouse clicks draw no ring.
- Contrast ≥ 3:1 in both themes. **State is never colour alone**: errors get a border plus a message, current position gets a left bar or an underline, status gets a square dot plus a word.

### Imagery
- **No stock photography.** Three kinds only: product screenshots, work-in-progress photos, colour-field placeholders.
- Ratios 16:9 · 4:3 · 1:1, never mixed within one screen. Screenshots always get a 1px border. Portraits are 1:1 and **greyscale** (`filter: grayscale(1)` is built into `Avatar`).
- Missing image → `--bg-2` or `--accent-weak` field with a mono uppercase label.
- **No text on top of images.** Two options only: beside the image (half bleed, so the text half keeps the same coordinates as every other screen), or `.gn-bleed` + `.gn-bleed-fade` (bottom 58%, 0.94 → 0) with the text in `.gn-bleed-text`. Captions sit below at 13px `--text-2`.
- The confirmed portrait treatment is a coarse monochrome halftone seen from behind — no faces, no colour, no gradients (`assets/about.png`).
- Product screenshot on file: `assets/pilo-tui.png` (Pilo TUI, 16:9, 1px border).

---

## ICONOGRAPHY

**The system has no icon set of its own, and none was drawn for it.**

1. **First choice: unicode glyphs set in the mono face.** `❯` prompt · `✳` agent · `└ │ ├` tree · `→ ↗` link · `▌` bar · `●` status · `×` close · `✓` check · `+ −` expand/collapse · `⋯` overflow · `⌘` key. The `Icon` and `IconButton` components take a `glyph` string; that is the whole API.
2. **Second choice, only when a glyph cannot carry it: Lucide**, stroke 1.5px on a 20px grid, loaded from CDN. Never mix the two sources on one screen. Nothing in this project currently uses Lucide.
3. **No emoji, anywhere.** No hand-rolled SVG icons.

**Logo / mark.** There is no symbol — the mark is typesetting: `garamnoh` in mono followed by a block cursor (0.52em × 0.92em), blinking at 1.06s. The cursor *is* the mark: "still writing". Sub-brands go after a slash (`garamnoh/lab`); only the slash is accent. Minimum width 88px, side clearance equal to the cap height. Never italicise, re-weight, gradient, shadow, two-colour, or rasterise the name.

**Files copied in** (`assets/`, from the upload — the only mark files that exist; do not redraw them):
`favicon.svg`, `favicon-32.png`, `favicon-16.png`, `icon-512.png`, `icon-512-light.png` — all the `g` + cursor lockup. Imagery: `pilo-tui.png` (product screenshot, 16:9), `about.png` (monochrome halftone portrait, 1:1).

---

## Index

Root
- `styles.css` — the only file consumers link. `@import` list, order matters.
- `boot.js` (theme + language before first paint) · `panels.js` (snap panels, section nav) · `counts.js` (measures the system's own tokens and classes)
- `readme.md` (this file) · `ELEMENTS.md` (full token and class reference, from the source) · `guidelines/rules.md` (the added operating rules) · `guidelines/extension-answers.md` (the answer to the brief's §17: what was built, what was refused, where each lives) · `SKILL.md` · `thumbnail.html`

Tokens (`tokens/`)
`fonts.css` · `colors.css` (2 themes, semantic, chart) · `zindex.css` *new* · `density.css` *new* · `typography.css` · `spacing.css` · `radius.css` (all 0) · `elevation.css` (no shadow, focus ring) · `motion.css` · `base.css` (element reset, Korean line breaking, `.gn-label`) · `deck.css` (slide aliases) · `print.css` *new*

Class layer (`components/`)
- `layout.css` — the frozen layout grammar: box, height shapes, rows, chips, bands, alignment, images, page shell, panels, page head. Where things go.
- `components.css` — the frozen `gn-*` parts layer. What things are.
- `extended.css` *added here* — the second `gn-*` layer for the added components. Same rules: tokens only, no literals, no radii, no shadows, no circles. (Its split pane is `.gn-pane*`; `.gn-split` belongs to the layout grammar.)
- `wordmark.css` · `snippets/{core,forms,feedback-nav-deck}.html` — copy-paste HTML, unchanged.

React components (53, grouped; each has `.jsx` + `.d.ts` + `.prompt.md`, and each directory has one Design System card)
- `components/core/` — Button, IconButton, Icon, Card, Badge, Tag, Table, Divider, Figure, Wordmark, Label, Container, Measure, Kbd, Avatar (+AvatarGroup)
- `components/forms/` — Field, Input, Textarea, Select, Checkbox, Radio, Switch, SegmentedControl, Slider, Stepper, Combobox (single + multi)
- `components/feedback/` — Dialog, Toast (+Toaster), Tooltip, StatusChip, Callout, Progress, Spinner, Skeleton (+SkeletonRows), EmptyState, ErrorState
- `components/navigation/` — TopBar, SideNav, Tabs, Breadcrumb, Pagination, Accordion, Menu (+MenuItem/MenuLabel/MenuSeparator/Popover), CommandPalette, Toolbar, Drawer
- `components/data/` — StatCard (+StatBand), CodeBlock, TreeView, FileList, LogViewer, Timeline, DiffViewer, BarChart
- `components/deck/` — SlideFrame, ChromeLayer

UI kits (`ui_kits/`, each with `index.html` + screens + `README.md`)
- `portfolio/` — home, work detail, writing index, about
- `console/` — dashboard, run list (with the loading/empty/error set), run detail, settings; ⌘K palette, live theme switch
- `docs/` — CLI reference page, search results
- `auth/` — login, three-step onboarding, 404, 500
- `landing/` — Pilo product page
- `mobile/` — three 375px screens showing how both densities fold

Slides (`slides/`) — 12 of the 32 dictionary layouts on the fixed 1920×1080 stage, plus `slides.css` (every coordinate read from `tokens/deck.css`: margin 108, hairlines 96/984, title 132/60px, meta 226, body 282→948) and `stage.js`. `README.md` lists the 19 layouts still undrawn.

Templates (`templates/`) — starting folders for consuming projects: `console-screen/` (268 + 1fr shell with nav, toolbar, KPI band, dense table, log) and `deck/` (four slides on the fixed deck geometry: cover, three-card title slide, accent colour field, closing invert). Each loads the system through its sibling `ds-base.js`.

Foundation cards (`guidelines/*.html`) — 30 specimen cards: Colors (7), Type (5), Spacing (4), Shape (1), Motion (2), Brand (4), Voice (1), Layout (6).

## Intentional additions

The frozen spec defined 30 `gn-*` components. The brief asked which of a longer wish-list is genuinely needed for a one-person system. Added (with a class layer in `extended.css`): Accordion, CommandPalette, Menu/Popover, Toolbar, Drawer, Pagination, Skeleton, Spinner, Progress (linear), Avatar, Kbd, CodeBlock, Callout, TreeView, FileList, LogViewer, Timeline, DiffViewer, StatCard, BarChart, EmptyState, ErrorState, Combobox, Slider, Stepper — plus `.gn-sr` / `.gn-skip` accessibility helpers and a `.gn-split*` utility.

Deliberately **not** built, with reasons, in `guidelines/rules.md` §11: circular progress and circular spinners (the system has no circles), DateInput/calendar, a context-menu component, overlapping avatar groups, a Resizer component, line/stacked/heatmap chart components, and a toast queue manager.
