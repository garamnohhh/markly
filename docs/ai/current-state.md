# Markly — Current State

> Local-first, version-aware markdown reader/editor. "Read, don't manage."
> Tauri v2 + React 19 + TS + Tailwind v4 + Zustand. Rust 백엔드.

## 구현 현황 (Phase 0–7 완료)

| Phase | 내용 | 상태 |
|-------|------|------|
| 0 | Tauri+React 스캐폴드, frameless 창 (macOS Overlay) | ✅ |
| 1 | 디자인 토큰, 3열 셸, 다크모드 | ✅ |
| 2 | Rust vault 백엔드 (9 커맨드), word-level diff | ✅ (test 2/2) |
| 3 | 온보딩, vault picker, 시작 스캔 | ✅ |
| 4 | Reader: markdown-it 렌더, ⌘E edit, auto-save, Reading Queue, FileTree | ✅ |
| 5 | Knowledge Inbox, Diff View (combined/step, mark-read, revert) | ✅ |
| 6 | ⌘K Command Palette, Settings | ✅ |
| 7 | Outline, Properties(frontmatter), editorWidth, rescan | ✅ |

## 검증

- `pnpm exec tsc --noEmit` → 0 에러
- `pnpm exec vite build` → OK (mermaid 동적 청크 분리)
- `cargo test` → 2 passed (scan→version→diff→mark_read, word_diff)
- `cargo check` → OK
- GUI: 사용자 `pnpm tauri dev`로 창 확인. **frontend HMR 반영됨.**

## 아키텍처

### 데이터 (`<vault>/.markly/`)
```
db.json                  # 인덱스 + settings (원자적 tmp→rename)
snapshots/<key>/vN.md    # 버전별 전체 텍스트
changes/<key>.json       # 변경 레코드 배열 (ops 포함)
```
`<key>` = docId의 `/`→`__` 치환. docId = vault-relative 소문자 경로.
unreadCount = currentVersion − lastReadVersion.

### Rust 커맨드 (src-tauri/src/commands.rs)
`scan_vault · read_doc · write_doc · mark_read · list_updates · diff · list_changes · revert · create_doc`
vault root는 `VaultState(Mutex<Option<PathBuf>>)` managed state. scan_vault가 설정.

### 프론트 구조
```
src/
  store/index.ts          # Zustand 단일 스토어 (persist: theme/vaultRoot/editorWidth/scanOnStartup)
  lib/ invoke.ts types.ts markdown.ts editor.ts fuzzy.ts
  screens/ Onboarding MainApp KnowledgeInbox DiffView Settings EmptyVault
  components/
    layout/ AppShell TitleBar Sidebar
    reader/ DocReader MarkdownRenderer UpdateNoticeBar OutlinePanel PropertiesPanel
    sidebar/ ReadingQueue FileTree
    ui/ Logo Badge SegmentedControl CommandPalette
  hooks/ useKeymap useDarkMode
```

### 키맵
⌘\ 사이드바 · ⌘E read/edit · ⌘K 팔레트 · Esc 팔레트 닫기

## 실행

```bash
export PATH="$HOME/.cargo/bin:$PATH"
pnpm tauri dev
```
온보딩 → "Choose a Base" → `demo-vault/` 선택 (샘플 노트 3개 포함).

## ⚠️ 주의 — Rust 변경은 HMR 안 됨
Phase 2–7에서 Rust 커맨드 추가/변경됨. 사용자가 켜둔 기존 dev 바이너리는
구버전일 수 있음 → **`pnpm tauri dev` 재시작** 해야 9개 커맨드 전부 로드됨.
프론트는 HMR 자동 반영.
