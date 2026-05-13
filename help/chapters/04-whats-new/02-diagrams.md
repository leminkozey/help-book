# Diagrams (Mermaid)

![Wires running somewhere — a real-world graph](images/diagrams.jpg)

A fenced code block tagged `mermaid` renders as an SVG diagram. The library is lazy-loaded from `cdn.jsdelivr.net` — chapters without a diagram never pay the cost.

## Flowchart

```mermaid
graph TD
  A[chapters.json] --> B[help.js]
  B --> C[Markdown]
  C --> D[Rendered Page]
  C --> E[Search Index]
  D --> F((User))
  E --> F
```

## Sequence

```mermaid
sequenceDiagram
  participant U as User
  participant H as help.js
  participant M as marked + DOMPurify
  U->>H: navigate(chapterId)
  H->>H: fetch chapter.md
  H->>M: parse + sanitize
  M-->>H: clean HTML
  H-->>U: render + scroll
```

## State

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Indexing: fetch chapters
  Indexing --> Ready: all loaded
  Ready --> Searching: Ctrl+K
  Searching --> Ready: Esc
  Ready --> [*]
```

## Theme

Diagrams track the active theme. Toggle dark/light via the moon icon in the header and the SVG re-renders with the appropriate palette.

> The Mermaid integration uses `securityLevel: 'strict'` — embedded JS in diagrams is disabled.
