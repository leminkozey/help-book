# Find on Page

The search box pulls double duty: typing two or more characters highlights matches **on this page** inline (like browser find) and lists hits in **other chapters** below.

## Try it now

1. Press `Ctrl+K` or `Cmd+K` to focus search
2. Type `lazy` and watch this chapter light up — every match wraps in a yellow `<mark>` tag
3. Press **Enter** to jump to the next match, **Shift+Enter** to jump back
4. The active match turns orange and smooth-scrolls into view
5. Press **Esc** or click outside to clear

## The counter

A counter row sits at the top of the popup: **N of M on this page**, with prev/next buttons next to it. Useful when you want to know how many matches a long chapter has before you start cycling.

## Cross-chapter results

Below the counter, the popup lists chapters that contain the same term (current chapter excluded — you're already on it). Each result shows a context snippet with the match highlighted. Click one and the help-book navigates over and re-applies the highlights in the new chapter.

## Skip zones

Find-on-page walks the article tree but skips:

- existing `<mark>` nodes (no nested highlights)
- the `#` anchor links on headings
- copy buttons on code blocks

Everything else — paragraph text, code blocks, table cells, blockquotes — is fair game.

## Some lazy filler so you have matches to cycle through

The lazy fox jumps over the lazy dog. The lazy author writes lazy filler. The lazy parser would have missed this, but find-on-page is not lazy. The lazy reader scrolls past anyway.
