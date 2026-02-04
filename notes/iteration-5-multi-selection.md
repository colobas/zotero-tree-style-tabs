# Iteration 5: Multi-Selection for Drag & Drop

**Date:** February 4, 2026  
**Feature:** Multi-selection support for tabs  
**Status:** ✅ Implemented

---

## Overview

Added the ability to select multiple tabs and perform batch operations (drag, drop, close, group). This significantly improves workflow efficiency when organizing many tabs.

---

## Features Implemented

### 1. ✅ Multi-Selection States
- **Ctrl/Cmd+Click**: Toggle individual tab selection
- **Shift+Click**: Select range of tabs
- **Click on unselected tab**: Clears selection
- **Visual indication**: Orange highlight for selected tabs (`#fff3e0` background)

### 2. ✅ Visual Feedback
- **Selection counter** in header: Shows "(N selected)" when tabs are selected
- **Inline styles for highlighting**: Following best practices (CSS unreliable)
- **Hover effects**: Using `mouseenter`/`mouseleave` (CSS :hover unreliable)
- **Different colors**:
  - Active tab: Blue (`#e3f2fd`)
  - Selected tabs: Orange (`#fff3e0`)
  - Hover: Light gray (`#f5f5f5`)

### 3. ✅ Multi-Tab Drag & Drop
- Drag all selected tabs together
- Visual feedback: All dragged tabs show opacity 0.5
- Drop target highlighting with inline styles
- JSON array format for multiple tab IDs
- Backward compatible with single tab drag

### 4. ✅ Context Menu for Multi-Selection
- **Close N selected tabs**: Batch close operation
- **Group N selected tabs**: Create group and move all selected tabs into it
- **Clear selection**: Deselect all tabs
- Shows selection-specific menu when right-clicking a selected tab

### 5. ✅ Keyboard Shortcuts
- **Ctrl/Cmd+A**: Select all visible tabs
- **Escape**: Clear selection

### 6. ✅ Toolbar Button
- **Select All button** (☑): Quick access to select all tabs
- Tooltip: "Select all tabs (Ctrl+A)"

---

## Implementation Details

### State Management

```typescript
private static selectedTabIds: Set<string> = new Set();
private static lastClickedTabId: string | null = null;
```

- `selectedTabIds`: Tracks which tabs are selected
- `lastClickedTabId`: Used for Shift+Click range selection

### Selection Methods

```typescript
clearSelection(): void
toggleTabSelection(tabId: string): void
selectTabRange(startId: string, endId: string): void
selectAllTabs(win: Window): void
```

### Visual Highlighting (Inline Styles)

Following best practices from previous iterations:

```typescript
// Multi-selection highlighting
if (this.selectedTabIds.has(tab.id)) {
  tabEl.classList.add("multi-selected");
  tabEl.style.backgroundColor = "#fff3e0";
  tabEl.style.borderLeft = "3px solid #ff9800";
}
```

### Click Handler with Multi-Selection

```typescript
// Ctrl/Cmd+Click: Toggle selection
if (e.ctrlKey || e.metaKey) {
  e.preventDefault();
  this.toggleTabSelection(tab.id);
  this.refresh(win);
  return;
}

// Shift+Click: Range selection
if (e.shiftKey && this.lastClickedTabId) {
  e.preventDefault();
  this.selectTabRange(this.lastClickedTabId, tab.id);
  this.refresh(win);
  return;
}
```

### Multi-Tab Drag & Drop

```typescript
// Drag all selected tabs
const tabsToDrag = this.selectedTabIds.has(tab.id) && this.selectedTabIds.size > 0
  ? Array.from(this.selectedTabIds)
  : [tab.id];

e.dataTransfer?.setData("text/plain", JSON.stringify(tabsToDrag));

// Drop handler
let draggedIds: string[];
try {
  draggedIds = JSON.parse(dragData);
} catch {
  draggedIds = [dragData]; // Backward compatibility
}
```

### Selection Counter UI

```typescript
// In header
const selectionCounter = doc.createElement("span");
selectionCounter.id = "treestyletabs-selection-counter";
selectionCounter.style.color = "#ff9800";
selectionCounter.style.display = "none"; // Hidden by default

// Update on refresh
if (this.selectedTabIds.size > 0) {
  selectionCounter.textContent = `(${this.selectedTabIds.size} selected)`;
  selectionCounter.style.display = "inline";
} else {
  selectionCounter.style.display = "none";
}
```

---

## Best Practices Followed

### ✅ Inline Styles for Visual Feedback
Per lessons learned from Iteration 3:
- CSS pseudo-classes (`:hover`) unreliable in Zotero
- All interactive states use inline styles + JavaScript
- Hover effects use `mouseenter`/`mouseleave` events

```typescript
tabEl.addEventListener("mouseenter", () => {
  if (!tab.selected && !this.selectedTabIds.has(tab.id)) {
    tabEl.style.backgroundColor = "#f5f5f5";
  }
});

tabEl.addEventListener("mouseleave", () => {
  if (tab.selected) {
    tabEl.style.backgroundColor = "#e3f2fd";
  } else if (this.selectedTabIds.has(tab.id)) {
    tabEl.style.backgroundColor = "#fff3e0";
  } else {
    tabEl.style.backgroundColor = "";
  }
});
```

### ✅ Debug Logging
Following established patterns:

```typescript
Zotero.debug(`[Tree Style Tabs] Dragging ${tabsToDrag.length} tab(s)`);
Zotero.debug(`[Tree Style Tabs] Dropping ${draggedIds.length} tab(s) onto ${tab.id}`);
Zotero.debug(`[Tree Style Tabs] Selected range: ${to - from + 1} tab(s)`);
```

### ✅ Event Prevention
Proper event handling to avoid conflicts:

```typescript
if (e.ctrlKey || e.metaKey) {
  e.preventDefault(); // Prevent default behavior
  this.toggleTabSelection(tab.id);
  return;
}
```

### ✅ Backward Compatibility
Drop handler supports both single tab and multi-tab drag:

```typescript
try {
  draggedIds = JSON.parse(dragData); // Multi-tab
} catch {
  draggedIds = [dragData]; // Single tab fallback
}
```

---

## User Experience

### Selection Flow

1. **Single Click**: Select and activate tab (clears previous selection)
2. **Ctrl/Cmd+Click**: Add/remove tab from selection
3. **Shift+Click**: Select range from last clicked tab
4. **Ctrl/Cmd+A**: Select all visible tabs
5. **Escape**: Clear selection

### Visual Feedback

- **Blue border**: Active/current tab
- **Orange border**: Selected tabs (multi-selection)
- **Light gray background**: Hover state
- **Counter**: Header shows "(N selected)"
- **Drag opacity**: 0.5 for all dragged tabs

### Batch Operations

- **Drag selected tabs**: Move all selected tabs to new parent
- **Context menu**: Close or group all selected tabs
- **Auto-clear**: Selection clears after drop or close operations

---

## Testing Checklist

- [x] Ctrl/Cmd+Click toggles selection
- [x] Shift+Click selects range
- [x] Visual highlighting works (inline styles)
- [x] Selection counter appears/disappears correctly
- [x] Hover effects work on all states
- [x] Drag multiple selected tabs together
- [x] Drop multiple tabs onto target
- [x] Context menu shows multi-selection options
- [x] Keyboard shortcuts work (Ctrl+A, Escape)
- [x] Selection clears after operations
- [x] No conflicts with single-tab operations
- [x] Works with groups and regular tabs

---

## Code Changes

### Files Modified

1. **`src/modules/sidebarUI.ts`**:
   - Added `selectedTabIds` and `lastClickedTabId` state
   - Added selection methods: `clearSelection()`, `toggleTabSelection()`, `selectTabRange()`, `selectAllTabs()`
   - Updated `createTabElement()` for multi-selection click handling
   - Updated drag/drop handlers for multi-tab support
   - Added hover effects with inline styles
   - Added selection counter UI
   - Updated `showContextMenu()` for multi-selection operations
   - Added keyboard shortcuts (Ctrl+A, Escape)

2. **`src/addon.ts`**:
   - Added `selectionCounter?: HTMLElement` to UI state type

---

## Known Limitations

None identified. Feature is fully functional.

---

## Future Enhancements

Potential improvements (not blocking current feature):

1. **Persistent Selection**: Save/restore selection across refresh
2. **Select Similar**: Select all tabs of same type (e.g., all PDFs)
3. **Invert Selection**: Select all unselected tabs
4. **Bookmark Selection**: Save selected tabs as bookmark group
5. **Drag to Reorder**: Drag selected tabs to reorder within tree
6. **Visual Drag Preview**: Show count of items being dragged

---

## Patterns for Reference

### Multi-Selection Click Handler Pattern

```typescript
tabEl.addEventListener("click", (e) => {
  // Prevent drag detection
  if (/* drag check */) return;
  
  // Multi-selection modifiers
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    this.toggleTabSelection(tab.id);
    this.refresh(win);
    return;
  }
  
  if (e.shiftKey && this.lastClickedTabId) {
    e.preventDefault();
    this.selectTabRange(this.lastClickedTabId, tab.id);
    this.refresh(win);
    return;
  }
  
  // Normal click - clear selection
  if (!this.selectedTabIds.has(tab.id)) {
    this.clearSelection();
  }
  this.lastClickedTabId = tab.id;
  // ... normal click action
});
```

### Multi-Tab Drag & Drop Pattern

```typescript
// Drag start
const tabsToDrag = this.selectedTabIds.has(tab.id) && this.selectedTabIds.size > 0
  ? Array.from(this.selectedTabIds)
  : [tab.id];

e.dataTransfer?.setData("text/plain", JSON.stringify(tabsToDrag));

// Drop handler
const dragData = e.dataTransfer?.getData("text/plain");
let draggedIds: string[];
try {
  draggedIds = JSON.parse(dragData);
} catch {
  draggedIds = [dragData];
}

draggedIds.forEach(id => {
  TreeTabManager.attachTabTo(id, targetId);
});
```

### Visual State Management Pattern

```typescript
// On hover
tabEl.addEventListener("mouseenter", () => {
  if (!tab.selected && !this.selectedTabIds.has(tab.id)) {
    tabEl.style.backgroundColor = "#f5f5f5";
  }
});

// On mouse leave - restore proper state
tabEl.addEventListener("mouseleave", () => {
  if (tab.selected) {
    tabEl.style.backgroundColor = "#e3f2fd";
  } else if (this.selectedTabIds.has(tab.id)) {
    tabEl.style.backgroundColor = "#fff3e0";
  } else {
    tabEl.style.backgroundColor = "";
  }
});
```

---

## Summary

Successfully implemented comprehensive multi-selection support following all established best practices:

- ✅ Inline styles for all visual feedback
- ✅ JavaScript event handlers instead of CSS pseudo-classes
- ✅ Extensive debug logging
- ✅ Backward compatibility
- ✅ Clear user feedback (counter, colors)
- ✅ Intuitive keyboard shortcuts
- ✅ Batch operations (drag, close, group)

The feature enhances usability significantly without compromising existing functionality.

---

**Last Updated:** February 4, 2026, 12:32 PST  
**Status:** ✅ Complete and tested
