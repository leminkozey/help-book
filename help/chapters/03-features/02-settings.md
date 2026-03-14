# Settings

The Help Book adapts to user preferences automatically.

## Dark Mode

The theme follows your system preference by default (`prefers-color-scheme`). You can also toggle it manually with the sun/moon button in the header.

Your preference is saved in `localStorage` and persists across sessions.

## Search

The search indexes all chapter content when the page loads. Type at least 2 characters to see results.

### How Search Works

1. All markdown files are fetched in the background on page load
2. When you type, the raw text is searched (not the rendered HTML)
3. Results show the chapter title and a snippet with the match highlighted
4. Click a result to navigate directly to that chapter

### Tips

- Use <kbd>Ctrl</kbd> + <kbd>K</kbd> to focus the search from anywhere
- Press <kbd>Escape</kbd> to clear the search
- Search is case-insensitive

## URL Hash Routing

Each chapter has a unique URL hash (e.g. `#settings`). This means:

- **Deep links work** — share `yoursite.com/help#settings` and it opens this page directly
- **Browser history works** — use back/forward buttons to navigate between chapters
- **Bookmarks work** — bookmark any chapter for quick access

## Previous / Next Navigation

At the bottom of each chapter, you'll find navigation links to the previous and next chapters. The order follows the `chapters.json` manifest.

## Customization Checklist

When integrating Help Book into your project:

1. Update `chapters.json` with your project title and version
2. Set an accent color that matches your project's branding
3. Write your chapters as markdown files
4. Organize chapters in `chapters/` — use subdirectories for groups
5. Serve the `help/` directory at your preferred URL path
