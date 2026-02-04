# Zotero Tree Style Tabs - Development Notes

This directory contains development notes and lessons learned from building the Tree Style Tabs extension for Zotero.

## Session Notes

### Iteration 1: Context Menu & Text Wrapping
- **File:** `context-menu-and-text-wrapping-fix.md`
- **Date:** February 3, 2026 (early session)
- **Issues Fixed:**
  - Context menu appearing off-screen
  - Text wrapping in tab titles
  - CSS not loading properly
- **Key Lessons:**
  - External CSS unreliable in Zotero extensions
  - Use inline styles for critical properties
  - Fixed positioning better than absolute in extensions

### Iteration 2: Core Functionality
- **Files:** 
  - `iteration-2-fixes.md` (detailed tracking)
  - `iteration-2-summary.md` (technical summary)
- **Date:** February 3, 2026 (late session)
- **Issues Fixed:**
  - Selected tab highlighting
  - "My Library" filtering
  - Click vs drag detection
  - **Toggle width consistency (major breakthrough)**
  - Context menu positioning after toggle
- **Key Lessons:**
  - Use `hidden` attribute instead of `display: none`
  - XUL-native patterns beat CSS hacks
  - Measurements can be correct but layout still wrong

### Iteration 3: Folding, Tooltips, Persistence & UI Polish
- **Files:** 
  - `iteration-3-folding-and-tooltips.md` (detailed tracking)
  - `iteration-3-summary.md` (technical summary)
- **Date:** February 3, 2026 (evening session)
- **Issues Fixed:**
  - ✅ Folding/unfolding (inline styles for display)
  - ✅ Hover tooltips (native HTML title attribute)
  - ✅ **Tree persistence across restarts (CRITICAL - ID migration)**
  - ✅ Twisty arrow visibility (Unicode + inline styles)
  - ✅ Drag-and-drop visual feedback (inline styles in event handlers)
  - ✅ Header layout (single-line flexbox)
  - ✅ Button hover effects (JavaScript mouseenter/mouseleave)
- **Key Breakthroughs:**
  - **CSS pseudo-classes don't work reliably in Zotero**
  - Zotero regenerates tab IDs on restart → solved with ID migration by title matching
  - All interactive states need inline styles + JavaScript, not CSS
  - Established patterns for all future interactive elements

### Iteration 4: Native Tab Bar Hiding & Zotero 8 Compatibility
- **Files:** 
  - `iteration-4-native-tab-bar-hiding.md` (detailed tracking)
  - `development-summary.md` (complete project overview)
- **Date:** February 4, 2026
- **Issues Fixed:**
  - ✅ **Native tab bar hiding (user-requested feature)**
  - ✅ **`OS is not defined` errors (Zotero 8 API migration)**
  - ✅ **"No tabs open" on startup (timing issue)**
  - ✅ macOS window controls overlap (traffic lights)
  - ✅ No toggle mechanism for native tab bar
  - ✅ Tab list right padding (close buttons spacing)
- **Key Breakthroughs:**
  - **Inline styles required for hiding UI elements** (CSS injection doesn't work)
  - `OS.Path`/`OS.File` APIs deprecated in Zotero 8 → use `Zotero.File` or string concat
  - Initial sync needs 500ms delay for Zotero tab initialization
  - Platform-specific adjustments: macOS needs 40px top padding
  - **DO NOT hide `#tabs-deck`** - it contains tab content, not just the bar!

### Iteration 5: Multi-Selection for Batch Operations
- **Files:**
  - `iteration-5-multi-selection.md` (detailed tracking)
  - `iteration-5-summary.md` (technical summary)
- **Date:** February 4, 2026
- **Features Implemented:**
  - ✅ **Multi-tab selection** (Ctrl/Cmd+Click, Shift+Click)
  - ✅ **Visual feedback** (selection counter, orange highlighting)
  - ✅ **Batch drag & drop** (move multiple tabs together)
  - ✅ **Context menu** for multi-selection (close all, group all)
  - ✅ **Keyboard shortcuts** (Ctrl/Cmd+A, Escape)
  - ✅ **Select All toolbar button**
- **Key Patterns:**
  - State tracking with `Set<string>` for selected tab IDs
  - Range selection with shift+click
  - JSON array format for multi-tab drag data
  - Inline styles for hover and selection states
  - Auto-clear selection after operations

## Key Lessons

### Must-Read Documents

1. **`quick-reference-zotero-extension-patterns.md`**
   - Common patterns with copy-paste code examples
   - Show/hide, positioning, click detection, drag-and-drop, etc.
   - **Updated with CSS :hover reliability issues**
   - Quick reference for daily development
   - **Keep this open while coding**

2. **`lesson-hidden-attribute-vs-display-none.md`**
   - **Critical lesson:** Why `hidden` attribute works better than CSS display
   - The debugging journey from problem to solution
   - When to use each approach
   - **Read this first if working on show/hide functionality**

3. **`iteration-3-folding-and-tooltips.md`**
   - **Must read:** CSS :hover is unreliable in Zotero
   - Tab ID migration pattern for persistence
   - Interactive states require inline styles + JavaScript
   - Comprehensive drag-and-drop implementation
   - **Read this if working on any interactive UI elements**

4. **`iteration-4-native-tab-bar-hiding.md`**
   - **Critical:** Zotero 8 API migration (`OS.Path`/`OS.File` → `Zotero.File`)
   - Native tab bar hiding with inline styles
   - Startup timing issues and solutions
   - Platform-specific UI adjustments (macOS)
   - **Read this if working on Zotero 8+ compatibility or UI hiding**

5. **`development-summary.md`**
   - Complete project overview
   - All iterations summarized
   - Architecture and technical decisions
   - Future enhancements
   - **Read this for high-level understanding**

## Document Guide

### When Starting a New Feature
1. Read `quick-reference-zotero-extension-patterns.md` for patterns
2. Check session notes for related issues
3. Follow established patterns from quick reference

### When Debugging Layout Issues
1. Read `lesson-hidden-attribute-vs-display-none.md`
2. Check `iteration-2-fixes.md` for similar problems
3. Use debug logging patterns from quick reference

### When Implementing Show/Hide
1. **Always use `hidden` attribute**, not `display: none`
2. See `lesson-hidden-attribute-vs-display-none.md` for why
3. Pattern: `element.setAttribute("hidden", "true")`

### When Styling Elements
1. Use inline styles for critical properties
2. CSS classes for theming/optional styling
3. See both iteration documents for examples

## Quick Links by Topic

### Show/Hide Elements
- ✅ Lesson: `lesson-hidden-attribute-vs-display-none.md`
- 📚 Pattern: `quick-reference-zotero-extension-patterns.md#show-hide-elements`
- 🔍 Example: `iteration-2-fixes.md` (toggle implementation)

### Context Menu Positioning
- ✅ Lesson: `context-menu-and-text-wrapping-fix.md#context-menu-fix`
- 📚 Pattern: `quick-reference-zotero-extension-patterns.md#context-menu-positioning`
- 🔍 Example: `iteration-2-summary.md#context-menu-position`

### Click vs Drag Detection
- ✅ Lesson: `iteration-2-fixes.md#issue-6-click-and-drag-changes-displayed-item`
- 📚 Pattern: `quick-reference-zotero-extension-patterns.md#click-vs-drag-detection`
- 🔍 Example: `iteration-2-summary.md#click-vs-drag-detection-pattern`

### Reliable Styling
- ✅ Lesson: `context-menu-and-text-wrapping-fix.md#inline-styles-applied`
- 📚 Pattern: `quick-reference-zotero-extension-patterns.md#reliable-visual-styling`
- 🔍 Example: `iteration-2-summary.md#selected-highlighting`

### Debug Logging
- 📚 Pattern: `quick-reference-zotero-extension-patterns.md#debug-logging-pattern`
- 🔍 Example: `iteration-2-fixes.md` (extensive logging examples)

### Hiding UI Elements
- ✅ Lesson: `iteration-4-native-tab-bar-hiding.md#hide-native-tab-bar`
- 📚 Pattern: Use `element.style.setProperty("display", "none", "important")`
- 🔍 Example: `iteration-4-native-tab-bar-hiding.md#solutions-implemented`

### Zotero 8 API Migration
- ✅ Lesson: `iteration-4-native-tab-bar-hiding.md#fixed-deprecated-os-path-os-file-apis`
- 📚 Pattern: `OS.Path` → string concat, `OS.File` → `Zotero.File`
- 🔍 Example: `iteration-4-native-tab-bar-hiding.md#solutions-implemented`

### Platform-Specific UI
- ✅ Lesson: `iteration-4-native-tab-bar-hiding.md#macos-specific-layout-adjustments`
- 📚 Pattern: Check `Zotero.isMac` for platform-specific code
- 🔍 Example: `iteration-4-native-tab-bar-hiding.md#solutions-implemented`

## Development Principles

Based on lessons learned across both iterations:

### 1. Use Native Platform Features
- ✅ Prefer XUL/Firefox native attributes (`hidden`, etc.)
- ❌ Avoid fighting the framework with CSS hacks
- **Why:** More predictable, better integration with layout engine

### 2. Inline Styles for Critical Properties
- ✅ Use inline styles for must-work properties
- ✅ Use CSS for theming and optional styling
- **Why:** External CSS may not load or be overridden

### 3. Measure AND Observe
- ✅ Log measurements (offsetWidth, etc.)
- ✅ Also check visual appearance
- ❌ Don't trust measurements alone
- **Why:** Layout engine may calculate relationships differently

### 4. Simplify When Complexity Fails
- ✅ Try a different approach
- ❌ Don't pile on more complexity
- **Why:** Sometimes the solution is simpler, not more complex

### 5. Debug Logging is Essential
- ✅ Log before, during, and after changes
- ✅ Log multiple measurement types
- ✅ Use timeout logging for async changes
- **Why:** Makes debugging 10x faster

## Common Pitfalls

From hard-won experience:

| ❌ Don't Do This | ✅ Do This Instead | Why |
|-----------------|-------------------|-----|
| `element.style.display = "none"` | `element.setAttribute("hidden", "true")` | Native pattern preserves layout |
| Rely on external CSS alone | Use inline styles for critical properties | CSS may not load or be overridden |
| Use CSS `:hover` for buttons | Use `mouseenter`/`mouseleave` + inline styles | CSS pseudo-classes unreliable in Zotero |
| Use CSS classes for drag feedback | Use inline styles in event handlers | CSS classes alone don't provide visual feedback |
| Inject `<style>` to hide elements | Use `element.style.setProperty()` | Inline styles beat injected CSS |
| `OS.Path.join()` | String concatenation or `PathUtils` | `OS.Path` deprecated in Zotero 8 |
| `OS.File.exists()` | Try/catch with `Zotero.File` | `OS.File` deprecated in Zotero 8 |
| Hide `#tabs-deck` | Hide `#zotero-tabs-toolbar` instead | `#tabs-deck` contains tab content! |
| Position menu from tab edge | Position from sidebar edge | More stable during layout changes |
| Trust offsetWidth alone | Check visual + multiple measurements | Layout engine may calculate differently |
| Assume tab IDs persist | Match tabs by title on restart | Zotero regenerates tab IDs |
| Add complexity when stuck | Try a different, simpler approach | Complexity often masks real issue |

## Files Overview

### Session Tracking
- `context-menu-and-text-wrapping-fix.md` - First iteration session notes
- `iteration-2-fixes.md` - Second iteration tracking document
- `iteration-2-summary.md` - Technical summary of second iteration
- `iteration-3-folding-and-tooltips.md` - Third iteration tracking document
- `iteration-3-summary.md` - Technical summary of third iteration

### Deep Dives
- `lesson-hidden-attribute-vs-display-none.md` - Critical breakthrough explained

### Reference
- `quick-reference-zotero-extension-patterns.md` - Copy-paste patterns for daily use
- `README.md` - This file

## For Next Iteration

When starting the next development session:

1. **Read** `quick-reference-zotero-extension-patterns.md` first
2. **Check** previous iterations for related issues
3. **Follow** established patterns
4. **Document** new lessons learned
5. **Update** this README if new insights emerge

## Questions to Ask

Before implementing a feature:

- ✅ Is there a native XUL pattern for this?
- ✅ Should I use inline styles or CSS?
- ✅ What measurements should I log for debugging?
- ✅ Have we solved something similar before?
- ✅ Is there a simpler approach?

## Success Metrics

How we know the extension is working well:

- ✅ All issues from tracking documents resolved
- ✅ Toggle behavior consistent and predictable
- ✅ Click and drag both work correctly
- ✅ Context menus appear in correct position
- ✅ Layout identical before/after toggle
- ✅ No mysterious visual glitches
- ✅ Debug logs show expected behavior

---

**Last Updated:** February 4, 2026, 12:32 PST  
**Total Issues Resolved:** 23+ (across five iterations)  
**Key Breakthroughs:** 6 (inline styles, hidden attribute, CSS :hover unreliable, tab ID migration, Zotero 8 API migration, native tab bar hiding)  
**Features Added:** Multi-selection support (Iteration 5)
