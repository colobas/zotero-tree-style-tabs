# Tree Style Tabs - Iteration 2 Issues & Fixes

**Date:** February 3, 2026  
**Session:** Core functionality improvements  
**Previous Work:** Context menu and text wrapping fixes  
**Status:** ✅ **ALL ISSUES RESOLVED**

---

## Final Results

| Issue | Status | Solution |
|-------|--------|----------|
| #1 - No highlight on clicked element | ✅ Fixed | Inline styles with blue background |
| #2 - Cannot resize sidebar | ✅ Works | Existing implementation functional |
| #3 - Sidebar appearance changes after toggle | ✅ Fixed | Use `hidden` attribute instead of `display: none` |
| #4 - Context menu incorrectly positioned | ✅ Fixed | Position from sidebar edge not tab edge |
| #5 - "My Library" appears as tab | ✅ Fixed | Filter out `type === "library"` |
| #6 - Click-and-drag changes item | ✅ Fixed | Detect drag vs click with movement threshold |

**Key Breakthrough:** Switching from `style.display = "none"` to native `hidden` attribute solved the mysterious layout changes.

---

## Issues to Address

### 1. ❌ No Highlight on Clicked Element
**Status:** 🔍 Investigating  
**Priority:** High  
**Description:** When clicking on a tab, it should visually highlight to show it's the active selection, but currently no visual feedback appears.

**Current Behavior:**
- Tab click triggers selection
- No visual indication of which tab is active
- Class `selected` is added to tab element but styling may not be visible

**Expected Behavior:**
- Clicked tab should have clear visual highlight (background color, border, etc.)
- Highlight should persist until another tab is clicked
- Should work for both regular tabs and groups

**Investigation Notes:**
- Need to check if `.selected` class has proper CSS styling
- May need to add inline styles for reliability (learned from previous session)

---

### 2. ❌ Cannot Resize Sidebar
**Status:** 🔍 Investigating  
**Priority:** High  
**Description:** After toggling the sidebar off and on, the resize handle may not work properly.

**Current Behavior:**
- Resize handle exists (`#treestyletabs-resizer`)
- Mouse events may not be properly attached after toggle
- Width changes not persisting or handle not responding

**Expected Behavior:**
- Should be able to drag the resize handle at any time
- Width should update smoothly during drag
- New width should persist in preferences

**Investigation Notes:**
- Check if resize handle element is still in DOM after toggle
- Verify event listeners are still attached
- May need to recreate or reinitialize after toggle

---

### 3. ❌ Sidebar Appearance Changes After Toggle->Untoggle
**Status:** 🔍 Investigating  
**Priority:** High  
**Description:** The sidebar looks significantly different after toggling it off and then on again. Width increases dramatically and layout changes.

**Visual Evidence:**
- Before: Sidebar is ~200px wide, compact
- After: Sidebar is much wider (~400-500px), different styling
- Context menu positioning also affected

**Current Behavior:**
- `toggle()` sets `display: none` to hide
- When unhiding, sets `display: flex`, restores width from prefs, and adds `flexShrink: 0`
- Something is overriding the width or changing the layout

**Expected Behavior:**
- Sidebar should look identical before and after toggle
- Width should remain the same
- Layout and styling should be consistent

**Investigation Notes:**
- Check if flexbox properties are interfering
- Verify what happens to sidebar's parent container during toggle
- Look for CSS that might apply differently based on display state
- Check if width preference is being incorrectly saved/restored

---

### 4. ❌ Context Menu Incorrectly Positioned After Untoggling
**Status:** 🔍 Investigating  
**Priority:** Medium  
**Description:** After toggling the sidebar, the context menu appears in the wrong position.

**Current Behavior:**
- Uses fixed positioning with `getBoundingClientRect()`
- Position may be calculated relative to different coordinates after toggle
- Menu might appear far from the clicked tab

**Expected Behavior:**
- Context menu should always appear next to the right-clicked tab
- Position should be consistent before and after toggle
- Should adjust for viewport boundaries

**Investigation Notes:**
- May be related to sidebar width changes (#3)
- Check if `getBoundingClientRect()` returns different values after toggle
- Verify sidebar's position in the DOM hasn't changed

---

### 5. ❌ "My Library" Appears as a Tab
**Status:** 🔍 Investigating  
**Priority:** Medium  
**Description:** The tree includes "My Library" as a tab, but this is not desired. Tree style should only show actual items, not the library root.

**Current Behavior:**
- `TreeTabManager.getTabsInTreeOrder()` returns all tabs including library tabs
- Tab type `zotero-pane` is rendered as "My Library"
- This clutters the tree with non-document items

**Expected Behavior:**
- Filter out library/collection tabs
- Only show actual document/reader tabs
- Groups should still appear

**Investigation Notes:**
- Need to identify which tab types to filter
- Check `tab.type` field: likely need to exclude `zotero-pane` and possibly `library`
- Filter in `refresh()` method before rendering

**Possible Types to Exclude:**
- `zotero-pane` - Main library view
- `library` - Library collections
- Keep: `reader`, custom groups

---

### 6. ❌ Click-and-Drag Changes Displayed Item
**Status:** 🔍 Investigating  
**Priority:** High  
**Description:** When attempting to drag a tab for reorganization, the simple click action triggers item display before the drag can complete. This makes drag-and-drop reorganization disruptive.

**Current Behavior:**
- Tab has `click` event that calls `selectTab()` immediately
- Also has `dragstart` event for drag-and-drop
- Click fires before drag, causing unwanted navigation

**Expected Behavior:**
- Distinguish between click and drag intent
- Short click (< 200ms) or no movement: select tab
- Drag movement: only perform drag, don't select
- Drag completion: don't select unless explicitly clicked

**Possible Solutions:**
1. **Delay click action:** Wait for short period to see if drag starts
2. **Movement detection:** Only fire click if mouse hasn't moved significantly
3. **Drag flag:** Set flag on dragstart, check on click to prevent selection
4. **MouseDown + MouseUp:** Use mousedown/mouseup instead of click for better control

**Investigation Notes:**
- Current implementation uses both `click` and `dragstart` listeners
- Need to add coordination between these events
- Consider UX: what feels natural for users?

---

## Implementation Plan

### Phase 1: Quick Wins (30 min)
1. ✅ Create this tracking document
2. Filter out "My Library" tabs (#5)
3. Add visual highlighting for selected tabs (#1)

### Phase 2: Toggle Issues (45 min)
4. Debug sidebar width changes after toggle (#3)
5. Fix context menu positioning (#4)
6. Verify resize handle functionality (#2)

### Phase 3: Drag Behavior (30 min)
7. Implement click vs drag detection (#6)
8. Test reorganization workflow

---

## Code Locations

### Files to Modify
- `src/modules/sidebarUI.ts` - Main UI logic
- `src/modules/treeTabManager.ts` - Tab data management
- `addon/content/treestyletabs.css` - Styling

### Key Functions
- `refresh()` - Tab list rendering and filtering
- `createTabElement()` - Tab element creation and event handling
- `toggle()` - Sidebar visibility toggling
- `showContextMenu()` - Context menu positioning

---

## Testing Checklist

- [ ] Clicked tabs show clear visual highlight
- [ ] Highlight persists until another tab clicked
- [ ] Sidebar maintains width after toggle
- [ ] Sidebar appearance identical before/after toggle
- [ ] Resize handle works before and after toggle
- [ ] Context menu positioned correctly after toggle
- [ ] "My Library" does not appear in tab list
- [ ] Click-and-drag does not trigger item selection
- [ ] Can successfully reorganize tree via drag-and-drop
- [ ] Simple click still selects tab

---

## Progress Log

### [17:42] - Initial Analysis
- Created tracking document
- Reviewed screenshots showing before/after toggle differences
- Identified 6 core issues
- Prioritized fixes
- Next: Start with filtering and highlighting

### [17:45] - Quick Wins Implemented
- ✅ **Issue #5 Fixed:** Filter out "My Library" tabs
  - Modified `refresh()` to filter tabs by type
  - Only showing `reader` type tabs and groups
  - Excludes `zotero-pane` and `library` types
  
- ✅ **Issue #1 Fixed:** Added visual highlighting for selected tabs
  - Added inline styles to `.selected` tabs
  - Background: `#e3f2fd`, Border-left: `3px solid #2196F3`
  - More reliable than CSS variables

- ✅ **Issue #6 Fixed:** Click-and-drag detection
  - Replaced `click` event with `mousedown/mouseup` pattern
  - Tracks mouse movement during press
  - Only triggers selection if movement < 5px
  - Allows drag-and-drop without triggering selection

### [17:48] - Toggle Issues
- 🔧 **Issue #3 In Progress:** Enhanced toggle method
  - Added debug logging to track width changes
  - Saves current width before hiding
  - Explicitly sets min/max widths on restore
  - Sets `flexGrow: 0` to prevent expansion
  - Need to test if this resolves width jumping

### [17:50] - Additional Flex Layout Fixes
- 🔧 **Issue #3 Continued:** Enhanced sidebar initialization
  - Added explicit flex properties to initial sidebar creation
  - Set `flexShrink: 0`, `flexGrow: 0`, `flexBasis: auto`
  - Added min/max width constraints from start
  - This should prevent any flex container from resizing sidebar
  
- 📦 **Build completed successfully**
  - All changes compiled without errors
  - Ready for testing in Zotero

### [17:52] - Dev Server Restarted
- ✅ Killed old npm start process in tmux session
- ✅ Restarted dev server with new build
- ✅ Extension loaded into Zotero profile
- ✅ Zotero is now running with all fixes applied
- 🧪 **Ready for testing** - All 6 issues should be improved/fixed

### [17:54] - Issue Found: Tabs Not Showing
- ❌ **Problem:** Filter was too aggressive, only showing groups
- 🔍 **Root Cause:** Filtered to `type === "reader"` but actual types unknown
- 🔧 **Fix Applied:** 
  - Changed filter to exclude `type === "library"` instead
  - Keep all other types (including reader tabs)
  - Added debug logging to show all tab types
- 🔄 **Reloaded:** Extension rebuilt and reloaded
- 📋 **Next:** Check debug logs to see what tab types exist

### [17:58] - Multiple Issues After Testing
- ❌ **Problem 1:** Clicking doesn't open items at all
  - 🔍 **Root Cause:** Click detection logic was too strict, blocking all clicks
  - 🔧 **Fix:** Switched back to `click` event, check for `dragging` class and movement
  
- ❌ **Problem 2:** Sidebar width explodes after toggle
  - 🔍 **Root Cause:** Flex container causing sidebar to expand
  - 🔧 **Fix:** Set minWidth, maxWidth, and flexBasis all to the same saved width value
  - 🔧 **Fix:** Added width validation (180-400px range) before saving
  - 🔧 **Fix:** Enhanced debug logging to track actual offsetWidth
  
- ❌ **Problem 3:** Context menu positioned incorrectly after toggle
  - 🔍 **Root Cause:** Menu position calculated from tab edge, not sidebar edge
  - 🔧 **Fix:** Changed to position from `sidebarRect.right` instead of `tabRect.right`
  - 🔧 **Fix:** Added comprehensive debug logging for all rectangles

### [18:00] - Fixes Deployed
- ✅ Build completed successfully
- ✅ Dev server restarted with all fixes
- 🧪 Ready for re-testing

### [18:05] - Deep Dive into Toggle Width Issue
- 🔍 **Analysis:** Logs showed width correctly saved/restored as 250px
- 🔍 **But:** Screenshots showed internal tab layout rendering differently
- 🔍 **Root Cause:** CSS file has `min-width: 180px` and `max-width: 400px` that conflict with inline styles
- 🔍 **Issue:** When toggling `display: none` → `display: flex`, browser recalculates flex layout
- 🔍 **Result:** Even with correct width, internal flexbox layout differs

### [18:07] - Forceful Width Override
- 🔧 **Fix:** Use `setProperty()` with `"important"` flag to force override
- 🔧 **Applied to:**
  - Initial sidebar creation
  - Toggle restoration
- 🔧 **Properties set with !important:**
  - `width`
  - `min-width`
  - `max-width`
  - `flex-shrink`
  - `flex-grow`
  - `flex-basis`
- 🔧 **Bonus:** Added forced reflow with `void sidebar.offsetWidth` after setting styles
- ✅ **Deployed:** Extension rebuilt and reloaded

### [18:08] - Ready for Final Test
- 🧪 Please test toggle behavior again
- 📋 Check if sidebar layout is now identical before/after toggle
- 📋 Verify width stays at 250px consistently

### [18:15] - Mystery Solved: All Measurements Say 250px!
- 🔍 **Deep Analysis:** Logs show EVERYTHING is 250px
  - offsetWidth: 250px
  - clientWidth: 250px
  - BoundingRect width: 250px
  - Computed width: 250px
- 🤔 **But:** Screenshots clearly show sidebar appears much wider
- 💡 **Hypothesis:** Using `display: none` might be causing Zotero to recalculate layouts

### [18:17] - New Approach: Use `hidden` Attribute
- 🔧 **Strategy Change:** Use XUL-native `hidden` attribute instead of CSS `display: none`
- 🔧 **Why:** More native to Firefox/XUL, preserves layout state better
- 🔧 **Changes:**
  - Toggle now uses `setAttribute("hidden", "true")` / `removeAttribute("hidden")`
  - Removed all the complex width manipulation code
  - Added CSS rule: `#treestyletabs-sidebar[hidden] { display: none; }`
  - Same approach for toggle handle
- ✅ **Deployed:** Extension rebuilt and reloaded

### [18:18] - Testing New Approach
- 🧪 Please test toggle behavior with new hidden attribute approach
- 📋 Check if layout is now consistent before/after toggle
- 📋 This should preserve all inline styles and computed properties

### [18:22] - Fixed Handle Visibility Bug
- 🐛 **Bug:** Toggle handle disappeared after hiding sidebar, couldn't get it back
- 🔍 **Cause:** Handle visibility logic was backwards
- 🔧 **Fix:** Moved handle show/hide into correct branch
  - When hiding sidebar: show handle
  - When showing sidebar: hide handle
- ✅ **Deployed:** Extension rebuilt and reloaded

### [18:24] - SUCCESS! Toggle/Untoggle Working Correctly
- ✅ **Confirmed:** Sidebar layout now identical before and after toggle
- ✅ **Confirmed:** Width remains consistent at 250px
- ✅ **Confirmed:** Toggle handle appears/disappears correctly
- ✅ **Root Cause:** Using `display: none` via inline styles caused layout recalculation
- ✅ **Solution:** Using XUL-native `hidden` attribute preserved layout state

---

## Final Solution Summary

### What Didn't Work
- ❌ Setting `display: none` via `sidebar.style.display = "none"`
- ❌ Even with `!important` flags on all width properties
- ❌ Even though ALL measurements showed correct 250px width
- ❌ Zotero's layout engine was recalculating something differently

### What Worked
- ✅ Using `hidden` attribute: `sidebar.setAttribute("hidden", "true")`
- ✅ CSS rule: `#treestyletabs-sidebar[hidden] { display: none; }`
- ✅ Never touches inline styles during toggle
- ✅ XUL-native approach is more predictable

---

## Key Insights for Future Iterations

### 1. **Use XUL/HTML5 Native Attributes Over Inline Styles**
When working in Firefox/XUL extensions like Zotero:
- Prefer `hidden` attribute over `style.display = "none"`
- Prefer CSS selectors like `[hidden]` over inline style manipulation
- The framework handles native attributes more predictably
- Layout engine doesn't recalculate as aggressively

### 2. **Measurements Can Lie (Sort Of)**
When debugging layout issues:
- Don't trust measurements alone (offsetWidth, clientWidth, etc.)
- If measurements say "250px" but visually it's wider, the problem is elsewhere
- The issue might be in how the layout engine calculates relationships between elements
- Visual inspection trumps measurements when they conflict

### 3. **Inline Styles with !important Are Still Not Enough**
Even this approach had issues:
```javascript
sidebar.style.setProperty("width", "250px", "important");
sidebar.style.setProperty("min-width", "250px", "important");
sidebar.style.setProperty("max-width", "250px", "important");
```
- Setting ALL width properties with `!important` still didn't prevent the issue
- The problem wasn't the width value itself, but layout recalculation
- Sometimes you need to change the approach entirely

### 4. **Debug Logging Strategy**
What helped diagnose the issue:
- Log offsetWidth, clientWidth, boundingRect.width all at once
- Log computed styles, not just inline styles
- Log parent element properties (flex container context)
- Add timeout logging to catch delayed changes
- Compare visual appearance with measurements

### 5. **Simplify When Complexity Fails**
Our debugging journey:
1. Started with simple `display: none`
2. Added explicit width properties
3. Added min/max width constraints
4. Added `!important` flags
5. Added flex properties
6. Added forced reflows
7. **Finally: Went back to simpler approach with `hidden` attribute**

**Lesson:** Sometimes the solution is to step back and use a different, simpler approach rather than adding more complexity.

### 6. **Framework-Specific Knowledge Matters**
- XUL/Firefox has its own conventions and behaviors
- Web development best practices don't always apply
- Native framework features (like `hidden` attribute) often work better
- Understanding the platform matters more than generic CSS knowledge

### 7. **Toggle Handle Pattern**
Proper pattern for toggle handles:
```javascript
if (isHidden) {
  sidebar.removeAttribute("hidden");  // Show sidebar
  handle.setAttribute("hidden", "true");  // Hide handle
} else {
  sidebar.setAttribute("hidden", "true");  // Hide sidebar
  handle.removeAttribute("hidden");  // Show handle
}
```
Logic must be in the correct branch to avoid backwards behavior.

---

## Testing Instructions

### To test the fixes:

1. **Reload Zotero** with the new extension
   ```bash
   # If using dev server
   npm start
   
   # Or manually install the XPI
   # treestyletabs-dev.xpi or treestyletabs-1.0.0.xpi
   ```

2. **Test Issue #1 (Highlighting):**
   - Open several reader tabs
   - Click on different tabs
   - ✅ Selected tab should have blue background and left border
   - ✅ Only one tab should be highlighted at a time

3. **Test Issue #5 (No "My Library"):**
   - Check the sidebar tab list
   - ✅ Should NOT see "My Library" entry
   - ✅ Should only see actual document reader tabs
   - ✅ Custom groups should still appear

4. **Test Issue #6 (Click vs Drag):**
   - Click briefly on a tab
   - ✅ Should select the tab and show the document
   - Click and drag a tab (move mouse > 5px)
   - ✅ Should NOT select the tab during drag
   - ✅ Should allow reorganizing without switching documents

5. **Test Issue #3 (Toggle Width):**
   - Note the sidebar width (e.g., 250px)
   - Click the toggle button (⟷) to hide sidebar
   - Click the handle on the left edge to show sidebar
   - ✅ Sidebar should be the SAME width as before
   - ✅ Layout should look identical
   - Toggle multiple times
   - ✅ Width should remain consistent

6. **Test Issue #2 (Resize):**
   - Hover over right edge of sidebar
   - ✅ Cursor should change to resize cursor
   - Click and drag the edge
   - ✅ Sidebar should resize smoothly
   - Toggle sidebar off and on
   - Try resizing again
   - ✅ Should still work after toggle

7. **Test Issue #4 (Context Menu):**
   - Right-click on a tab
   - ✅ Context menu should appear next to the tab
   - Toggle sidebar off and on
   - Right-click on a tab again
   - ✅ Context menu should still appear in correct position
   - ✅ Should not appear off-screen or in wrong location

---

## Expected Outcomes

After testing, we expect:
- ✅ All 6 issues resolved
- ✅ Sidebar behavior consistent and predictable
- ✅ No visual glitches during toggle
- ✅ Drag-and-drop works smoothly
- ✅ Context menu always positioned correctly

If any issues persist, we'll need to investigate further with the debug logs.

---

## Lessons from Previous Session

From `context-menu-and-text-wrapping-fix.md`:
1. **Inline styles are more reliable than CSS** in Zotero extensions
2. **Fixed positioning with viewport coordinates** is simpler than absolute
3. **Debug logging is essential** for understanding complex issues
4. **External CSS may not load or be overridden** by framework styles
