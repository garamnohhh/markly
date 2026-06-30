# Markly — Decisions

| 결정 | 선택 | 이유 / tradeoff |
|------|------|-----------------|
| Markdown 렌더 | markdown-it | read-first, 5KB. Milkdown/MDX는 과함 |
| 인라인 edit | CodeMirror 6, **mode-switch** | Typora식 블록 오버레이는 decoration 매핑 비용 큼 → v1.5. v1은 read↔edit 통째 전환 |
| Rust diff | `similar` crate | pure-Rust LCS, word-level. diff-match-patch Rust 바인딩 비공식 |
| diff 저장 | 온더플라이 계산 | 스냅샷에서 매번 계산. change record엔 ops 캐시 |
| DB | JSON flat file | `.markly/db.json` 원자적 tmp→rename. SQLite는 v2 (대용량 vault 시) |
| storage key | docId `/`→`__` | 평면 이스케이프. "__" 포함 실파일명과 충돌 가능 (v1 허용) |
| 라우팅 | Zustand `view` 필드 | 데스크톱앱, URL 불필요 → router 라이브러리 안 씀 |
| 스토어 | 단일 파일 | slice 6개 분리 대신 1개. 페이즈별 확장 (ponytail) |
| html 렌더 | markdown-it `html:false` | vault 파일(AI/sync 출처) raw HTML 실행 차단 (trust boundary) |
| frontmatter | flat `key: value` 줄 파싱 | 전체 YAML 엔진 안 씀. 중첩은 raw 표시 (v1) |
| 파일 watcher | 없음 | 설계 명시. 시작 스캔 + 수동 rescan만. 배터리/복잡도 절감 |
| Settings 범위 | theme/width/scanOnStartup만 | dead toggle 회피 — 실제 동작하는 것만 노출 |
| 창 | macOS `titleBarStyle: Overlay` + `hiddenTitle` | 네이티브 신호등 유지 + 커스텀 타이틀바. `decorations:false`는 신호등 사라짐 |

## 미구현 (의도적 v1 제외)
- 모바일(iOS) — 설계상 v1 제외
- Git 통합 — phase 2/3
- AI 사이드카(meta/) 읽기 — 스키마만, UI 미연결
- Typora식 블록 인라인 edit — v1.5
- 파일 rename/delete UI, Related Topics 패널, Rabbit Hole 화면
- 전역 toast — 인라인 "Saved" 피드백으로 충분 (YAGNI)
