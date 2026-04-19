#!/usr/bin/env bash
# Help Book installer / updater.
# Usage: ./install.sh [version]   (defaults to latest)
# Env:   HELP_BOOK_DIR=path/to/help   (defaults to ./help)

set -euo pipefail

REPO="leminkozey/help-book"
VERSION="${1:-latest}"
TARGET="${HELP_BOOK_DIR:-./help}"
MARKER=".help-book-installed"
TAG_RE='^v[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$'
EXPECTED=(index.html help.css help.js logo.svg)

for cmd in curl unzip mkdir mktemp; do
  command -v "$cmd" >/dev/null 2>&1 || {
    echo "[help-book] missing required command: $cmd" >&2
    exit 1
  }
done

# refuse to write to obvious system paths or $HOME directly (closes #5)
# GNU realpath has -m for missing paths; macOS realpath doesn't — fall back gracefully
resolve_target() {
  local out
  if command -v realpath >/dev/null 2>&1; then
    if out=$(realpath -m "$1" 2>/dev/null); then printf '%s' "$out"; return; fi
    if out=$(realpath "$1" 2>/dev/null); then printf '%s' "$out"; return; fi
  fi
  printf '%s' "$1"
}

abort_if_unsafe_target() {
  local resolved
  resolved=$(resolve_target "$1")
  # block system paths; include /private/* siblings because macOS realpath normalises /etc → /private/etc
  # do NOT block /var entirely — macOS user-tmp lives in /var/folders/.../tmp.XXX
  case "$resolved" in
    /|/etc|/etc/*|/private/etc|/private/etc/*|/usr|/usr/*|/private/usr|/private/usr/*|/bin|/bin/*|/sbin|/sbin/*|/lib|/lib/*|/boot|/boot/*)
      echo "[help-book] refuse to install into system path: $resolved" >&2
      exit 1
      ;;
  esac
  if [ -n "${HOME:-}" ] && { [ "$resolved" = "$HOME" ] || [ "$resolved" = "$HOME/" ]; }; then
    echo "[help-book] refuse to install directly into \$HOME ($HOME) — choose a sub-directory" >&2
    exit 1
  fi
}

abort_if_unsafe_target "$TARGET"

# resolve "latest" via GitHub API
if [ "$VERSION" = "latest" ]; then
  VERSION=$(curl -fsSL --connect-timeout 10 --max-time 30 --retry 2 --retry-delay 1 \
    "https://api.github.com/repos/$REPO/releases/latest" \
    | grep -m1 '"tag_name"' \
    | cut -d'"' -f4 || true)
fi

# strict tag whitelist — never embed an unvalidated string into a URL (closes #1)
if ! [[ "$VERSION" =~ $TAG_RE ]]; then
  echo "[help-book] refuse to use unrecognised version tag: '$VERSION'" >&2
  echo "[help-book] expected format vX.Y.Z (with optional -pre suffix)" >&2
  echo "[help-book] check available releases: https://github.com/$REPO/releases" >&2
  exit 1
fi

URL="https://github.com/$REPO/releases/download/$VERSION/help-book-$VERSION.zip"
TMP=$(mktemp -d)
# trap on all common exit signals (closes #17)
trap 'rm -rf "$TMP"' EXIT INT TERM HUP

echo "[help-book] downloading $VERSION..."
# bounded curl with retry (closes #18)
if ! curl -fsSL --connect-timeout 10 --max-time 120 --retry 2 --retry-delay 1 \
     -o "$TMP/code.zip" "$URL"; then
  echo "[help-book] download failed: $URL" >&2
  echo "[help-book] check available releases: https://github.com/$REPO/releases" >&2
  exit 1
fi

# integrity check (closes #8)
if ! unzip -tq "$TMP/code.zip" >/dev/null 2>&1; then
  echo "[help-book] downloaded zip failed integrity check" >&2
  exit 1
fi

# extract to a fresh tmp dir — limits any zip-slip damage to /tmp
EXTRACT="$TMP/extract"
mkdir -p "$EXTRACT"
unzip -oq "$TMP/code.zip" -d "$EXTRACT"

# require exactly the files we expect (closes #8 sanity)
for f in "${EXPECTED[@]}"; do
  if [ ! -f "$EXTRACT/$f" ]; then
    echo "[help-book] zip missing expected file: $f" >&2
    exit 1
  fi
done

mkdir -p "$TARGET"

# mode detection via marker file with legacy fallback (closes #7, #9)
if [ -f "$TARGET/$MARKER" ]; then
  MODE="update"
elif [ -f "$TARGET/chapters.json" ]; then
  MODE="update"
elif [ -d "$TARGET/chapters" ] && [ -n "$(ls -A "$TARGET/chapters" 2>/dev/null)" ]; then
  # chapters/ has user content but chapters.json is missing — warn explicitly so user notices
  echo "[help-book] WARNING: chapters/ has files but chapters.json is missing" >&2
  echo "[help-book] not writing a starter — create your own chapters.json to wire up these chapters" >&2
  MODE="update"
else
  MODE="install"
fi

# whitelist-copy: only the 3 expected files land in $TARGET — defeats zip-slip (closes #2)
# refuse to overwrite a symlinked target file (TOCTOU mitigation)
for f in "${EXPECTED[@]}"; do
  if [ -L "$TARGET/$f" ]; then
    echo "[help-book] refuse to overwrite symlink: $TARGET/$f" >&2
    exit 1
  fi
  cp -f "$EXTRACT/$f" "$TARGET/$f"
done

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

# stamp marker with installed version (used for next run's mode detection)
printf '%s\n' "$VERSION" > "$TARGET/$MARKER"

echo "[help-book] $MODE complete — $VERSION ready in $TARGET"
echo "[help-book] serve it with any static server, e.g.: cd $TARGET && python3 -m http.server 8082"
