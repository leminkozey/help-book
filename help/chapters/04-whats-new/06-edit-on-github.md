# Edit on GitHub

Every chapter can show a muted "Edit this page on GitHub" link at the bottom. Scroll down — there's one on this page right now (above the prev/next nav).

![Edit link preview](images/edit-on-github.svg)

## Setup

Add a single key to `chapters.json`:

```json
{
  "title": "My Project",
  "editUrl": "https://github.com/you/repo/edit/main/help/{file}",
  "chapters": [ ... ]
}
```

The `{file}` placeholder gets replaced with the current chapter's `file` value (URL-encoded). Omit the key and the link disappears — no flag, no fallback, just absence.

## What it does

- One link per chapter, rendered between the article body and the prev/next nav
- Opens in a new tab with `rel="noopener noreferrer"`
- Small pencil icon for affordance, muted color so it doesn't compete with content

## Other Git hosts

The pattern is `host/edit/branch/path`. Examples:

```json
{
  "editUrl": "https://gitlab.com/you/repo/-/edit/main/help/{file}"
}
```

```json
{
  "editUrl": "https://codeberg.org/you/repo/_edit/main/help/{file}"
}
```

Anything that resolves to an HTTPS URL is accepted (validated against `^https?://`).
