# Getting Started

Welcome to the Help Book — a standalone, drop-in documentation system for any web project.

## Installation

Copy the `help/` folder into your project:

```
your-project/
  help/
    index.html
    help.css
    help.js
    chapters.json
    chapters/
      ...your markdown files
```

Then serve it as a static directory. For example with Express:

```javascript
app.use('/help', express.static('help'));
```

Or with a plain HTTP server:

```bash
# development
cd help && python3 -m http.server 8082
```

Your documentation is now available at `yoursite.com/help`.

## How It Works

1. **chapters.json** defines the structure — titles, order, and file paths
2. **Markdown files** in `chapters/` contain the actual content
3. **help.js** loads the manifest, builds the sidebar, and renders markdown on the fly
4. No build step, no dependencies to install — just static files

## Quick Start

1. Edit `chapters.json` to set your project name, version, and chapters
2. Write your markdown files in `chapters/`
3. Done

> **Tip:** Use `Ctrl+K` / `Cmd+K` to quickly search across all chapters.

## Requirements

- A modern browser (Chrome, Firefox, Safari, Edge)
- A web server that can serve static files
- That's it. No npm, no webpack, no build pipeline.
