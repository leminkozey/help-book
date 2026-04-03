# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
- SRI hashes and DOMPurify for CDN scripts

### Fixed
- XSS, race condition, unescaped IDs, dead code in help.js
- TOC bar: reset state on chapter change, correct scroll offset
- Light mode code blocks and prev/next navigation bug
- Dark mode: neutral gray/black instead of blue-tinted Catppuccin

[Unreleased]: https://github.com/leminkozey/help-book/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/leminkozey/help-book/releases/tag/v1.0.0
