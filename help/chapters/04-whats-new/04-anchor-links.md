# Heading Anchors

Hover any H2 or H3 in this chapter and a `#` appears to the left of the heading. Click it to copy a deep link straight to that section.

## How it looks

Move your mouse over any of the headings below. On touch devices the anchor stays visible at low contrast.

## Deep links

A copied link looks like this:

```
https://yoursite.com/help/#anchors--deep-links
```

The hash uses a `chapterId--headingId` shape. Reloading the page lands you back at this exact heading after a frame of layout.

## Cross-chapter jumps

Anchors keep working when you paste them. Open one in a new tab and the help-book navigates to the right chapter, renders it, then scrolls to the heading once layout settles.

## Mobile

On narrow viewports the left gutter disappears, so the anchor renders inline before the heading text instead of in the margin. Same behavior, just less hidden.

## Accessibility

- `aria-label="Copy link to this section"` on every anchor
- Focus ring on keyboard tab, copy works via Enter
- Toast announces success or, on clipboard failure, points at the address bar

## Try it

Hover over **How it looks**, **Deep links**, **Cross-chapter jumps**, **Mobile**, or **Accessibility** above and click the `#`. The URL in the address bar updates without a page reload.
