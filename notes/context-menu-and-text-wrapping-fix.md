# Context Menu & Text Wrapping Fix - Session Summary

**Date:** February 3, 2026  
**Duration:** Extended debugging session  
**Issues Fixed:** Context menu positioning and text wrapping in sidebar

---

## Problems Identified

### 1. Context Menu Issues
- Right-click context menu was appearing at the bottom of the screen (off-screen)
- Menu had no visible background, appearing transparent
- Menu was completely unusable in its original state

### 2. Text Wrapping Issues
- Tab titles were wrapping to multiple lines
- Sidebar items were not respecting single-line display
- Font size was too large, contributing to wrapping

---

## Root Causes

### Context Menu Positioning
1. **Initial Problem:** Menu was using `position: absolute` but was positioned at y=2850 (way off-screen) when sidebar was only 1018px tall
2. **Calculation Issue:** Original positioning logic used `tabRect.top - tabListRect.top + tabList.scrollTop + headerHeight` which resulted in incorrect coordinates
3. **CSS Not Loading:** External CSS was not being properly applied or was being overridden by Zotero's internal styles

### Text Wrapping
1. **CSS Priority Issues:** Even with `!important` flags, external CSS was not reliably applied
2. **Default XUL Styles:** Zotero's XUL/Firefox framework has default styles that override custom CSS
3. **Flex Layout:** The flex layout wasn't properly constraining child elements

---

## Solution Approach

### Context Menu Fix

#### Attempt 1: Absolute Positioning (Failed)
```typescript
// This didn't work - menu appeared off-screen
const relativeTop = tabRect.top - tabListRect.top + tabList.scrollTop;
menu.style.position = 'absolute';
menu.style.top = `${headerHeight + relativeTop}px`;
```

#### Attempt 2: Fixed Positioning (Success)
```typescript
// Use viewport coordinates with fixed positioning
const menuLeft = tabRect.right + 5;
const menuTop = tabRect.top;

menu.style.position = 'fixed';
menu.style.left = `${menuLeft}px`;
menu.style.top = `${menuTop}px`;
```

#### Attempt 3: Inline Styles for Background (Final Solution)
```typescript
// Bypass CSS completely with inline styles
menu.style.backgroundColor = "#ffffff";
menu.style.border = "1px solid #cccccc";
menu.style.borderRadius = "6px";
menu.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.25)";
```

### Text Wrapping Fix

#### Inline Styles Applied to Tab Elements
```typescript
tabEl.style.height = "24px";
tabEl.style.maxHeight = "24px";
tabEl.style.overflow = "hidden";
tabEl.style.whiteSpace = "nowrap";
tabEl.style.display = "flex";
tabEl.style.alignItems = "center";
```

#### Inline Styles Applied to Title Spans
```typescript
title.style.overflow = "hidden";
title.style.textOverflow = "ellipsis";
title.style.whiteSpace = "nowrap";
title.style.display = "block";
title.style.flex = "1 1 auto";
title.style.minWidth = "0";
```

---

## Key Insights

### 1. XUL/Firefox Extension CSS Challenges
- **External CSS is unreliable** in Zotero extensions due to loading order and specificity issues
- **Inline styles** have the highest specificity and bypass all caching/loading problems
- **`!important` flags in CSS files** were insufficient to override framework defaults

### 2. Positioning in Complex DOM Structures
- **`getBoundingClientRect()`** returns viewport coordinates, which are reliable for fixed positioning
- **Absolute positioning** requires a positioned ancestor (relative/absolute/fixed)
- **Fixed positioning** relative to viewport is simpler and more predictable in extensions

### 3. Debugging Techniques That Worked
1. **Debug logging with Zotero.debug()** - Essential for understanding what's happening
2. **Checking computed styles** - `win.getComputedStyle()` reveals what actually gets applied
3. **Inspecting XPI contents** - `unzip -p` to verify built files contain changes
4. **Monitoring bounding rectangles** - Logging coordinates revealed the off-screen positioning

### 4. Development Workflow
- **CSS changes don't automatically reload** - Must rebuild and restart Zotero
- **The watcher doesn't catch all changes** - Manual `npm run build` often necessary
- **XPI caching** - Sometimes Zotero caches the old XPI, requiring full restart

---

## Final Working Solution

### Context Menu
- **Positioning:** `position: fixed` with viewport coordinates
- **Styling:** Inline styles for all visual properties
- **Appending:** Attach to `document.body` instead of sidebar
- **Overflow handling:** Check viewport bounds and adjust position

### Text Wrapping
- **Font size:** Reduced to 10px
- **Height constraint:** Fixed 24px height per tab
- **Overflow:** `hidden` with `text-overflow: ellipsis`
- **Layout:** Flex with `nowrap` and explicit widths on all children

---

## Code Locations

### Files Modified
- `src/modules/sidebarUI.ts` - Main sidebar UI logic and context menu
- `addon/content/treestyletabs.css` - Styling (though inline styles proved more reliable)

### Key Functions
- `showContextMenu()` - Context menu creation and positioning
- `createTabElement()` - Tab rendering with inline styles

---

## Lessons Learned

1. **When CSS doesn't work, use inline styles** - In extension development, inline styles are often the only reliable option
2. **Fixed positioning is simpler than absolute** - Especially in complex nested layouts
3. **Always add debug logging** - Saved hours by revealing the off-screen positioning issue
4. **Test viewport coordinates** - `getBoundingClientRect()` values showed exactly what was wrong
5. **Don't trust external CSS in extensions** - Framework styles will often override

---

## Future Improvements

1. **Consider using a proper menu API** - If Zotero provides native context menu support
2. **Add keyboard navigation** - Arrow keys and Enter for accessibility
3. **Implement menu item icons** - Visual indicators for common actions
4. **Add menu positioning preferences** - Let users choose left vs right positioning
5. **Cache computed styles** - Reduce repeated calls to getComputedStyle

---

## Testing Checklist

- [x] Context menu appears at correct position
- [x] Context menu has solid background
- [x] Context menu items are visible and clickable
- [x] Context menu adjusts position when near edge
- [x] Tab titles are single-line with ellipsis
- [x] Font size is appropriately small
- [x] No text wrapping in sidebar items
- [x] All interactive elements remain accessible

---

## Build and Deploy

```bash
# Build the extension
npm run build

# Start dev server (auto-restarts Zotero)
npm start

# Manual testing in tmux session
tmux attach -t zotero_dev
```
