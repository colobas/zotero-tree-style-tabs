# Tree Style Tabs for Zotero - Development Summary

## Project Overview

A Zotero 8 plugin providing tree-style tab management inspired by Firefox's Tree Style Tab extension.

**Repository**: `zotero-tree-style-tabs`  
**Version**: 1.0.0  
**License**: AGPL-3.0  
**Platform**: Zotero 8 (macOS, Windows, Linux)

---

## Development Iterations

### Iteration 1: Foundation (Not Documented)
- Initial project setup from zotero-plugin-template
- Basic tree structure implementation
- Sidebar UI skeleton

### Iteration 2: Core Functionality Fixes

**File**: `iteration-2-fixes.md`, `iteration-2-summary.md`

**Problems Solved**:
- Context menu positioning issues
- Tab title text wrapping
- Hidden attribute vs display:none conflicts

**Key Lessons**:
- Context menus need fixed positioning relative to viewport
- Overflow calculation for menu placement
- Hidden attribute can conflict with display styles

### Iteration 3: Folding, Tooltips & Persistence

**File**: `iteration-3-folding-and-tooltips.md`, `iteration-3-summary.md`

**Problems Solved**:
- Tabs not folding/unfolding properly
- Missing tooltips for truncated titles
- Tree structure not persisting across restarts (CRITICAL BUG)
- Twisty arrows not visible
- Drag-and-drop visual feedback missing

**Key Lessons**:
- **Inline styles beat everything** - even CSS with `!important`
- CSS :hover pseudo-classes unreliable in Zotero
- Zotero regenerates tab IDs on restart - must match by title
- JavaScript event handlers (mouseenter/mouseleave) for interactive states
- Unicode characters (▶/▼) more reliable than CSS triangles

**Critical Fix**: Tab ID migration system to handle Zotero regenerating IDs

### Iteration 4: Native Tab Bar Hiding & Startup Fixes

**File**: `iteration-4-native-tab-bar-hiding.md`

**Problems Solved**:
- Native tab bar taking up space (user-requested feature)
- `ReferenceError: OS is not defined` errors
- "No tabs open" on startup despite tabs existing
- macOS window controls (traffic lights) overlap
- No toggle mechanism for native tab bar
- Tab close buttons glued to sidebar edge

**Key Lessons**:
- Inline styles required for hiding UI elements reliably
- `OS.Path`/`OS.File` APIs deprecated in Zotero 8 → use `Zotero.File`
- Timing matters: 500ms delay needed for initial tab sync
- Platform-specific adjustments (macOS needs 40px top padding)
- Always provide toggle/escape hatches for users

**Technical Changes**:
- Migrated from deprecated `OS.Path.join()` to string concatenation
- Removed `OS.File.exists()` checks - let Zotero.File handle it
- Added `hideNativeTabBar()` / `showNativeTabBar()` methods
- Added ⊡ toolbar button for toggling
- Added right padding to tab elements

---

## Architecture

### Core Modules

1. **TreeTabManager** (`src/modules/treeTabManager.ts`)
   - Maintains tree structure data
   - Handles parent-child relationships
   - Tab lifecycle (add, remove, select)
   - Persistence to `treestyletabs.json`
   - ID migration on restart

2. **SidebarUI** (`src/modules/sidebarUI.ts`)
   - Renders tree view in sidebar
   - Drag & drop handling
   - Context menu
   - Toolbar buttons
   - Native tab bar hiding
   - Platform-specific layout

3. **PreferenceScript** (`src/modules/preferenceScript.ts`)
   - Preferences UI bindings
   - Preference validation
   - Change handlers

### Data Persistence

**File**: `<Zotero Data Directory>/treestyletabs.json`

**Format**:
```json
{
  "version": 1,
  "tabs": [
    {
      "id": "tab-id",
      "parentId": "parent-id",
      "childIds": ["child-1", "child-2"],
      "collapsed": false,
      "nodeType": "tab",
      "title": "Tab Title",
      "type": "reader"
    }
  ],
  "roots": ["root-tab-1", "root-tab-2"],
  "collapsed": ["collapsed-tab-1"]
}
```

**ID Migration Strategy**:
- On startup, match existing tree nodes to new Zotero tabs by title
- Migrate old IDs to new IDs
- Update all parent/child references
- Preserves tree structure across restarts

---

## Key Technical Decisions

### 1. Inline Styles Over CSS

**Rationale**: Zotero's internal styles can override injected stylesheets

**Implementation**:
```typescript
element.style.setProperty("display", "none", "important");
```

**Used For**:
- Tab visibility (folding/unfolding)
- Native tab bar hiding
- Drag-and-drop feedback
- Selected tab highlighting

### 2. JavaScript Event Handlers Over CSS Pseudo-classes

**Problem**: CSS `:hover` unreliable in Zotero

**Solution**:
```typescript
button.addEventListener("mouseenter", () => {
  button.style.background = "rgba(0, 0, 0, 0.05)";
});
button.addEventListener("mouseleave", () => {
  button.style.background = "transparent";
});
```

### 3. Modern Zotero APIs

**Migration**:
- `OS.Path.join()` → `${dir}/filename`
- `OS.File.exists()` → try/catch with `Zotero.File.getContentsAsync()`
- `OS.File.read()` → `Zotero.File.getContentsAsync()`
- `OS.File.write()` → `Zotero.File.putContentsAsync()`

### 4. Delayed Initial Sync

**Problem**: Zotero tabs not ready at `onMainWindowLoad()`

**Solution**:
```typescript
setTimeout(() => {
  TreeTabManager.syncWithZoteroTabs(win);
  SidebarUI.refresh(win);
}, 500);
```

### 5. Platform-Specific UI

**macOS**: Traffic light buttons require 40px top padding when native tab bar hidden

**Detection**:
```typescript
if (Zotero.isMac && prefs.hideNativeTabBar) {
  sidebar.style.paddingTop = "40px";
}
```

---

## User-Facing Features

### Toolbar Buttons

| Button | Function |
|--------|----------|
| ⊟ | Collapse all tabs |
| ⊞ | Expand all tabs |
| ＋ | Create new group |
| ⊡ | Toggle native tab bar |
| ⟷ | Toggle sidebar visibility |

### Context Menu Options

- Close Tab
- Close Tab and Children
- Rename Group (groups only)
- Delete Group (groups only)
- Collapse/Expand Tree
- Collapse All / Expand All
- Make Root Tab
- Move Up / Move Down

### Preferences

| Preference | Default | Type |
|------------|---------|------|
| `enabled` | `true` | boolean |
| `sidebarWidth` | `250` | number |
| `indentSize` | `20` | number |
| `autoCollapse` | `false` | boolean |
| `collapseOnClose` | `true` | boolean |
| `showCloseButton` | `true` | boolean |
| `position` | `"left"` | string |
| `hideNativeTabBar` | `true` | boolean |

---

## Testing Coverage

### Tested Scenarios

- ✅ Tab creation and deletion
- ✅ Parent-child relationships
- ✅ Collapsing/expanding trees
- ✅ Drag and drop reordering
- ✅ Tree persistence across restarts
- ✅ Tab ID migration
- ✅ Native tab bar hiding
- ✅ Context menu operations
- ✅ Group creation and management
- ✅ macOS traffic light positioning

### Known Tested Platforms

- ✅ macOS (Zotero 8)
- ⏳ Windows (expected to work, untested)
- ⏳ Linux (expected to work, untested)

---

## Known Limitations

1. **Restart Required**: Toggling native tab bar requires full restart
2. **Initial Sync Delay**: 500ms delay on startup (workaround, not ideal)
3. **Library Tabs Filtered**: Library pane tabs automatically hidden from tree
4. **No Keyboard Shortcuts**: Not yet implemented
5. **No Multi-select**: Can't operate on multiple tabs at once

---

## Future Enhancements

### High Priority

- [ ] Real-time native tab bar toggle (no restart)
- [ ] Keyboard shortcuts for common operations
- [ ] Multi-select for bulk operations
- [ ] Export/import tree structure
- [ ] Search/filter tabs

### Medium Priority

- [ ] Custom tab icons
- [ ] Tab bookmarking
- [ ] Session management
- [ ] Tab pinning
- [ ] Auto-collapse old tabs

### Low Priority

- [ ] Vertical tab bar themes
- [ ] Tab preview on hover
- [ ] Tab history
- [ ] Statistics (most used tabs, etc.)

---

## Development Lessons Learned

### 1. Zotero-Specific Patterns

- Inline styles are king in Zotero
- JavaScript event handlers > CSS pseudo-classes
- Hidden attribute can interfere with display styles
- Tab IDs regenerate on restart - match by title

### 2. API Migration (Zotero 7 → 8)

- Deprecated: `OS.Path`, `OS.File`
- New: `Zotero.File`, `PathUtils` (though we used simple strings)
- userChrome.css broken/deprecated

### 3. Platform Considerations

- macOS has traffic light buttons - needs extra top padding
- Check `Zotero.isMac` for platform-specific code
- Test on all platforms before release

### 4. Debugging Strategies

- Log everything during development
- Use descriptive debug messages
- Log element discovery, sync operations, state changes
- Makes troubleshooting 10x easier

### 5. User Experience

- Always provide escape hatches (toggle buttons)
- Don't remove functionality - make it optional
- Visual feedback is critical (drag & drop, hover states)
- Inline editing > modal dialogs

---

## Build Process

### Commands

```bash
npm install          # Install dependencies
npm start            # Development with hot reload
npm run build        # Production build
npm run build:dev    # Development build
npm run lint         # Fix code style
npm run release      # Version bump and build
```

### Output

- `treestyletabs-dev.xpi` - Development version
- `treestyletabs-1.0.0.xpi` - Production version

### Hot Reload

The `npm start` command:
1. Builds the extension
2. Copies to Zotero profile
3. Auto-detects platform and Zotero path
4. Watches for file changes
5. Rebuilds and reloads automatically

---

## Code Quality

### Linting

- **Prettier**: Code formatting
- **ESLint**: Code quality and best practices

### TypeScript

- Strict mode enabled
- Full type coverage for addon APIs
- Global types in `typing/global.d.ts`

---

## Documentation

### Internal Documentation

- **notes/README.md** - Overview of development notes
- **notes/iteration-*.md** - Detailed iteration logs
- **notes/quick-reference-*.md** - Quick reference guides
- **notes/lesson-*.md** - Specific lessons learned

### External Documentation

- **README.md** - User-facing documentation
- **Code comments** - Inline documentation
- **Debug logging** - Runtime diagnostics

---

## Success Metrics

### v1.0.0 Achievements

- ✅ Full tree-style tab management
- ✅ Native tab bar hiding (user-requested)
- ✅ Persistence across restarts
- ✅ Drag & drop reordering
- ✅ Tab groups
- ✅ Context menu operations
- ✅ macOS optimization
- ✅ Zero startup errors
- ✅ Professional UI/UX

### User Impact

- Vertical screen space reclaimed (native tab bar hidden)
- Better tab organization (tree structure)
- Faster navigation (groups, collapse/expand)
- Natural reading workflow (parent-child relationships)

---

## Conclusion

Tree Style Tabs for Zotero is a fully functional v1.0.0 release providing:

1. Complete tree-style tab management
2. Native tab bar hiding (major UX improvement)
3. Reliable persistence across sessions
4. Platform-optimized UI (especially macOS)
5. Rich interaction model (drag & drop, context menus, inline editing)
6. Clean, maintainable codebase

The extension successfully addresses the pain points of Zotero's horizontal tab bar while providing Firefox Tree Style Tab-like functionality in a research context.
