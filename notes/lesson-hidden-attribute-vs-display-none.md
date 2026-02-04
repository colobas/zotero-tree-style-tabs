# Lesson: XUL/Firefox Native `hidden` Attribute vs CSS `display: none`

**Date:** February 3, 2026  
**Context:** Zotero tree-style tabs sidebar toggle issue  
**Impact:** Critical breakthrough that solved mysterious layout bugs

---

## The Problem

When toggling the sidebar visibility using JavaScript inline styles:

```javascript
// Hide
sidebar.style.display = "none";

// Show
sidebar.style.display = "flex";
```

**Observed Behavior:**
- Sidebar appeared much wider after toggling back on
- Internal tab layout rendered differently
- Close buttons appeared in different positions
- Text truncation changed

**Mystery:**
- ALL measurements showed width was correct (250px):
  - `offsetWidth: 250px`
  - `clientWidth: 250px`
  - `getBoundingClientRect().width: 250px`
  - `getComputedStyle().width: "250px"`
- Tried setting all width properties with `!important`: still failed
- Tried setting flex properties explicitly: still failed
- Visual appearance clearly showed sidebar was wider

---

## The Solution

Use the XUL/HTML5 native `hidden` attribute instead:

```javascript
// Hide
sidebar.setAttribute("hidden", "true");

// Show
sidebar.removeAttribute("hidden");
```

With corresponding CSS rule:

```css
#treestyletabs-sidebar[hidden] {
  display: none;
}
```

**Result:**
- ✅ Sidebar layout identical before and after toggle
- ✅ Width remains consistent
- ✅ No layout recalculation issues
- ✅ All visual properties preserved

---

## Why This Works

### 1. **Native to Firefox/XUL**
The `hidden` attribute is the standard way to hide elements in Firefox's XUL framework:
- More predictable behavior
- Framework expects and handles it properly
- Better integration with Firefox's layout engine

### 2. **No Inline Style Manipulation**
Using the attribute approach:
- Doesn't touch `element.style` at all
- Visibility controlled by CSS selector, not JavaScript
- Preserves all computed styles
- No style recalculation needed

### 3. **CSS Cascade Respected**
With CSS rule `[hidden] { display: none; }`:
- Follows proper CSS cascade
- Can be overridden if needed
- Predictable specificity
- No inline style priority conflicts

### 4. **Layout State Preserved**
The element maintains:
- All flex properties
- All width calculations
- All parent-child relationships
- All computed styles

---

## The Debugging Journey

### Attempt 1: Simple Display Toggle
```javascript
sidebar.style.display = "none"; // Hide
sidebar.style.display = "flex"; // Show
```
**Result:** Layout changes, sidebar appears wider ❌

### Attempt 2: Explicit Width Properties
```javascript
sidebar.style.display = "flex";
sidebar.style.width = "250px";
sidebar.style.minWidth = "180px";
sidebar.style.maxWidth = "400px";
```
**Result:** Still layout changes ❌

### Attempt 3: Add Flex Constraints
```javascript
sidebar.style.flexShrink = "0";
sidebar.style.flexGrow = "0";
sidebar.style.flexBasis = "250px";
```
**Result:** Still layout changes ❌

### Attempt 4: Use !important Flags
```javascript
sidebar.style.setProperty("width", "250px", "important");
sidebar.style.setProperty("min-width", "250px", "important");
sidebar.style.setProperty("max-width", "250px", "important");
// ... etc
```
**Result:** Still layout changes ❌

### Attempt 5: Native Hidden Attribute
```javascript
sidebar.setAttribute("hidden", "true"); // Hide
sidebar.removeAttribute("hidden"); // Show
```
**Result:** Perfect! Layout preserved ✅

---

## Key Insights

### 1. Framework Conventions Matter
When working with Firefox/XUL extensions:
- Use native patterns when available
- Don't fight the framework
- Web development best practices may not apply
- Platform-specific knowledge is valuable

### 2. Measurements Can Be Misleading
When debugging layout issues:
- offsetWidth/clientWidth show the element's size
- But don't show how the layout engine positions/renders it
- Visual inspection is still necessary
- Layout relationships matter more than individual measurements

### 3. Simplicity Over Complexity
- Adding more CSS properties didn't solve the problem
- Adding `!important` flags didn't solve the problem
- The solution was simpler: use a different approach
- Sometimes you need to step back and try something fundamentally different

### 4. Inline Styles Have Limits
In extension development:
- Inline styles can conflict with framework behavior
- Even with `!important`, they're not always reliable
- Attribute-based approaches can be more robust
- CSS selectors + attributes = more predictable

---

## Pattern for Other Extensions

When building Firefox/Zotero extensions, prefer this pattern:

### ❌ Don't Do This:
```javascript
// Manipulate display property directly
element.style.display = "none";
element.style.display = "block";

// Or visibility
element.style.visibility = "hidden";
element.style.visibility = "visible";
```

### ✅ Do This Instead:
```javascript
// Use hidden attribute
element.setAttribute("hidden", "true");
element.removeAttribute("hidden");
```

```css
/* With CSS selector */
#my-element[hidden] {
  display: none;
}
```

### Benefits:
1. **More reliable** - Framework handles it properly
2. **More maintainable** - Clear intent in code
3. **More flexible** - Easy to override with CSS if needed
4. **More predictable** - No layout recalculation issues

---

## When to Use Each Approach

### Use `hidden` Attribute When:
- ✅ Building Firefox/XUL extensions
- ✅ Working with Zotero's UI
- ✅ Need reliable show/hide behavior
- ✅ Want to preserve layout state
- ✅ Element should be completely removed from layout

### Use CSS Classes When:
- ✅ Need multiple visibility states (not just show/hide)
- ✅ Want smooth transitions/animations
- ✅ Building standard web applications
- ✅ Need fine-grained control over visibility behavior

### Use Inline Styles When:
- ✅ Dynamic positioning (e.g., context menus)
- ✅ User-adjustable properties (e.g., draggable widths)
- ✅ Values that can't be predetermined
- ⚠️ But avoid for show/hide in Firefox extensions!

---

## Related Patterns

### Toggle Handle Pattern
```javascript
if (isHidden) {
  // Show main element, hide handle
  element.removeAttribute("hidden");
  handle.setAttribute("hidden", "true");
} else {
  // Hide main element, show handle
  element.setAttribute("hidden", "true");
  handle.removeAttribute("hidden");
}
```

### Conditional Display with CSS
```css
/* Different states */
#element[collapsed] { height: 0; }
#element[hidden] { display: none; }
#element[minimized] { height: 32px; overflow: hidden; }
```

---

## Testing Checklist

When implementing show/hide functionality:

- [ ] Element actually disappears when hidden
- [ ] Element reappears when shown
- [ ] Layout identical before and after toggle
- [ ] Width/height preserved through toggle
- [ ] Child elements render correctly after toggle
- [ ] No visual glitches or jumps
- [ ] Toggle handle appears/disappears correctly
- [ ] Keyboard shortcuts still work
- [ ] Can toggle multiple times without issues

---

## References

- **HTML5 `hidden` attribute**: Global attribute for all elements
- **XUL Documentation**: Firefox's XML User Interface Language
- **Zotero Extension Development**: Building extensions for Zotero
- **CSS Attribute Selectors**: Using `[attr]` and `[attr="value"]` selectors

---

## Bottom Line

**When building Firefox/Zotero extensions:**
- ✅ Use `hidden` attribute for show/hide
- ❌ Don't use `style.display = "none"`
- ✅ Trust native platform conventions
- ❌ Don't fight the framework with CSS hacks

**This one change solved a bug that resisted multiple complex solutions.**
