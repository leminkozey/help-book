# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.0] - 2026-04-18

### Added
- `scripts/install.sh` — one-line installer/updater for downstream projects (`curl ... | bash`)
- Release workflow publishes a code-only ZIP asset (`help-book-vX.Y.Z.zip`) on every tag, containing only `index.html`, `help.css`, `help.js`
- README documents install, version-pinned install, custom target dir, manual ZIP download, and inspect-before-run flow
- `.help-book-installed` marker file for robust install/update detection

### Changed
- Default accent reverted from Mintlify green (`#18E299`) back to warm orange (`#e8791d`); `--help-accent-deep` and `--help-accent-light` adjusted to matching tones
- Release workflow: ZIP is built from the tag commit (via `git archive`), attached atomically through `gh release create` (avoids release-without-asset state on partial failure)
- Release workflow: drop unused `pull-requests:write` permission; `git push` retries 3× with rebase + backoff
- README manual-download snippet now resolves the latest tag dynamically and uses `unzip -n` to never overwrite existing files
- Code cleanup: removed decorative section-header comments across `help.js`, `help.css`, `changelog.mjs`; kept WHY-comments

### Fixed
- Five hard-coded `rgba(24,226,153,...)` (green) sites in `help.css` — selection, search-glow, code-highlight, sidebar-active and TOC-active backgrounds now use the orange accent
- changelog.mjs: removed dead `BODY_REF_RE` loop
- changelog.mjs: resolve `CHANGELOG.md` against `GITHUB_WORKSPACE` (CWD fallback) so local invocation from a subdir writes to the right path

### Security
- installer: validate version tag against `^v[0-9]+\.[0-9]+\.[0-9]+(-pre)?$` before embedding in URLs (defeats injection via crafted API response or CLI arg)
- installer: abort on unsafe `HELP_BOOK_DIR` (system paths, `$HOME` directly)
- installer: extract ZIP to a fresh tmp dir then whitelist-copy only the 3 expected files (defeats zip-slip + symlink-follow); refuse to overwrite symlinked target files (TOCTOU mitigation)
- installer: integrity check via `unzip -tq`; bounded `curl --connect-timeout/--max-time/--retry`; trap covers `EXIT INT TERM HUP`
- workflow: every `${{ }}` in `run:` blocks is mapped through `env:` first (defeats script-injection via crafted `workflow_dispatch` tag input or malicious tag name); explicit tag-format validation
- workflow: `set -euo pipefail` at the top of every `run:` block
- changelog.mjs: escape Markdown special chars in commit subjects + scopes before rendering (prevents phishing links / HTML injection in auto-generated release notes)

## [2.0.0] - 2026-04-18

### Changed (BREAKING)
- Complete visual redesign inspired by Mintlify and macOS Settings
- Default brand accent switched from orange (`#e8791d`) to Mintlify green (`#18E299`) — still overridable via `chapters.json`
- Typography swapped to Inter (UI/body) and Geist Mono (code/labels), loaded from Google Fonts
- Layout reworked: floating sidebar bubble (full viewport height, fixed left), header fixed top with backdrop blur edge-to-edge, content runs full-width and anchors left
- TOC bar moved from a separate sticky band into the header center
- Title moved from header into the sidebar bubble
- All section dividers and border-lines removed in favour of whitespace and subtle background tints
- Code blocks, tables, prev/next cards use 16px radius and 5%-opacity borders
- Search input and copy buttons reshaped to pills (radius 9999px)

### Added
- Mintlify-inspired `DESIGN.md` reference at repo root (via `npx getdesign`)
- CSP `<meta>` policy with strict allowlist
- Color-scheme `<meta>` and FOUC-preventing inline theme bootstrap
- ARIA: skip-link, combobox search pattern, `aria-pressed`/`aria-expanded` sync, focus trap on Esc
- `prefers-color-scheme` change listener (auto-follow OS while no manual choice exists)
- Cross-tab theme sync via `storage` event (falls back to OS pref when storage cleared)
- `prefers-reduced-motion` and `@supports not (backdrop-filter)` fallbacks
- `@media print` stylesheet
- Production deployment notes in README (security headers, hardened express config, symlink warning)
- iPhone safe-area insets for sidebar and header

### Fixed
- Race condition in `navigate()`: stale fetch could overwrite newer chapter — now bails on `navId !== currentId`
- `hashchange` re-entry: `currentId` set before hash update, plus `decodeURIComponent` to handle percent-encoded ids
- `scrollSpyLocked` leaked when a chapter had fewer than two `<h2>`s — now released
- Sidebar group did not auto-expand when navigating to a child via hash or search
- Mobile overlay z-index was below the header (49 → 105) — overlay now covers the header
- Skip-link was hidden behind the fixed header — now `position: fixed`
- TOC `justify-content: center` collapsed the scroll start at many items — now `safe center`
- 4px misalignment between header content and article body
- Sidebar `border-radius` clipped the scrollbar — sidebar now `overflow: hidden`, inner `<ul>` scrolls
- Inline code lost its visual hierarchy in dark mode (now uses `--help-bg-secondary`)
- Memory leaks: copy buttons and TOC links use event delegation, single timer for `scrollToHeading`
- Mobile sidebar slid under iPhone notch — now respects `env(safe-area-inset-top)`

### Security
- Explicit DOMPurify config: `ALLOWED_URI_REGEXP`, `FORBID_TAGS`, `FORBID_ATTR`, controlled `target`/`rel`
- Validate `accent` (CSS-color regex) and `chapter.file` (path regex with traversal-depth guard) from `chapters.json`
- Object maps switched to `Object.create(null)` (prototype pollution dicht)
- `target="_blank"` links get `rel="noopener noreferrer"`
- `referrerpolicy="no-referrer"` on all CDN tags
- Removed `frame-ancestors` from `<meta>` CSP (only valid as HTTP header)
- README documents required production headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)

## [1.1.0] - 2026-03-30

### Security
- XSS protection: Markdown output sanitized with DOMPurify before rendering
- SRI hashes on all CDN scripts (marked.js, highlight.js, DOMPurify)
- HTML injection: chapter IDs escaped with `encodeURIComponent` in href attributes

### Fixed
- Search race condition: chapters fully preloaded before search is enabled
- TOC bar gap: sidebar and layout dynamically adjust when TOC bar is hidden (56px) vs visible (92px)
- Config loading: response status checked before parsing JSON
- Copy buttons always visible on code blocks with proper light/dark mode support

### Changed
- Removed unused global `config` variable
- Replaced DOM-based `escapeHtml` with efficient string replacement

## [1.0.0] - 2026-03-30

### Added
- Standalone drop-in documentation system (no build step, no npm)
- Sidebar navigation with nested chapters
- Sticky TOC bar with scroll spy for in-page sections
- Full-text search across all chapters (Ctrl+K / Cmd+K)
- Dark / light theme with system preference detection
- Syntax highlighting via highlight.js with copy buttons
- Previous / next chapter navigation
- Mobile responsive with sidebar overlay
- Customizable accent color via `chapters.json`

### Fixed
- TOC bar: reset state on chapter change, correct scroll offset
- Light mode code blocks and prev/next navigation bug
- Dark mode: neutral gray/black instead of blue-tinted Catppuccin

[Unreleased]: https://github.com/leminkozey/help-book/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/leminkozey/help-book/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/leminkozey/help-book/compare/v1.1.0...v2.0.0
[1.1.0]: https://github.com/leminkozey/help-book/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/leminkozey/help-book/releases/tag/v1.0.0
