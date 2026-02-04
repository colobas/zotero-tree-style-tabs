# Iteration 3 Summary: Interactive States in Zotero Extensions

**Date:** February 3, 2026  
**Status:** Complete  
**Session Duration:** ~3 hours  
**Issues Resolved:** 7 major issues + UI polish

---

## The Critical Discovery: CSS Pseudo-Classes Don't Work

The biggest lesson from this iteration: **CSS pseudo-classes (`:hover`, `:active`, `:focus`) are unreliable in Zotero's XUL environment.**

### What Doesn't Work

```css
/* This looks correct but doesn't work in Zotero */
.my-button:hover {
  background: #ccc !important;
  border: 1px solid #999 !important;
}
```

### What Works

```javascript
// Inline styles + JavaScript event handlers
button.addEventListener("mouseenter", () => {
  button.style.background = "rgba(0, 0, 0, 0.05)";
  button.style.border = "1px solid rgba(0, 0, 0, 0.15)";
});

button.addEventListener("mouseleave", () => {
  button.style.background = "transparent";
  button.style.border = "1px solid transparent";
});
```

---

## Issues Fixed

### 1. Tree Persistence (Critical Bug)

**Problem:** Tree structure lost on restart because Zotero regenerates tab IDs.

**Solution:** ID migration by matching tabs by title.

```typescript
// Match existing tabs by title
for (const [tabId, node] of this.tabs.entries()) {
  if (node.nodeType === "tab" && node.title === ztTitle && !currentTabIds.has(tabId)) {
    idMigrationMap.set(tabId, zt.id); // oldId -> newId
  }
}

// Update all references in tree structure
this.tabs.forEach((node) => {
  if (node.parentId && idMigrationMap.has(node.parentId)) {
    node.parentId = idMigrationMap.get(node.parentId);
  }
  node.childIds = node.childIds.map((childId) => 
    idMigrationMap.get(childId) || childId
  );
});
```

**Impact:** Tree structure now persists correctly across Zotero restarts.

---

### 2. Folding/Unfolding

**Problem:** CSS specificity battles prevented tabs from hiding.

**Solution:** Inline styles for display property.

```typescript
if (hidden) {
  tabEl.style.display = "none";
} else {
  tabEl.style.display = "flex";
}
```

**Impact:** Collapse/expand now works reliably.

---

### 3. Twisty Arrows Not Visible

**Problem:** CSS triangles weren't showing up.

**Solution:** Unicode characters with inline styles.

```typescript
if (tab.childIds.length > 0) {
  twisty.textContent = tab.collapsed ? "▶" : "▼";
  twisty.style.color = "#333";
  twisty.style.fontSize = "12px";
  twisty.style.cursor = "pointer";
}
```

**Impact:** Collapse/expand arrows now clearly visible.

---

### 4. Drag-and-Drop Visual Feedback

**Problem:** CSS classes weren't providing visual feedback.

**Solution:** Inline styles applied in event handlers.

```typescript
element.addEventListener("dragstart", (e) => {
  element.style.opacity = "0.5";
});

element.addEventListener("dragover", (e) => {
  e.preventDefault();
  element.style.outline = "2px solid #2196F3";
  element.style.backgroundColor = "rgba(33, 150, 243, 0.1)";
});

element.addEventListener("dragend", () => {
  element.style.opacity = "1";
  document.querySelectorAll(".drop-target").forEach((el) => {
    (el as HTMLElement).style.outline = "";
    (el as HTMLElement).style.backgroundColor = "";
  });
});
```

**Impact:** Clear visual feedback during drag-and-drop operations.

---

### 5. Button Hover Effects

**Problem:** CSS `:hover` wasn't working on toolbar buttons.

**Solution:** JavaScript event handlers with inline styles.

```typescript
const setupButton = (btn: HTMLButtonElement) => {
  // Default state - invisible
  btn.style.background = "transparent";
  btn.style.border = "1px solid transparent";
  btn.style.color = "#666";
  
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(0, 0, 0, 0.05)";
    btn.style.border = "1px solid rgba(0, 0, 0, 0.15)";
    btn.style.color = "#333";
  });
  
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "transparent";
    btn.style.border = "1px solid transparent";
    btn.style.color = "#666";
  });
};
```

**Impact:** Buttons are invisible by default, show subtle border/background on hover.

---

### 6. Header Layout

**Problem:** Header wrapping to multiple lines, taking too much space.

**Solution:** Flexbox with inline styles for guaranteed single-line layout.

```typescript
header.style.display = "flex";
header.style.flexDirection = "row";
header.style.flexWrap = "nowrap";
header.style.alignItems = "center";
header.style.paddingLeft = "12px";
```

**Impact:** Compact single-line header: `    Tree Style Tabs  |  ⊟ ⊞ ＋ ⟷`

---

### 7. Hover Tooltips

**Problem:** Long tab titles truncated with no way to see full text.

**Solution:** Native HTML `title` attribute.

```typescript
const titleText = tab.title || this.getTabTypeLabel(tab.type);
tabEl.title = titleText;
```

**Impact:** Full title appears in browser tooltip on hover.

---

## Key Technical Lessons

### 1. Inline Styles Beat Everything

**Hierarchy (highest to lowest):**
1. Inline styles (`element.style.x`)
2. CSS with `!important`
3. Regular CSS

For critical properties and interactive states, **always use inline styles**.

### 2. CSS Pseudo-Classes Are Unreliable

Don't use in Zotero extensions:
- `:hover`
- `:active`
- `:focus`
- `:focus-within`
- Any other pseudo-class for interactive states

Use JavaScript event handlers instead:
- `mouseenter` / `mouseleave`
- `mousedown` / `mouseup`
- `focus` / `blur`
- `dragstart` / `dragend`

### 3. Tab IDs Are Not Persistent

Zotero regenerates tab IDs on restart. Must implement ID migration:
1. Match tabs by title (or other stable identifier)
2. Create mapping: `oldId -> newId`
3. Update all references in tree structure
4. Update parent IDs, child IDs, root IDs, collapsed IDs

### 4. Visual Feedback Pattern

For any interactive visual feedback:

```typescript
// 1. Set default state with inline styles
element.style.property = "defaultValue";

// 2. Add event handlers that modify inline styles
element.addEventListener("stateChange", () => {
  element.style.property = "newValue";
});

// 3. Always clean up on exit event
element.addEventListener("exitState", () => {
  element.style.property = "defaultValue";
});
```

Never rely on CSS classes or pseudo-classes alone.

---

## Design Patterns Established

### Hover-Only Button Pattern

```typescript
const setupHoverButton = (btn: HTMLButtonElement) => {
  // Invisible by default
  btn.style.background = "transparent";
  btn.style.border = "1px solid transparent";
  
  // Show on hover
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(0, 0, 0, 0.05)";
    btn.style.border = "1px solid rgba(0, 0, 0, 0.15)";
  });
  
  // Hide on leave
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "transparent";
    btn.style.border = "1px solid transparent";
  });
};
```

### Drag-and-Drop Feedback Pattern

```typescript
// Dragging
element.addEventListener("dragstart", (e) => {
  e.dataTransfer?.setData("text/plain", data);
  element.style.opacity = "0.5";
});

// Drop target
element.addEventListener("dragover", (e) => {
  e.preventDefault();
  element.style.outline = "2px solid #2196F3";
  element.style.backgroundColor = "rgba(33, 150, 243, 0.1)";
});

// Clean up
element.addEventListener("dragend", () => {
  element.style.opacity = "1";
  cleanupAllDropTargets();
});
```

### ID Migration Pattern

```typescript
// 1. Build migration map
const idMap = new Map<string, string>();
for (const [oldId, node] of oldTabs.entries()) {
  const matchedTab = findByStableIdentifier(node);
  if (matchedTab) {
    idMap.set(oldId, matchedTab.newId);
  }
}

// 2. Update all references
updateParentIds(idMap);
updateChildIds(idMap);
updateRootIds(idMap);
updateCollapsedIds(idMap);
```

---

## Statistics

- **Lines of code changed:** ~150
- **New patterns established:** 3
- **Critical bugs fixed:** 2 (tree persistence, folding)
- **UI enhancements:** 3 (arrows, buttons, header)
- **Documentation updates:** 4 files

---

## Impact on Development

**Before Iteration 3:**
- Tree structure lost on restart
- No visual feedback for interactions
- CSS approach failing unpredictably
- Buttons always visible (cluttered UI)

**After Iteration 3:**
- ✅ Tree persists across restarts
- ✅ Clear visual feedback for all interactions
- ✅ Reliable approach with inline styles + JavaScript
- ✅ Clean, polished UI with hover-only buttons
- ✅ Established patterns for all future interactive elements

**Development Philosophy Change:**
- From: "Try to make CSS work with enough !important"
- To: "Use inline styles + JavaScript for all interactive states"

This fundamental shift will speed up all future development and avoid CSS debugging rabbit holes.

---

## For Next Iteration

**Established Patterns to Follow:**
1. Use inline styles for all interactive visual changes
2. Use JavaScript event handlers for all state transitions
3. Implement ID migration for any persistent data structures
4. Test persistence across Zotero restarts early
5. Never rely on CSS pseudo-classes in Zotero

**Reference Documents:**
- `quick-reference-zotero-extension-patterns.md` - Updated with all patterns
- `iteration-3-folding-and-tooltips.md` - Full debugging journey
- This summary - Quick reference for the approach

---

**Completion Time:** February 3, 2026, 19:45 PST  
**Overall Success:** Complete - all issues resolved, patterns established, documentation updated
