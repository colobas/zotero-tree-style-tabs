# Quick Reference: Zotero Extension UI Patterns

**Last Updated:** February 3, 2026  
**Source:** Lessons from tree-style tabs development

---

## Show/Hide Elements

### ✅ Recommended Pattern
```javascript
// Hide
element.setAttribute("hidden", "true");

// Show
element.removeAttribute("hidden");

// Check if hidden
const isHidden = element.hasAttribute("hidden");
```

```css
#my-element[hidden] {
  display: none;
}
```

### ❌ Avoid
```javascript
// Don't use inline display property
element.style.display = "none";
element.style.display = "flex";
```

**Why:** Native `hidden` attribute is more reliable in Firefox/XUL and preserves layout state.

---

## Reliable Visual Styling

### ✅ Use Inline Styles for Critical Properties
```javascript
// For properties that MUST work
element.style.backgroundColor = "#e3f2fd";
element.style.borderLeft = "3px solid #2196F3";
element.style.padding = "8px";
```

**Why:** External CSS may not load reliably; inline styles have highest specificity.

### ⚠️ CSS :hover is Unreliable - Use JavaScript Instead

**❌ Don't Do This:**
```css
.my-button:hover {
  background: #ccc !important;
  border: 1px solid #999 !important;
}
```
CSS pseudo-classes (`:hover`, `:active`, `:focus`) don't work reliably in Zotero.

**✅ Do This Instead:**
```javascript
const setupButton = (btn: HTMLButtonElement) => {
  // Default state
  btn.style.background = "transparent";
  btn.style.border = "1px solid transparent";
  
  // Hover state via event handlers
  btn.addEventListener("mouseenter", () => {
    btn.style.background = "rgba(0, 0, 0, 0.05)";
    btn.style.border = "1px solid rgba(0, 0, 0, 0.15)";
  });
  
  btn.addEventListener("mouseleave", () => {
    btn.style.background = "transparent";
    btn.style.border = "1px solid transparent";
  });
};
```

**Rule:** For interactive states (hover, focus, active, drag), always use inline styles + JavaScript event handlers.

### ✅ Use setProperty with "important" for Width Control
```javascript
element.style.setProperty("width", "250px", "important");
element.style.setProperty("min-width", "250px", "important");
element.style.setProperty("max-width", "250px", "important");
```

**When:** Setting dimensions that must not be overridden by flex containers.

---

## Click vs Drag Detection

```javascript
let mouseDownPos = { x: 0, y: 0 };
let mouseDownTime = 0;

element.addEventListener("mousedown", (e) => {
  mouseDownPos = { x: e.clientX, y: e.clientY };
  mouseDownTime = Date.now();
});

element.addEventListener("click", (e) => {
  // Check if it was actually a drag
  const dx = Math.abs(e.clientX - mouseDownPos.x);
  const dy = Math.abs(e.clientY - mouseDownPos.y);
  
  if (element.classList.contains("dragging") || dx > 10 || dy > 10) {
    return; // Skip click action
  }
  
  // Normal click behavior
  handleClick();
});

element.addEventListener("dragstart", (e) => {
  element.classList.add("dragging");
});

element.addEventListener("dragend", (e) => {
  element.classList.remove("dragging");
});
```

**Why:** Prevents accidental item selection during drag-and-drop reorganization.

---

## Drag-and-Drop Visual Feedback

**Use inline styles for immediate visual response:**

```javascript
// Setup drag element
element.draggable = true;

element.addEventListener("dragstart", (e) => {
  e.dataTransfer?.setData("text/plain", element.id);
  // Visual feedback with inline styles
  element.style.opacity = "0.5";
  element.style.cursor = "grabbing";
});

element.addEventListener("dragend", () => {
  // Restore styles
  element.style.opacity = "1";
  element.style.cursor = "grab";
  
  // Clean up all drop targets
  document.querySelectorAll(".drop-target").forEach((el) => {
    el.classList.remove("drop-target");
    (el as HTMLElement).style.outline = "";
    (el as HTMLElement).style.backgroundColor = "";
  });
});

// Setup drop target
element.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  // Visual feedback with inline styles
  element.style.outline = "2px solid #2196F3";
  element.style.backgroundColor = "rgba(33, 150, 243, 0.1)";
  element.classList.add("drop-target");
});

element.addEventListener("dragleave", (e) => {
  // Only remove if truly leaving (prevent flickering)
  const rect = element.getBoundingClientRect();
  const x = (e as DragEvent).clientX;
  const y = (e as DragEvent).clientY;
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    element.style.outline = "";
    element.style.backgroundColor = "";
    element.classList.remove("drop-target");
  }
});

element.addEventListener("drop", (e) => {
  e.preventDefault();
  element.style.outline = "";
  element.style.backgroundColor = "";
  element.classList.remove("drop-target");
  
  const draggedId = e.dataTransfer?.getData("text/plain");
  // Handle drop...
});
```

**Key Points:**
- Use inline styles for visual changes (CSS classes alone won't work)
- Clean up all visual state in `dragend` event
- Use `dragleave` boundary check to prevent flicker
- Always call `e.preventDefault()` in `dragover` to enable drop

---

## Context Menu Positioning

```javascript
function showContextMenu(win, tabId, event) {
  const sidebar = getSidebarElement();
  const tabEl = getTabElement(tabId);
  
  // Get bounding rectangles
  const sidebarRect = sidebar.getBoundingClientRect();
  const tabRect = tabEl.getBoundingClientRect();
  
  // Position menu at sidebar edge, aligned with tab
  const menuLeft = sidebarRect.right + 5;
  const menuTop = tabRect.top;
  
  menu.style.position = "fixed";
  menu.style.left = `${menuLeft}px`;
  menu.style.top = `${menuTop}px`;
  
  // Adjust if menu would overflow viewport
  setTimeout(() => {
    const menuRect = menu.getBoundingClientRect();
    const viewportHeight = win.innerHeight;
    const viewportWidth = win.innerWidth;
    
    if (menuRect.bottom > viewportHeight) {
      const overflow = menuRect.bottom - viewportHeight;
      menu.style.top = `${Math.max(0, menuTop - overflow - 10)}px`;
    }
    
    if (menuRect.right > viewportWidth) {
      menu.style.left = `${Math.max(5, tabRect.left - menuRect.width - 5)}px`;
    }
  }, 0);
}
```

**Key Points:**
- Use `fixed` positioning with viewport coordinates
- Position from sidebar edge, not tab edge (more stable)
- Check and adjust for viewport boundaries
- Use `setTimeout` to adjust after menu renders

---

## Debug Logging Pattern

```javascript
function debugToggle(sidebar) {
  Zotero.debug(`[Extension Name] Action starting`);
  Zotero.debug(`[Extension Name] offsetWidth: ${sidebar.offsetWidth}px`);
  Zotero.debug(`[Extension Name] clientWidth: ${sidebar.clientWidth}px`);
  
  const rect = sidebar.getBoundingClientRect();
  Zotero.debug(`[Extension Name] BoundingRect: ${rect.width}px`);
  
  const computed = win.getComputedStyle(sidebar);
  Zotero.debug(`[Extension Name] Computed width: ${computed.width}`);
  
  // Check after delay for async changes
  setTimeout(() => {
    Zotero.debug(`[Extension Name] After delay - width: ${sidebar.offsetWidth}px`);
  }, 100);
}
```

**View logs:** Help → Debug Output Logging → View Output (Cmd+Shift+D)

---

## Single-Line Text with Ellipsis

```javascript
// Apply to container
element.style.height = "24px";
element.style.maxHeight = "24px";
element.style.overflow = "hidden";
element.style.whiteSpace = "nowrap";
element.style.display = "flex";
element.style.alignItems = "center";

// Apply to text span
textSpan.style.overflow = "hidden";
textSpan.style.textOverflow = "ellipsis";
textSpan.style.whiteSpace = "nowrap";
textSpan.style.display = "block";
textSpan.style.flex = "1 1 auto";
textSpan.style.minWidth = "0";
```

**Why:** Inline styles ensure consistent rendering; `minWidth: 0` prevents flex items from growing.

---

## Flex Container Width Control

```javascript
// Prevent flex container from resizing element
sidebar.style.setProperty("flex-shrink", "0", "important");
sidebar.style.setProperty("flex-grow", "0", "important");
sidebar.style.setProperty("flex-basis", "250px", "important");
```

**When:** Element is inside a flex container but must maintain fixed width.

---

## Resize Handle Implementation

```javascript
let resizing = false;
let startX = 0;
let startWidth = 0;

resizer.addEventListener("mousedown", (e) => {
  resizing = true;
  startX = e.clientX;
  startWidth = sidebar.offsetWidth;
  e.preventDefault();
});

win.addEventListener("mousemove", (e) => {
  if (!resizing) return;
  
  const diff = (position === "right") 
    ? startX - e.clientX 
    : e.clientX - startX;
  
  const newWidth = Math.min(400, Math.max(180, startWidth + diff));
  sidebar.style.width = `${newWidth}px`;
});

win.addEventListener("mouseup", () => {
  if (resizing) {
    resizing = false;
    savePref("sidebarWidth", sidebar.offsetWidth);
  }
});
```

**Key Points:**
- Use window-level mousemove/mouseup (not on resizer)
- Clamp width to min/max values
- Save preference on mouseup
- Adjust direction based on sidebar position

---

## Tab List Filtering

```javascript
function refresh(win) {
  const tabs = TreeTabManager.getTabsInTreeOrder();
  
  // Filter out unwanted tab types
  const filteredTabs = tabs.filter((tab) => {
    // Always show groups
    if (tab.nodeType === "group") return true;
    
    // Filter out library/collection views
    if (tab.type === "library") return false;
    if (tab.type === "zotero-pane") return false;
    
    // Keep everything else (readers, etc.)
    return true;
  });
  
  // Render filtered tabs
  for (const tab of filteredTabs) {
    const tabEl = createTabElement(win, tab);
    tabList.appendChild(tabEl);
  }
}
```

**Why:** Tree-style tabs should show actual items, not library navigation.

---

## Element Cleanup Pattern

```javascript
class MyUI {
  private static registeredElements = new Map<Window, HTMLElement[]>();
  
  static trackElement(win: Window, element: HTMLElement) {
    if (!this.registeredElements.has(win)) {
      this.registeredElements.set(win, []);
    }
    this.registeredElements.get(win)?.push(element);
  }
  
  static destroyForWindow(win: Window) {
    const elements = this.registeredElements.get(win);
    if (elements) {
      for (const el of elements) {
        el.remove();
      }
      this.registeredElements.delete(win);
    }
  }
}
```

**When:** Extension needs to clean up UI elements when window closes.

---

## Common Pitfalls to Avoid

### ❌ Don't: Rely on External CSS Alone
```css
/* This may not load or be overridden */
.my-tab { background: blue; }
```

### ✅ Do: Use Inline Styles for Critical Properties
```javascript
element.style.backgroundColor = "blue";
```

---

### ❌ Don't: Use display Property for Toggle
```javascript
element.style.display = "none";
```

### ✅ Do: Use hidden Attribute
```javascript
element.setAttribute("hidden", "true");
```

---

### ❌ Don't: Position Menu from Tab Edge
```javascript
const left = tabRect.right + 5;
```

### ✅ Do: Position from Sidebar Edge
```javascript
const left = sidebarRect.right + 5;
```

---

### ❌ Don't: Trust offsetWidth Alone
```javascript
// May show 250px but visually be wider
console.log(element.offsetWidth); // 250
```

### ✅ Do: Check Visual Appearance + Logs
```javascript
// Compare multiple measurements
console.log("offset:", element.offsetWidth);
console.log("client:", element.clientWidth);
console.log("rect:", element.getBoundingClientRect().width);
```

---

## File Locations Reference

### TypeScript Sources
- `src/modules/sidebarUI.ts` - Main UI rendering logic
- `src/modules/treeTabManager.ts` - Tree data management
- `src/hooks.ts` - Lifecycle hooks
- `src/utils/prefs.ts` - Preference management

### CSS
- `addon/content/treestyletabs.css` - Main stylesheet

### Build Output
- `build/` - Compiled JavaScript
- `treestyletabs-dev.xpi` - Development build
- `treestyletabs-1.0.0.xpi` - Production build

---

## Development Workflow

```bash
# Build extension
npm run build

# Start dev server (auto-restarts Zotero)
npm start

# In separate terminal: Watch and rebuild on changes
npm run watch

# View logs in Zotero
# Help → Debug Output Logging → View Output
# Or: Cmd+Shift+D
```

---

## Testing Checklist

Before committing changes:

- [ ] Click tabs to select them (should highlight)
- [ ] Drag tabs to reorganize (should not trigger selection)
- [ ] Toggle sidebar off and on (should look identical)
- [ ] Resize sidebar (should work smoothly)
- [ ] Right-click tabs (menu appears in correct position)
- [ ] Toggle sidebar, then right-click (menu still correct)
- [ ] Close tabs (should remove from tree)
- [ ] Create groups (should appear in tree)
- [ ] Expand/collapse groups (should show/hide children)
- [ ] No "My Library" in tree (should be filtered out)

---

## Performance Tips

### Efficient Refresh
```javascript
// Don't refresh entire tree for single item changes
static updateTab(tabId: string) {
  const tabEl = this.getTabElement(tabId);
  if (tabEl) {
    this.updateTabElement(tabEl, tab);
  }
}
```

### Debounce Rapid Changes
```javascript
let refreshTimeout: number | null = null;

static scheduleRefresh(win: Window) {
  if (refreshTimeout) clearTimeout(refreshTimeout);
  refreshTimeout = setTimeout(() => {
    this.refresh(win);
    refreshTimeout = null;
  }, 50);
}
```

### Use Event Delegation
```javascript
// Instead of listener on each tab
tabList.addEventListener("click", (e) => {
  const tabEl = e.target.closest(".treestyletabs-tab");
  if (tabEl) {
    const tabId = tabEl.dataset.tabId;
    handleTabClick(tabId);
  }
});
```

---

## Getting Help

1. **Check debug logs** - Most issues show up in logs
2. **Compare measurements** - offsetWidth vs clientWidth vs boundingRect
3. **Test in isolation** - Create minimal reproduction
4. **Review past notes** - Check notes/ directory for similar issues
5. **Try native patterns** - When CSS fails, try XUL-native approaches
