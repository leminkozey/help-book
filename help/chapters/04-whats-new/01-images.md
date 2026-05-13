# Images

Drop a file under `chapters/images/` and reference it from any chapter with normal Markdown:

```markdown
![Hero image](images/images-hero.jpg)
```

Renders as:

![Hero image](images/images-hero.jpg)

## Multiple images per chapter

No special rule — drop in as many as you want. The renderer streams them through DOMPurify like everything else:

![A second photo](images/anchors.jpg)

![A third photo](images/edit.jpg)

## Sizing

For inline control, fall back to a raw `<img>` tag — the sanitizer keeps `src`, `alt`, `title`, `width`, and `height`:

```html
<img src="images/charts.jpg" alt="Small" width="180">
<img src="images/charts.jpg" alt="Medium" width="320">
```

<img src="images/charts.jpg" alt="Small" width="180">
<img src="images/charts.jpg" alt="Medium" width="320">

## Suggested layout

```
help/
  chapters/
    04-whats-new/
      01-images.md
    images/
      images-hero.jpg
      anchors.jpg
      edit.jpg
      placeholder.svg
```

Paths resolve relative to the chapter file. External URLs (`https://…`) work too, as long as the host allows hot-linking and your CSP permits the image source. The default CSP ships with `img-src 'self' data:` — local files and inline data-URIs only. Add the host to `img-src` if you want to pull from a CDN.

## Sanitization

Markdown runs through `marked` and is scrubbed by DOMPurify before hitting the DOM. On `<img>`, only `src`, `alt`, `title`, `width`, `height` survive — event handlers (`onerror`, `onload`) and unknown attributes are stripped. That's the safety net for user-supplied Markdown, not a missing feature.

## Credits

The photos on this page are CC0 from [Lorem Picsum](https://picsum.photos/) — fine to ship, redistribute, or replace.
