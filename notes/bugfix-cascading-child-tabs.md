# Bug Fix: Cascading Child Tab Relationships

**Date:** February 4, 2026  
**Severity:** Critical  
**Status:** ✅ Fixed

---

## The Bug

When clicking tabs in the sidebar, they were automatically becoming children of previously clicked tabs, creating a deeply cascading tree structure:

```
▼ Tab A
  ▼ Tab B
    ▼ Tab C
      ▼ Tab D
        ▼ Tab E
          ...
```

Every click would add another level to the hierarchy, making the tree unusable.

---

## Root Cause

### The Problem Code

In `treeTabManager.ts`:

```typescript
static addTab(
  id: string,
  title: string,
  type: string,
  parentId: string | null = null
): TabNode {
  // 🔴 BUG: Auto-parenting to last active tab!
  const effectiveParentId = parentId || this.lastActiveTabId;
  
  // This made every new/re-added tab a child of the last clicked tab
  // ...
}
```

### Why It Happened

1. User clicks Tab A → `lastActiveTabId = "tab-a"`
2. Zotero unloads Tab B to save memory
3. Zotero closes Tab B → `onTabClosed("tab-b")` → removes from tree
4. Zotero re-adds Tab B → `onTabAdded("tab-b")` → calls `addTab("tab-b", ...)`
5. `addTab` sees `parentId = null`, uses `lastActiveTabId = "tab-a"` instead
6. **Tab B becomes a child of Tab A!**
7. User clicks Tab C → repeat cascade

### Zotero's Tab Behavior

Zotero frequently unloads and reloads tabs (especially PDFs) to save memory:

```
Notifier.trigger('close', 'tab', [tab-xyz], true)
Notifier.trigger('add', 'tab', [tab-xyz], {"type":"reader-unloaded"})
```

The same tab ID is closed and re-added. Our code was treating these as "new" tabs and auto-parenting them to whatever was last clicked.

---

## The Fix

### 1. Removed Auto-Parenting Logic

```typescript
static addTab(
  id: string,
  title: string,
  type: string,
  parentId: string | null = null
): TabNode {
  // ✅ FIXED: Only use explicit parent, never auto-parent
  const node: TabNode = {
    id,
    parentId,  // Use exactly what's passed, don't substitute lastActiveTabId
    // ...
  };
  
  // If there's a parent, add as child
  if (parentId && this.tabs.has(parentId)) {
    const parent = this.tabs.get(parentId)!;
    parent.childIds.push(id);
    node.level = parent.level + 1;
  } else {
    // ✅ No parent - add as root
    node.parentId = null;
    this.structure.roots.push(id);
  }
  // ...
}
```

### 2. Explicit Null Parent on Tab Add

```typescript
static onTabAdded(
  win: Window,
  ids: string[],
  extraData: Record<string, any>
): void {
  const zoteroTabs = (win as any).Zotero_Tabs;

  for (const id of ids) {
    const zt = zoteroTabs?._tabs?.find((t: any) => t.id === id);
    if (zt && !this.tabs.has(id)) {
      // ✅ Explicitly pass null - add as root
      this.addTab(id, zt.title || zt.type, zt.type, null);
    }
  }
}
```

### 3. Fixed Click Handler

```typescript
// Normal click behavior
if (isGroup) {
  this.clearSelection();
  TreeTabManager.toggleCollapsed(tab.id);
  this.refresh(win);
} else {
  // ✅ Always clear selection on normal click
  this.clearSelection();
  this.lastClickedTabId = tab.id;
  TreeTabManager.selectTab(win, tab.id);
}
```

### 4. Added Reset Utility

Added context menu option: **"Reset all tabs to root level"**

Also added utility method:

```typescript
static resetAllToRoot(): void {
  // Reset all tabs to root, remove all groups
  this.tabs.forEach((node) => {
    if (node.nodeType === "tab") {
      node.parentId = null;
      node.childIds = [];
      node.level = 0;
      node.collapsed = false;
    }
  });
  
  // Remove all groups
  this.tabs.forEach((node, id) => {
    if (node.nodeType === "group") {
      this.tabs.delete(id);
    }
  });
  
  // Update structure
  this.structure.roots = [...allTabIds];
  this.structure.collapsed.clear();
  
  this.saveTreeStructure();
}
```

---

## Behavior Changes

### Before Fix
- ❌ Tabs automatically became children of last clicked tab
- ❌ Every Zotero tab reload created new parent relationships
- ❌ Tree structure grew uncontrollably
- ❌ No way to reset without manual editing

### After Fix
- ✅ New tabs open as root-level items
- ✅ Tabs only get parents via explicit actions:
  - Drag & drop
  - Context menu "Group selected tabs"
  - Manual grouping
- ✅ Zotero tab reloads don't affect tree structure
- ✅ "Reset all tabs to root level" menu option

---

## User Instructions

### For Users With Messed Up Trees

**Option 1: Context Menu Reset**
1. Right-click any tab
2. Select "Reset all tabs to root level"
3. Confirm the action
4. All tabs will be moved to root level

**Option 2: Manual File Deletion**
```bash
rm ~/Zotero/treestyletabs.json
```
Then restart Zotero. Tree structure will be recreated with all tabs as roots.

**Option 3: Manual Reorganization**
Right-click each incorrectly nested tab and select "Make root tab"

---

## Testing Checklist

- [x] Clicking tabs doesn't auto-nest them
- [x] Zotero tab reloads preserve tree structure
- [x] New tabs open as roots
- [x] Drag & drop still creates parent relationships
- [x] Multi-selection drag & drop works
- [x] "Reset all tabs to root level" works
- [x] Tree structure saved/loaded correctly
- [x] No cascading child relationships

---

## Prevention

### What NOT to Do
```typescript
// ❌ Don't auto-parent based on UI state
const parent = parentId || this.lastActiveTabId;

// ❌ Don't assume last action determines relationship
if (!parentId) {
  parentId = this.currentTab;
}
```

### What TO Do
```typescript
// ✅ Only parent when explicitly requested
const parent = parentId; // Use exactly what's passed

// ✅ Be explicit about roots
if (parentId === null) {
  // Add to roots
}

// ✅ Log auto-decisions for debugging
if (someAutoLogic) {
  Zotero.debug("[Tree Style Tabs] Auto-action: reason");
}
```

---

## Lessons Learned

1. **Never make implicit assumptions about relationships** - User actions (clicks) should not automatically create parent-child relationships unless that's the explicit intent.

2. **Zotero's tab lifecycle is complex** - Tabs get closed and re-added frequently. Our code must handle this without side effects.

3. **State persistence needs careful thought** - The `lastActiveTabId` was meant for one purpose (shift-click range selection) but was being misused for auto-parenting.

4. **Always provide escape hatches** - The "Reset all tabs to root level" option gives users a way to recover from bugs or unwanted structure.

5. **Log all structural changes** - Debug logs showing "Tab X made child of Tab Y" would have caught this earlier.

---

## Related Code

**Files Modified:**
- `src/modules/treeTabManager.ts` - Removed auto-parenting, added reset utility
- `src/modules/sidebarUI.ts` - Added reset menu option, fixed click handler

**Key Methods:**
- `TreeTabManager.addTab()` - No longer uses `lastActiveTabId`
- `TreeTabManager.onTabAdded()` - Explicitly passes `null` for parent
- `TreeTabManager.resetAllToRoot()` - New utility method
- `SidebarUI.clearSelection()` - Now called on every normal click

---

## Summary

**Root Cause:** Auto-parenting to last active tab during Zotero tab reload cycles

**Solution:** Remove implicit parenting; only parent via explicit user actions (drag, group)

**Impact:** Fixed cascading child tabs bug, improved tree stability

**User Recovery:** Context menu "Reset all tabs to root level" option

---

**Status:** ✅ Fixed in dev build  
**Build:** treestyletabs-dev.xpi (February 4, 2026)
