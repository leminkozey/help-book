#!/usr/bin/env bash
# Help Book installer / updater.
# Usage: ./install.sh [version]   (defaults to latest)
# Env:   HELP_BOOK_DIR=path/to/help   (defaults to ./help)

set -euo pipefail

REPO="leminkozey/help-book"
VERSION="${1:-latest}"
TARGET="${HELP_BOOK_DIR:-./help}"

for cmd in curl unzip; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "[help-book] missing required command: $cmd" >&2
    exit 1
  }
done

if [ "$VERSION" = "latest" ]; then
  VERSION=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | grep -m1 '"tag_name"' \
    | cut -d'"' -f4)
  if [ -z "$VERSION" ]; then
    echo "[help-book] could not resolve latest version" >&2
    exit 1
  fi
fi

URL="https://github.com/$REPO/releases/download/$VERSION/help-book-$VERSION.zip"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

echo "[help-book] downloading $VERSION..."
if ! curl -fsSL -o "$TMP/code.zip" "$URL"; then
  echo "[help-book] download failed: $URL" >&2
  echo "[help-book] check available releases: https://github.com/$REPO/releases" >&2
  exit 1
fi

mkdir -p "$TARGET"

if [ -f "$TARGET/chapters.json" ]; then
  MODE="update"
else
  MODE="install"
fi

unzip -oq "$TMP/code.zip" -d "$TARGET"

if [ "$MODE" = "install" ]; then
  echo "[help-book] first install — adding starter content"
  cat > "$TARGET/chapters.json" <<'JSON'
{
  "title": "My Project Help",
  "version": "v1.0.0",
  "accent": "#e8791d",
  "chapters": [
    { "id": "getting-started", "title": "Getting Started", "file": "chapters/01-getting-started.md" }
  ]
}
JSON
  mkdir -p "$TARGET/chapters"
  cat > "$TARGET/chapters/01-getting-started.md" <<'MD'
# Getting Started

Welcome to your new Help Book. Edit `chapters.json` to add chapters,
drop more markdown files in `chapters/`, and customise the accent color.
MD
fi

echo "[help-book] $MODE complete — $VERSION ready in $TARGET"
echo "[help-book] serve it with any static server, e.g.: cd $TARGET && python3 -m http.server 8082"
