# Help Book

A standalone, drop-in documentation system for any web project. No build step, no npm, no framework — just static files.

## What it does

Copy the `help/` folder into your project, edit `chapters.json`, write markdown — done. Your project has a full documentation site.

**Features:**
- Sidebar navigation with nested chapters
- Sticky TOC bar for in-page sections
- Full-text search across all chapters (`Ctrl+K` / `Cmd+K`)
- Dark / light theme with system preference detection
- Syntax highlighting with copy buttons on code blocks
- Previous / next chapter navigation
- Mobile responsive
- Customizable accent color per project

## Quick Start

```
your-project/
  help/
    index.html
    help.css
    help.js
    chapters.json
    chapters/
      01-getting-started.md
      02-configuration.md
```

Serve the `help/` directory with any static file server:

```bash
cd help && python3 -m http.server 8082
```

> `python3 -m http.server` is for local development only — not production-ready (single-threaded, no TLS, no security headers). For production use nginx, Caddy, or a CDN.

Or with Express:

```javascript
app.use('/help', express.static('help'));
```

## Configuration

Everything is configured in `chapters.json`:

```json
{
  "title": "My Project Help",
  "version": "v1.0.0",
  "accent": "#3b82f6",
  "chapters": [
    {
      "id": "intro",
      "title": "Introduction",
      "file": "chapters/01-intro.md"
    },
    {
      "id": "advanced",
      "title": "Advanced",
      "children": [
        {
          "id": "plugins",
          "title": "Plugins",
          "file": "chapters/02-advanced/01-plugins.md"
        }
      ]
    }
  ]
}
```

| Property | Description |
|----------|-------------|
| `title` | Header and browser tab title |
| `version` | Shown in footer (optional) |
| `accent` | CSS accent color (default: `#e8791d`) |
| `chapters` | Ordered list of chapter objects |

Chapters can be nested one level deep. Parent chapters can optionally have their own `file`.

## Theming

Override CSS variables in `help.css` for deeper customization:

```css
:root {
  --help-accent: #3b82f6;
  --help-bg: #fafafa;
  --help-sidebar-bg: #f0f0f0;
}
```

## Requirements

- A modern browser
- A static file server
- That's it

## Security

**Production headers** — set these on your reverse proxy at minimum:

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'none'; script-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; style-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'
```

**Harden the Express example** — `express.static` is permissive by default:

```javascript
app.use('/help', express.static('help', {
  dotfiles: 'deny',
  redirect: false,
  index: 'index.html'
}));
```

**Avoid symlinks inside `help/`** — static servers follow them and can leak files outside the directory.

**Trust your markdown sources** — chapters are rendered with DOMPurify and a strict allowlist, but untrusted markdown is still a risk (e.g. CSS injection via the accent color or other vectors). Do not drop user-generated markdown into `chapters/` without further review.

## License

MIT
