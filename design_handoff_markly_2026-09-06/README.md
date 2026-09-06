# Markly — 개발 이관 패키지

2026.09.06 · 데스크톱(Tauri) 전체 화면 명세와 브랜드 자산.

```
handoff/
  README.md                  이 파일
  design/
    Markly App.dc.html       전체 23개 화면 명세 (여기서 시작)
    Markly Shell.dc.html     앱 셸 컴포넌트 (App이 import)
    Markly Identity.dc.html  로고·워드마크 확정 규격
    support.js               위 세 문서의 런타임
    _ds/                     garamnoh 디자인 시스템 (구현 의존성)
  assets/
    wordmark/                워드마크 SVG + PNG
    icon/                    앱 아이콘·작은 마크 SVG + PNG
    snippets.md              마크를 코드로 그리는 방법
```

## 1. 명세 문서 보기

`design/Markly App.dc.html`을 브라우저로 열면 된다. 빌드도 서버도 필요 없다.
파일 세 개와 `_ds/`, `support.js`가 같은 구조로 있어야 상대 경로가 맞는다.

- 화면은 전부 실제 크기 **1280 × 800**으로 그렸다.
- 우측 상단 **THEME** 버튼으로 문서 전체가 라이트/다크로 전환된다.
  마크업은 한 글자도 다르지 않다 — `data-theme` 속성 하나만 바뀐다.
- 화면이 1280px이므로 미리보기에서는 확대·이동해서 본다.

## 2. 화면 목록

| # | 화면 | # | 화면 |
|---|---|---|---|
| 00 | 구현 기준 (치수·토큰·모션) | 12 | 템플릿 편집 |
| 01 | Knowledge Inbox — 홈 | 13 | 설정 — 모양 |
| 02 | 리더 — 읽기 | 14 | 설정 — Base |
| 03 | 리더 + 아웃라인 | 15 | 설정 — 단축키 (전체 키맵) |
| 04 | Version-Aware Reader — 업데이트 | 16 | 설정 — 정보 |
| 05 | 줄 편집 — 원본 마크다운 | 17 | 첫 실행 — Base 고르기 |
| 06 | 리더 + Related Topics | 18 | 색인 중 · Base 준비됨 |
| 07 | Rabbit Hole | 19 | 결과 없음 · 큐 비움 |
| 08 | 검색 결과 | 20 | 편집 충돌 |
| 09 | 태그 결과 | 21 | 토스트 |
| 10 | 파일 트리 | 22 | 다크 표본 |
| 11 | 커맨드 팔레트 ⌘K | 23 | 구현 규칙 |

## 3. UI는 전부 디자인 시스템 컴포넌트다

명세의 모든 부품은 `_ds/_ds_bundle.js`가 노출하는 컴포넌트를 그대로 마운트한 것이다.
**새로 만든 위젯은 없다.** 직접 짠 것은 레이아웃 컨테이너뿐이다.

쓰인 컴포넌트:

```
Button IconButton Kbd Badge Tag Input SegmentedControl Switch
Table Callout Dialog Toast Toaster EmptyState Progress
DiffViewer CodeBlock TreeView SideNav Breadcrumb CommandPalette Label Icon
```

이 목록 밖의 부품은 만들지 않는다. 필요해 보이면 먼저 물어봐 달라.

컴포넌트 API는 디자인 시스템 원본의 `components/**/*.d.ts`에 있다.
색·간격·타입은 전부 `var(--*)` 토큰이며 하드코딩된 값이 없다 (`--accent` = `#3ED49C`).

**예외 하나**: 디자인 시스템의 `Wordmark` 컴포넌트는 이름이 `garamnoh`로 고정돼 있어
Markly 마크로 쓸 수 없다. 워드마크와 로고 타일만 자체 마크업이고, 규격은
`Markly Identity.dc.html`이 단일 소스다.

## 4. 브랜드 자산

마크는 심볼이 아니라 **조판**이다 — JetBrains Mono 400으로 짠 이름과 정사각 액센트 점.
그래서 앱 안에서는 이미지를 쓰지 말고 코드로 그린다. `assets/snippets.md`에 CSS가 있다.

이미지가 필요한 곳은 OS가 요구하는 자리뿐이다.

### 앱 아이콘

| 파일 | 용도 |
|---|---|
| `icon/icon-1024.png` | **Tauri 아이콘 원본.** `tauri icon icon-1024.png` 한 번으로 나머지 크기가 생성된다 |
| `icon/icon-tile.svg` | 같은 디자인의 벡터본 |
| `icon/icon-accent-1024.png` · `icon-tile-accent.svg` | 액센트 배경 변형 |
| `icon/mark-32.png` · `mark-16.png` | **자동 생성본을 이 두 개로 덮어써야 한다** (아래 참고) |

아이콘은 `font-size = 타일 × 0.192`로 짜여 있어 크기에 따라 비례한다.
따라서 1024 → 512/256/128/64 축소는 규격과 정확히 일치한다.

**32px 이하는 다른 마크를 쓴다.** 여섯 글자가 읽히지 않기 때문에 `m` + 점만 남기고,
`x-height = 타일 / 4`로 다시 짠다. 1024를 축소해서 만들면 규격이 깨지므로
`mark-32.png` / `mark-16.png`로 교체한다.

### 워드마크

| 파일 | 용도 |
|---|---|
| `wordmark/wordmark-ink.svg` · `-cream.svg` | 밝은 배경용 / 어두운 배경용 |
| `wordmark/wordmark-ink@3x.png` · `-cream@3x.png` | 폰트를 쓸 수 없는 곳(스토어·문서)용 |

**SVG의 글자는 살아 있는 텍스트다.** JetBrains Mono가 없는 환경에서 렌더하면
글자가 틀어진다. 외부 배포용이면 디자인 툴에서 텍스트를 윤곽선으로 변환하거나
PNG를 쓴다. 앱 안에서는 `snippets.md`의 CSS를 쓰는 것이 정답이다.

## 5. 구현 시 먼저 볼 것

- **00절 구현 기준** — 창 1280×800(최소 960×600), 타이틀바 54px, 사이드바 268px,
  오른쪽 패널 268px, 본문 측정폭 660px.
- **15절 단축키** — 구현해야 할 전체 키맵이 표 하나로 있다.
- **23절 구현 규칙** — 화면만 봐서는 알 수 없는 것:
  읽음 상태 모델(`lastReadVersion` vs `currentVersion`), 반응형 분기점(1120 / 960),
  Tauri 항목(drag region, 파일 감시 디바운스 300ms, 테마 우선순위, 외부 편집 처리),
  문구 규칙.

## 6. 문구 규칙

사실부터, 사과 없이, 감탄사 없이. 버튼은 동사 하나 — 저장 · 열기 · 읽음 · 재시도 · 취소.
날짜 `2026.09.06`, 시각 `14:22`. 숫자·경로·버전은 모노, 표의 숫자는 오른쪽 정렬 +
`tabular-nums`. 이모지는 쓰지 않는다.
