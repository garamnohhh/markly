#!/bin/sh
# pirep installer. Downloads the latest release and unpacks it into /Applications.
# Nothing else is touched: no sudo, no login items, no background agent.
set -eu

REPO=garamnohhh/pirep
URL=https://github.com/$REPO/releases/latest/download/pirep.app.tar.gz
DEST=${DEST:-/Applications}
APP=$DEST/pirep.app

die() { echo "" >&2; echo "$1" >&2; exit 1; }

# 1. macOS on Apple silicon only, for now.
[ "$(uname -s)" = "Darwin" ] || die "pirep는 지금 macOS만 지원해요. Windows와 Linux는 준비 중이에요."
[ "$(uname -m)" = "arm64" ] || die "pirep는 지금 Apple 실리콘(arm64)만 지원해요. 이 맥은 $(uname -m) 이에요."

# 2. /Applications has to be writable without sudo.
mkdir -p "$DEST" 2>/dev/null || true
[ -w "$DEST" ] || die "$DEST 에 쓸 수 없어요. 다음 한 줄로 홈 폴더에 설치하세요:
  curl -fsSL https://pirep.pages.dev/install.sh | DEST=\"\$HOME/Applications\" sh"

# 3. Say what happens to an existing copy, then do it.
if [ -d "$APP" ]; then echo "이미 있는 $APP 를 새 버전으로 덮어써요."; fi

echo "받는 중… $URL"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
curl -fsSL "$URL" -o "$TMP/pirep.app.tar.gz" || die "내려받지 못했어요. 인터넷 연결을 확인하거나 $URL 를 브라우저에서 열어 보세요."
tar -xzf "$TMP/pirep.app.tar.gz" -C "$TMP" || die "압축을 풀지 못했어요. 받은 파일이 깨졌을 수 있어요."
[ -d "$TMP/pirep.app" ] || die "받은 파일 안에 pirep.app 이 없어요."

rm -rf "$APP"
mv "$TMP/pirep.app" "$APP"
xattr -dr com.apple.quarantine "$APP" 2>/dev/null || true

echo ""
echo "설치했어요 → $APP"
echo "여는 방법:  open -a pirep"
echo "지우는 방법: rm -rf $APP"
