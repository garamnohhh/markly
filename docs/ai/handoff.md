# Markly — Handoff

## 요약
Plan(`~/.claude/plans/markly-app-elegant-tiger.md`) Phase 0–7 전부 구현 완료.
빌드·테스트 전부 green. MVP 동작 가능.

## 지금 바로 할 일 (사용자)
1. 기존 `pnpm tauri dev` 종료 후 **재시작** (Rust 백엔드 9커맨드 로드 위해).
2. 온보딩 → "Choose a Base" → `demo-vault/` 선택.
3. 테스트 흐름:
   - 노트 클릭 → 렌더 확인
   - ⌘E → 편집 → 1.5초 후 auto-save ("Saved")
   - 외부에서 `demo-vault/Notes/ideas.md` 수정 → 사이드바 "↻ Rescan Base" → Inbox에 update 카드
   - 카드 "View changes" → word-level diff (combined/step)
   - "Mark as read" / "Revert"
   - ⌘K 팔레트, ⌘\ 사이드바, Settings(테마/너비)

## 변경 파일 (전체 신규)
- `src-tauri/src/`: lib.rs, commands.rs, vault/{mod,db,snapshot,change,diff,hash}.rs
- `src-tauri/Cargo.toml` (sha2/hex/similar/walkdir/dialog), tauri.conf.json, capabilities/default.json
- `src/`: App.tsx, index.css, store/, lib/, screens/, components/, hooks/
- `vite.config.ts` (tailwind plugin), `pnpm-workspace.yaml` (esbuild allowBuild)
- `demo-vault/` (샘플 노트 3개)

## 검증 명령
```bash
pnpm exec tsc --noEmit          # 0 에러
pnpm exec vite build            # OK
cd src-tauri && cargo test      # 2 passed
```

## 남은 작업 (우선순위)
1. **GUI 실사용 검증** — 클릭 단위 동작은 아직 사람 확인 필요 (자동화 안 됨)
2. mark-read-on-close, readLock off 동작 (현재 항상 read-lock)
3. 파일 rename/delete, pin 토글 UI
4. Related Topics 패널, Rabbit Hole, 모바일
5. 번들 빌드(`pnpm tauri build`) + 아이콘 교체 (현재 스캐폴드 기본 아이콘)
6. 청크 분할 경고 (index 822KB) — 필요 시 manualChunks

## 수정 이력
- **화이트 화면 = 무한 렌더 루프 (근본 원인, 해결)**: `useDocs`가 `Object.values()`로
  매 렌더 새 배열 반환 → zustand v5가 변경으로 오인 → "Maximum update depth exceeded".
  MainApp 경로(scan 성공 시)에서만 `useDocs` 호출 → 브라우저(invoke 실패→onboarding)는
  멀쩡, Tauri(invoke 성공→MainApp)만 백지. `useShallow`로 해결. (store/index.ts)
  playwright로 빈 db 주입해 재현·검증 완료.
- main.tsx: 전역 error/unhandledrejection 핸들러 + ErrorBoundary → WebView 콘솔 없이도
  런타임 에러가 화면에 빨간 텍스트로 표시 (진단 + 안전망).
- App.tsx/store.rescan: 시작 스캔 실패 시 onboarding 폴백, Loading 탈출 버튼.
- **타이틀바/드래그**: tauri.conf.json `trafficLightPosition {x:16,y:16}` (46px 바 수직 중앙).
  TitleBar 좌/우 그룹 분리 + 가운데 `data-tauri-drag-region` flex-1 드래그존, 좌측 88px
  여백으로 신호등 회피. SegmentedControl nowrap.
  ⚠️ **window 설정 변경은 HMR 안 됨 → tauri dev 재시작 필요.**

## 2차 수정 (5개 이슈)
1. **창 드래그** — `core:window:allow-start-dragging` 권한 추가 (capabilities/default.json). ⚠️ 재시작 필요.
2. **타이틀바 정렬** — trafficLightPosition + 좌/우 그룹 분리. ⚠️ window 설정은 재시작 필요.
3. **mermaid 렌더 안 됨** — MarkdownRenderer effect가 캡처한 블록 노드가 async(import) 해소 시점에 detach됨(StrictMode/re-render). `.then` 안에서 `ref.current` 재조회 + `pre.isConnected` 가드로 해결. playwright 검증(diagrams:1).
4. **mermaid 에러 전체화면 오버레이** — lib/mermaid.ts `suppressErrorRendering:true` + 단일 init.
5. **편집 모드 전체 raw** — BlockEditor.tsx 신규. Typora식 블록 편집: 클릭한 블록만 textarea(raw), 나머지 렌더 유지. splitBlocks(markdown.ts)로 top-level 블록 분할. CodeMirror(editor.ts) 제거. playwright 검증.

진단용 `window.__store` (dev-only, import.meta.env.DEV 가드) 유지 — 디버깅 편의.

## 3차 수정 (마크다운 속성·에디터·mermaid)
1. **렌더러 확장** — KaTeX(수식 `$..$ $$..$$`), task-list(`- [ ]`), 콜아웃(`> [!note]` 등) 추가.
   - deps: katex, @vscode/markdown-it-katex, markdown-it-task-lists
   - lib/markdown-callouts.ts (커스텀 plugin), index.css 콜아웃/태스크/katex 스타일, main.tsx에 katex CSS import
   - test.md(`/Users/you/workspace/markly-test/Project/test.md`)를 전체 속성 시연용으로 재작성
2. **에디터 = CodeMirror 6 라이브프리뷰** (BlockEditor 폐기). @retronav/ixora로 단일 연속 에디터:
   커서 줄만 raw, 나머지 마크 숨김 + 인라인 스타일(bold/italic/code/heading). 키보드 방향키 연속 네비 OK.
   - lib/editor.ts (createLiveEditor + HighlightStyle), components/reader/LiveEditor.tsx
   - deps: @retronav/ixora, @lezer/highlight
   - ⚠️ edit 모드에서 mermaid/math/표는 리치 렌더 아님(소스/스타일로 표시) — read 모드는 완전 렌더. 추가 위젯화는 추후.
3. **mermaid 재렌더 버그 해결** — DOM 수술(pre.replaceWith) 폐기, MermaidDiagram React 컴포넌트 + 코드별 SVG 캐시.
   parseDoc()가 mermaid fence를 별도 세그먼트로 분리 → React 소유 → view↔edit 토글에도 유지. playwright 검증(view1/edit1/view1).

## 4차 수정 (디자인 정합·브랜드·구조)
- **제목 = 파일명 기준**(결정). docName/docDirs(types.ts) → Queue/타이틀바/Files/Inbox/Diff/팔레트 일관 적용.
- **브랜드 에셋 반입** — `src/assets/brand/`(mark/app-icon/wordmark) + `public/brand/`(favicon). Logo=정본 mark 지오메트리, 타이틀바=스쿼클 AppIcon(app-icon SVG). index.html favicon/title.
- **타이틀바 재작성**(디자인 원천 Markly.dc.html 준수): 중앙 breadcrumb = [스쿼클 아이콘]›dir›file, **세그먼트별 hover/click**(로고→base, 파일→scrollTop, 폴더→coming soon). 워드마크 제거(아이콘만). Edit/Done(연필/체크)·outline 토글(⌘⇧\)·settings. 좌측 82px 신호등 여백.
- **TOC**: 양쪽 모드에서 표시(헤딩을 source에서 계산), outline 토글, 스크롤 progress%, **active 헤딩 하이라이트(scroll-spy)**.
- **편집 커서**: frontmatter 건너뛰고 body 시작에 위치(bodyOffset). activeLine 하이라이트 추가.
- **스크롤 보존**: read↔edit 토글 시 스크롤 비율 유지(useLayoutEffect).
- 사이드바 탭 라벨 "Queue"/"Files"(디자인 일치).
- `docs/ai/user-tasks.md` 신설 — 폴더뷰 화면/편집모드 리치렌더/More메뉴 등 **네가 결정/제공할 항목**.

### 알려진 한계(= user-tasks.md)
- 편집 모드에서 수식/mermaid/표/콜아웃은 raw 소스(ixora 텍스트 마크업만). 읽기 모드는 완전 렌더.
- 폴더 세그먼트 클릭 = 미구현(화면 없음). read↔edit 스크롤은 비율 근사(완전 일치 불가).

## 5차 수정 (디자인 정독 반영)
- **편집 = 전부 raw** (ixora 제거). 플레인 CodeMirror 소스 에디터(mono + 좌측 잉크 보더, 디자인 edit 블록 스타일). lib/editor.ts createSourceEditor, components/reader/SourceEditor.tsx.
- **편집↔읽기 스크롤 동기화** — 헤딩 슬러그 앵커. 편집 시 커서 근처 헤딩 추적 → 읽기 복귀 시 그 헤딩으로 스크롤(방금 수정한 위치 유지). DocReader anchorSlug.
- **Properties 축약 실데이터** — status 뱃지(녹점+값)·#tags·updated 날짜·pin 아이콘 표시(디자인 line 341-348). 펼치면 status/tags/created/updated/pinned 전체 행. PropertiesPanel 재작성.
- **타이틀바 정렬 해결** — `decorations:false` + **커스텀 신호등**(빨/노/초, 46px 바 수직중앙, Tauri window close/minimize/toggleMaximize 연결). 네이티브 신호등 위치 추측 불필요 → 정렬 확정. capabilities에 window 제어 권한 추가.
- 에디터 패딩 디자인값(56/64/120), 헤딩 앵커 outline.
- 미사용 dep 제거(@retronav/ixora, @lezer/highlight).
- ⚠️ `decorations:false`는 window 설정 → **tauri dev 재시작 필요**. 각진 모서리 트레이드오프(user-tasks #6).

## 6차 수정 (창/타이틀바 네이티브화)
- **라운드 모서리** — window `transparent:true` + `shadow:true` + app `macOSPrivateApi:true`(Cargo feature `macos-private-api`). index.css: body 투명, #root border-radius 12px + overflow hidden.
- **타이틀바 높이 46→38px**(VSCode/Obsidian 수준), **신호등 11→12px(표준 macOS 컬러 유지)**, 타이틀바 아이콘 15→16px, 좌우 패딩 18px.
- ⚠️ window 설정(transparent/decorations) → **tauri dev 재시작 필요**. transparent+decorations:false라 엣지 리사이즈 제약 가능(필요 시 커스텀 리사이즈 핸들).

## 알려진 이슈
- 이전 세션 orphan 프로세스 PID 49545 (target/debug/markly-app, ppid=1) 떠 있을 수 있음 — 불필요하면 사용자가 종료.
- 패키지/크레이트명 여전히 `markly-app` (productName만 Markly). 원하면 정리.
