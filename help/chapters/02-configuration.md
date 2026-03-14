# Configuration

All configuration lives in a single file: `chapters.json`.

## Manifest Format

```json
{
  "title": "My Project Help",
  "version": "v2.1.0",
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

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `title` | string | yes | Shown in the header and browser tab |
| `version` | string | no | Displayed in the footer |
| `accent` | string | no | CSS color for accent elements (default: `#e8791d`) |
| `chapters` | array | yes | Ordered list of chapter objects |

## Chapter Object

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Unique identifier, used in URL hash (`#id`) |
| `title` | string | Display name in sidebar |
| `file` | string | Path to markdown file (relative to `help/`) |
| `children` | array | Nested chapters (creates expandable group) |

## Nesting

Chapters can be nested one level deep. A parent chapter can optionally have its own `file` — if set, clicking the group title loads that chapter. Children appear indented below.

```json
{
  "id": "api",
  "title": "API Reference",
  "file": "chapters/api/overview.md",
  "children": [
    { "id": "api-auth", "title": "Authentication", "file": "chapters/api/auth.md" },
    { "id": "api-users", "title": "Users", "file": "chapters/api/users.md" }
  ]
}
```

## Theming

The accent color can be customized per project via the `accent` field. This color is used for:

- Active sidebar item highlight
- Links
- Blockquote borders
- Search result highlights

For deeper customization, override the CSS variables in `help.css`:

```css
:root {
  --help-accent: #3b82f6;
  --help-bg: #fafafa;
  --help-sidebar-bg: #f0f0f0;
}
```
