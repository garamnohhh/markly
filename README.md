# Markly

로컬 Markdown 문서를 읽고 편집하며 외부 변경 이력을 검토하는 macOS 앱.

## 지원 환경

- Apple Silicon 전용
- macOS 27.0 Apple Silicon 기기 한 대에서만 확인
- 다른 macOS 버전과 Intel Mac은 미확인

## 설치

배포 준비 중.

## 소스 빌드

Node.js, pnpm, Rust 설치 필요.

```bash
pnpm install
pnpm tauri build
```

빌드 결과물은 `src-tauri/target/release/bundle/`에 생성.

## 데이터 위치

- 문서와 변경 이력: 선택한 Base 폴더와 그 안의 `.markly/`
- WebView 데이터: `~/Library/WebKit/com.garamnoh.markly`

Markly 제거 전에 필요한 문서는 별도 백업 권장.

## 제거

1. `Markly.app` 삭제.
2. 변경 이력이 필요 없으면 각 Base의 `.markly/` 삭제.
3. WebView 설정과 캐시까지 지우려면 `~/Library/WebKit/com.garamnoh.markly` 삭제.

## 라이선스

Markly는 [Apache License 2.0](LICENSE)으로 배포.
번들 폰트는 [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) 참고.
