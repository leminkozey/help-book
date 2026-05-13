# Images

Drop a file under `chapters/images/` and reference it from any chapter with normal Markdown:

```markdown
![Help Book sidebar in light mode](images/sidebar-mock.svg)
```

Renders as:

![Help Book sidebar in light mode](images/sidebar-mock.svg)

## Light + dark

Pair shots for theme docs travel well as side-by-side `<img>` tags:

<img src="images/sidebar-mock.svg" alt="Sidebar — light" width="230">
<img src="images/sidebar-mock-dark.svg" alt="Sidebar — dark" width="230">

## Sizing

For inline control, fall back to a raw `<img>` tag — the sanitizer keeps `src`, `alt`, `title`, `width`, and `height`:

```html
<img src="images/placeholder.svg" alt="Small" width="120">
<img src="images/placeholder.svg" alt="Large" width="320">
```

<img src="images/placeholder.svg" alt="Small" width="120">

<img src="images/placeholder.svg" alt="Large" width="320">

## Suggested layout

```
help/
  chapters/
    04-whats-new/
      01-images.md
    images/
      sidebar-mock.svg
      sidebar-mock-dark.svg
      placeholder.svg
```

Paths resolve relative to the chapter file. External URLs (`https://…`) work too, as long as the host allows hot-linking and the CSP permits the image source.

## Sanitization

Markdown runs through `marked` and is scrubbed by DOMPurify before hitting the DOM. On `<img>`, only `src`, `alt`, `title`, `width`, `height` survive — event handlers (`onerror`, `onload`) and unknown attributes are stripped. That's the safety net for user-supplied Markdown, not a missing feature.
