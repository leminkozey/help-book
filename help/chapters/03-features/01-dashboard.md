# Dashboard

This chapter demonstrates various markdown features that the Help Book supports.

## Text Formatting

Regular paragraphs with **bold**, *italic*, ~~strikethrough~~, and `inline code`.

Links work too: [Example Link](#getting-started).

## Code Blocks

Syntax highlighting is automatic. Hover over a code block to see the copy button.

### JavaScript

```javascript
function greet(name) {
  const message = `Hello, ${name}!`;
  console.log(message);
  return message;
}

// Arrow function variant
const greetArrow = (name) => `Hello, ${name}!`;
```

### Python

```python
def fibonacci(n):
    """Generate fibonacci sequence up to n."""
    a, b = 0, 1
    while a < n:
        yield a
        a, b = b, a + b

for num in fibonacci(100):
    print(num)
```

### Bash

```bash
#!/bin/bash
echo "Deploying to production..."
git pull origin main
npm run build
pm2 restart app
echo "Done!"
```

## Lists

### Unordered

- First item
- Second item
  - Nested item A
  - Nested item B
- Third item

### Ordered

1. Step one
2. Step two
3. Step three

## Blockquotes

> This is a blockquote. It's useful for callouts, warnings, or important notes.

> **Warning:** Don't delete the `chapters.json` file — the help book won't work without it.

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Markdown rendering | Done | Via marked.js |
| Syntax highlighting | Done | Via highlight.js |
| Search | Done | Client-side, all chapters |
| Dark mode | Done | Auto-detect + manual toggle |
| Mobile support | Done | Responsive sidebar |

## Images

Images in your markdown are rendered with rounded corners and responsive sizing. Just use standard markdown image syntax:

```markdown
![Alt text](path/to/image.png)
```

## Keyboard Shortcuts

Use <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>Cmd</kbd> + <kbd>K</kbd> on Mac) to open the search.

## Horizontal Rule

Content above the rule.

---

Content below the rule.
