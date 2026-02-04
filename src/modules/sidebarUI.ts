import { config } from "../../package.json";
import { TreeTabManager } from "./treeTabManager";
import { getPrefs, getPref, setPref } from "../utils/prefs";
import { getString } from "../utils/locale";
import type { TabNode } from "../addon";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;

type SidebarContextMenuItem =
  | { type: "separator" }
  | { type: "action"; label: string; action: () => void };

/**
 * SidebarUI - Renders the tree-style tab sidebar
 */
export class SidebarUI {
  private static resizing = false;
  private static startX = 0;
  private static startWidth = 0;
  private static contextMenu: HTMLElement | null = null;
  private static contextTabId: string | null = null;

  /**
   * Get addon data
   */
  private static get data() {
    return Zotero[config.addonInstance]?.data;
  }

  /**
   * Create the sidebar UI
   */
  static create(win: Window): void {
    const doc = win.document;

    // Check if already created
    if (doc.getElementById("treestyletabs-sidebar")) {
      return;
    }

    const prefs = getPrefs();

    // Find the main content area to inject sidebar
    const mainContent = doc.querySelector("#main-window") || doc.documentElement;

    // Create sidebar container
    const sidebar = doc.createElement("div");
    sidebar.id = "treestyletabs-sidebar";
    
    // Set width properties with !important to override CSS
    sidebar.style.setProperty("width", `${prefs.sidebarWidth}px`, "important");
    sidebar.style.setProperty("min-width", `${prefs.sidebarWidth}px`, "important");
    sidebar.style.setProperty("max-width", `${prefs.sidebarWidth}px`, "important");
    sidebar.style.setProperty("flex-shrink", "0", "important");
    sidebar.style.setProperty("flex-grow", "0", "important");
    sidebar.style.setProperty("flex-basis", `${prefs.sidebarWidth}px`, "important");

    if (prefs.position === "right") {
      sidebar.classList.add("position-right");
    }

    // Header
    const header = doc.createElement("div");
    header.id = "treestyletabs-header";
    // Force single-line layout with inline styles
    header.style.display = "flex";
    header.style.flexDirection = "row";
    header.style.flexWrap = "nowrap";
    header.style.alignItems = "center";
    header.style.paddingLeft = "12px";

    const title = doc.createElement("span");
    title.id = "treestyletabs-title";
    title.textContent = getString("title");
    title.style.whiteSpace = "nowrap";
    title.style.flexShrink = "0";
    
    // Separator
    const separator = doc.createElement("span");
    separator.textContent = "|";
    separator.style.color = "#999";
    separator.style.margin = "0 8px";
    separator.style.opacity = "0.3";

    const toolbar = doc.createElement("div");
    toolbar.id = "treestyletabs-toolbar";
    toolbar.style.display = "flex";
    toolbar.style.flexDirection = "row";
    toolbar.style.flexWrap = "nowrap";
    toolbar.style.gap = "2px";
    toolbar.style.alignItems = "center";

    // Helper to setup button with hover-only styling (using inline styles for reliability)
    const setupButton = (btn: HTMLButtonElement) => {
      // Default state - invisible
      btn.style.background = "transparent";
      btn.style.border = "1px solid transparent";
      btn.style.color = "#666";
      
      // Hover handlers
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

    // Collapse all button
    const collapseAllBtn = doc.createElement("button");
    collapseAllBtn.className = "treestyletabs-toolbar-button";
    collapseAllBtn.textContent = "⊟";
    collapseAllBtn.title = getString("context-collapse-all");
    setupButton(collapseAllBtn);
    collapseAllBtn.addEventListener("click", () => {
      TreeTabManager.collapseAll(win);
      this.refresh(win);
    });

    // Expand all button
    const expandAllBtn = doc.createElement("button");
    expandAllBtn.className = "treestyletabs-toolbar-button";
    expandAllBtn.textContent = "⊞";
    expandAllBtn.title = getString("context-expand-all");
    setupButton(expandAllBtn);
    expandAllBtn.addEventListener("click", () => {
      TreeTabManager.expandAll(win);
      this.refresh(win);
    });

    // New group button
    const newGroupBtn = doc.createElement("button");
    newGroupBtn.className = "treestyletabs-toolbar-button";
    newGroupBtn.textContent = "＋";
    newGroupBtn.title = getString("toolbar-new-group");
    setupButton(newGroupBtn);
    newGroupBtn.addEventListener("click", () => {
      Zotero.debug("[Tree Style Tabs] New group button clicked");
      const node = TreeTabManager.createGroup();
      this.refresh(win);
      this.startInlineEdit(win, node.id);
    });

    // Toggle sidebar button
    const toggleBtn = doc.createElement("button");
    toggleBtn.className = "treestyletabs-toolbar-button";
    toggleBtn.textContent = "⟷";
    setupButton(toggleBtn);
    toggleBtn.title = getString("toolbar-toggle");
    toggleBtn.addEventListener("click", () => {
      this.toggle(win);
    });

    toolbar.appendChild(collapseAllBtn);
    toolbar.appendChild(expandAllBtn);
    toolbar.appendChild(newGroupBtn);
    toolbar.appendChild(toggleBtn);

    header.appendChild(title);
    header.appendChild(separator);
    header.appendChild(toolbar);
    sidebar.appendChild(header);

    // Tab list container
    const tabList = doc.createElement("div");
    tabList.id = "treestyletabs-tablist";
    sidebar.appendChild(tabList);

    // Store reference
    this.data.ui.sidebar = sidebar;
    this.data.ui.tabList = tabList;

    // Load stylesheet
    this.loadStylesheet(win);

    // Find insertion point - try to insert next to the tab bar
    const tabsToolbar = doc.querySelector("#tabs-deck") || 
                        doc.querySelector("#main-window > hbox") ||
                        doc.querySelector("#browser");

    if (tabsToolbar?.parentElement) {
      if (prefs.position === "right") {
        tabsToolbar.parentElement.appendChild(sidebar);
      } else {
        tabsToolbar.parentElement.insertBefore(sidebar, tabsToolbar);
      }
    } else {
      // Fallback - append to body
      doc.body?.appendChild(sidebar);
    }

    // Create toggle handle
    this.createToggleHandle(win, sidebar, prefs.position);

    // Create resize handle
    this.createResizeHandle(win, sidebar);

    // Initial render
    this.refresh(win);

    // Track elements for cleanup
    this.trackElement(win, sidebar);

    Zotero.debug("[Tree Style Tabs] Sidebar created");
  }

  /**
   * Load the CSS stylesheet
   */
  private static loadStylesheet(win: Window): void {
    const doc = win.document;

    // Check if already loaded
    if (doc.getElementById("treestyletabs-stylesheet")) {
      return;
    }

    const link = doc.createElement("link");
    link.id = "treestyletabs-stylesheet";
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = `chrome://${config.addonRef}/content/treestyletabs.css`;
    doc.head?.appendChild(link);

    this.trackElement(win, link);
  }

  /**
   * Create toggle handle shown when sidebar is hidden
   */
  private static createToggleHandle(
    win: Window,
    sidebar: HTMLElement,
    position: string
  ): void {
    const doc = win.document;

    // Check if already created
    if (doc.getElementById("treestyletabs-toggle-handle")) {
      return;
    }

    const handle = doc.createElement("div");
    handle.id = "treestyletabs-toggle-handle";
    handle.textContent = position === "right" ? "⟨" : "⟩";
    handle.title = getString("toolbar-show");
    handle.setAttribute("hidden", "true");
    handle.style.position = "fixed";
    handle.style.top = "48px";
    handle.style.zIndex = "9999";
    if (position === "right") {
      handle.classList.add("position-right");
      handle.style.right = "0";
    } else {
      handle.style.left = "0";
    }

    handle.style.height = "32px";
    handle.style.width = "32px";

    handle.addEventListener("click", () => {
      this.toggle(win);
    });

    const host = doc.body || doc.documentElement || doc.getElementById("main-window");
    host?.appendChild(handle);

    this.data.ui.toggleHandle = handle;
    this.trackElement(win, handle);
  }

  /**
   * Create resize handle for the sidebar
   */
  private static createResizeHandle(win: Window, sidebar: HTMLElement): void {
    const doc = win.document;
    const prefs = getPrefs();

    const resizer = doc.createElement("div");
    resizer.id = "treestyletabs-resizer";

    // Position based on sidebar position
    resizer.style.position = "absolute";
    resizer.style.top = "0";
    resizer.style.bottom = "0";
    resizer.style[prefs.position === "right" ? "left" : "right"] = "0";

    resizer.addEventListener("mousedown", (e) => {
      this.resizing = true;
      this.startX = e.clientX;
      this.startWidth = sidebar.offsetWidth;
      resizer.classList.add("resizing");
      e.preventDefault();
    });

    win.addEventListener("mousemove", (e) => {
      if (!this.resizing) return;

      const diff = prefs.position === "right"
        ? this.startX - e.clientX
        : e.clientX - this.startX;

      const newWidth = Math.min(400, Math.max(180, this.startWidth + diff));
      sidebar.style.width = `${newWidth}px`;
    });

    win.addEventListener("mouseup", () => {
      if (this.resizing) {
        this.resizing = false;
        resizer.classList.remove("resizing");
        setPref("sidebarWidth", sidebar.offsetWidth);
      }
    });

    sidebar.appendChild(resizer);
    this.trackElement(win, resizer);
  }

  /**
   * Refresh the tab list display
   */
  static refresh(win: Window): void {
    const tabList = this.data?.ui.tabList;
    if (!tabList) return;

    const doc = win.document;
    const prefs = getPrefs();

    // Clear existing tabs
    tabList.innerHTML = "";

    // Get tabs in tree order
    const tabs = TreeTabManager.getTabsInTreeOrder();

    // Debug: Log tab types to understand what we have
    Zotero.debug("[Tree Style Tabs] Available tabs:");
    tabs.forEach(tab => {
      Zotero.debug(`  - ${tab.id}: nodeType=${tab.nodeType}, type=${tab.type}, title=${tab.title}`);
    });

    // Filter out library/collection tabs - only show actual items
    const filteredTabs = tabs.filter((tab) => {
      // Keep groups always
      if (tab.nodeType === "group") return true;
      
      // Filter out library pane - the main library view
      if (tab.type === "library") return false;
      
      // Keep all other tabs (reader, etc.)
      return true;
    });

    Zotero.debug(`[Tree Style Tabs] Filtered tabs: ${filteredTabs.length} of ${tabs.length}`);

    if (filteredTabs.length === 0) {
      const empty = doc.createElement("div");
      empty.id = "treestyletabs-empty-state";
      empty.textContent = getString("empty");
      tabList.appendChild(empty);
      return;
    }

    // Render each tab
    for (const tab of filteredTabs) {
      const isVisible = TreeTabManager.isTabVisible(tab.id);
      Zotero.debug(`[Tree Style Tabs] Tab ${tab.id} (${tab.title}): collapsed=${tab.collapsed}, visible=${isVisible}, hasChildren=${tab.childIds.length > 0}`);
      const tabEl = this.createTabElement(win, tab, !isVisible);
      tabList.appendChild(tabEl);
    }
  }

  /**
   * Create a tab element
   */
  private static createTabElement(
    win: Window,
    tab: TabNode,
    hidden: boolean
  ): HTMLElement {
    const doc = win.document;
    const prefs = getPrefs();

    const tabEl = doc.createElement("div");
    tabEl.className = "treestyletabs-tab";
    tabEl.dataset.tabId = tab.id;
    tabEl.dataset.level = String(tab.level);

    const isGroup = tab.nodeType === "group";

    // Apply indentation and force single-line display
    const indent = tab.level * prefs.indentSize;
    tabEl.style.paddingLeft = `${8 + indent}px`;
    tabEl.style.height = "24px";
    tabEl.style.maxHeight = "24px";
    tabEl.style.overflow = "hidden";
    tabEl.style.whiteSpace = "nowrap";
    tabEl.style.alignItems = "center";
    
    // Handle visibility with inline styles (inline styles always win)
    if (hidden) {
      tabEl.style.display = "none";
      Zotero.debug(`[Tree Style Tabs] HIDING TAB: ${tab.id} (${tab.title})`);
    } else {
      tabEl.style.display = "flex";
    }

    // Classes for state
    if (tab.selected) {
      tabEl.classList.add("selected");
      // Add inline styles for reliable highlighting
      tabEl.style.backgroundColor = "#e3f2fd";
      tabEl.style.borderLeft = "3px solid #2196F3";
    }
    if (tab.childIds.length > 0) {
      tabEl.classList.add("has-children");
      Zotero.debug(`[Tree Style Tabs] Tab ${tab.id} has ${tab.childIds.length} children`);
    }
    if (!tab.collapsed && tab.childIds.length > 0) tabEl.classList.add("expanded");
    if (hidden) tabEl.classList.add("hidden");
    if (isGroup) tabEl.classList.add("group");

    // Twisty (expand/collapse control)
    const twisty = doc.createElement("span");
    twisty.className = "treestyletabs-twisty";
    
    // Make twisty visible with inline styles
    if (tab.childIds.length > 0) {
      twisty.textContent = tab.collapsed ? "▶" : "▼";
      twisty.style.color = "#333";
      twisty.style.fontSize = "12px";
      twisty.style.cursor = "pointer";
      Zotero.debug(`[Tree Style Tabs] Twisty added for ${tab.id}: ${twisty.textContent}`);
    }
    twisty.addEventListener("click", (e) => {
      e.stopPropagation();
      if (tab.childIds.length === 0) {
        Zotero.debug(`[Tree Style Tabs] Twisty clicked on tab without children: ${tab.id}`);
        return;
      }
      Zotero.debug(`[Tree Style Tabs] ===== TWISTY CLICKED =====`);
      Zotero.debug(`[Tree Style Tabs] Toggling collapse for tab: ${tab.id} (${tab.title}), current collapsed: ${tab.collapsed}`);
      TreeTabManager.debugTreeStructure();
      TreeTabManager.toggleCollapsed(tab.id);
      Zotero.debug(`[Tree Style Tabs] After toggle, collapsed: ${TreeTabManager.getTab(tab.id)?.collapsed}`);
      TreeTabManager.debugTreeStructure();
      this.refresh(win);
    });

    // Favicon
    const favicon = doc.createElement("span");
    favicon.className = "treestyletabs-tab-favicon";
    this.setTabIcon(favicon, tab);

    // Title
    const title = doc.createElement("span");
    title.className = "treestyletabs-tab-title";
    const titleText = tab.title || this.getTabTypeLabel(tab.type);
    title.textContent = titleText;
    
    // Add tooltip with full title on hover
    tabEl.title = titleText;
    
    // Force single-line with inline styles
    title.style.overflow = "hidden";
    title.style.textOverflow = "ellipsis";
    title.style.whiteSpace = "nowrap";
    title.style.display = "block";
    title.style.flex = "1 1 auto";
    title.style.minWidth = "0";

    // Close button
    const closeBtn = doc.createElement("span");
    closeBtn.className = "treestyletabs-tab-close";
    closeBtn.textContent = "×";
    closeBtn.style.display = prefs.showCloseButton ? "flex" : "none";
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isGroup) {
        TreeTabManager.removeGroup(tab.id);
        this.refresh(win);
      } else {
        TreeTabManager.closeTab(win, tab.id);
      }
    });

    // Assemble
    tabEl.appendChild(twisty);
    tabEl.appendChild(favicon);
    tabEl.appendChild(title);
    tabEl.appendChild(closeBtn);

    // Click to select tab - but prevent selection during actual drag operations
    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };

    tabEl.addEventListener("mousedown", (e) => {
      mouseDownTime = Date.now();
      mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    tabEl.addEventListener("click", (e) => {
      // Check if this was actually a drag operation
      // The dragstart event will have fired if it was a real drag
      const timeSinceMouseDown = Date.now() - mouseDownTime;
      const dx = Math.abs(e.clientX - mouseDownPos.x);
      const dy = Math.abs(e.clientY - mouseDownPos.y);
      
      // If mouse moved significantly or if dragstart fired, skip the click
      if (tabEl.classList.contains("dragging") || dx > 10 || dy > 10) {
        return;
      }
      
      // Normal click behavior
      if (isGroup) {
        TreeTabManager.toggleCollapsed(tab.id);
        this.refresh(win);
      } else {
        TreeTabManager.selectTab(win, tab.id);
      }
    });

    if (isGroup) {
      tabEl.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.startInlineEdit(win, tab.id);
      });
    }

    // Context menu
    tabEl.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      Zotero.debug(`[Tree Style Tabs] Context menu for ${tab.id} (${tab.nodeType}) at (${e.clientX}, ${e.clientY})`);
      
      this.showContextMenu(win, tab.id, e);
    });

    // Drag & drop support
    tabEl.draggable = true;
    tabEl.addEventListener("dragstart", (e) => {
      e.dataTransfer?.setData("text/plain", tab.id);
      tabEl.classList.add("dragging");
      // Visual feedback with inline styles
      tabEl.style.opacity = "0.5";
      Zotero.debug(`[Tree Style Tabs] Drag started: ${tab.id}`);
    });

    tabEl.addEventListener("dragend", () => {
      tabEl.classList.remove("dragging");
      // Restore opacity
      tabEl.style.opacity = "1";
      
      // Remove drop-target from all tabs and restore their styles
      doc.querySelectorAll(".treestyletabs-tab.drop-target").forEach((el) => {
        el.classList.remove("drop-target");
        (el as HTMLElement).style.outline = "";
        (el as HTMLElement).style.backgroundColor = "";
      });
      Zotero.debug(`[Tree Style Tabs] Drag ended`);
    });

    tabEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!tabEl.classList.contains("drop-target")) {
        tabEl.classList.add("drop-target");
        // Visual feedback with inline styles
        tabEl.style.outline = "2px solid #2196F3";
        tabEl.style.backgroundColor = "rgba(33, 150, 243, 0.1)";
        Zotero.debug(`[Tree Style Tabs] Drop target: ${tab.id}`);
      }
    });

    tabEl.addEventListener("dragleave", (e) => {
      // Only remove if we're actually leaving the tab element
      const rect = tabEl.getBoundingClientRect();
      const x = (e as DragEvent).clientX;
      const y = (e as DragEvent).clientY;
      
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        tabEl.classList.remove("drop-target");
        // Remove visual feedback
        tabEl.style.outline = "";
        tabEl.style.backgroundColor = "";
      }
    });

    tabEl.addEventListener("drop", (e) => {
      e.preventDefault();
      tabEl.classList.remove("drop-target");

      const draggedId = e.dataTransfer?.getData("text/plain");
      if (draggedId && draggedId !== tab.id) {
        // Attach dragged tab as child of this tab
        TreeTabManager.attachTabTo(draggedId, tab.id);
        this.refresh(win);
      }
    });

    return tabEl;
  }

  /**
   * Set appropriate icon for tab type
   */
  private static setTabIcon(element: HTMLElement, node: TabNode): void {
    if (node.nodeType === "group") {
      element.textContent = "📁";
      return;
    }

    const icons: Record<string, string> = {
      library: "📚",
      reader: "📄",
      "zotero-pane": "🏠",
    };

    element.textContent = icons[node.type] || "📄";
  }

  /**
   * Get human-readable label for tab type
   */
  private static getTabTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      library: "Library",
      reader: "Reader",
      "zotero-pane": "My Library",
      group: "Group",
    };

    return labels[type] || type;
  }

  /**
   * Start inline edit for group titles
   */
  private static startInlineEdit(win: Window, tabId: string): void {
    const doc = win.document;
    const tabList = this.data?.ui.tabList;
    const tabEl = tabList?.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement | null;
    const titleEl = tabEl?.querySelector(".treestyletabs-tab-title") as HTMLElement | null;

    if (!tabEl || !titleEl) return;

    const input = doc.createElement("input");
    input.className = "treestyletabs-title-edit";
    input.type = "text";
    input.value = titleEl.textContent || "";

    const finish = (commit: boolean) => {
      if (commit) {
        TreeTabManager.renameNode(tabId, input.value);
      }
      this.refresh(win);
    };

    input.addEventListener("blur", () => finish(true));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        finish(false);
      }
    });

    tabEl.classList.add("editing");
    titleEl.replaceWith(input);
    input.focus();
    input.select();
  }

  /**
   * Show context menu for a tab
   */
  private static showContextMenu(
    win: Window,
    tabId: string,
    event: MouseEvent
  ): void {
    Zotero.debug("[Tree Style Tabs] showContextMenu called for tab: " + tabId);
    this.hideContextMenu(win);

    const doc = win.document;
    this.contextTabId = tabId;

    const menu = doc.createElement("div");
    menu.className = "treestyletabs-context-menu";
    
    // Add inline styles to ensure visibility
    menu.style.backgroundColor = "#ffffff";
    menu.style.border = "1px solid #cccccc";
    menu.style.borderRadius = "6px";
    menu.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.25)";
    menu.style.padding = "4px 0";
    menu.style.minWidth = "180px";
    menu.style.maxHeight = "400px";
    menu.style.overflowY = "auto";
    
    // Get sidebar and tab list for positioning
    const sidebar = this.data?.ui.sidebar;
    const tabList = this.data?.ui.tabList;
    Zotero.debug(`[Tree Style Tabs] sidebar: ${!!sidebar}, tabList: ${!!tabList}`);
    if (!sidebar || !tabList) {
      Zotero.debug("[Tree Style Tabs] Missing sidebar or tabList, cannot show menu");
      return;
    }
    
    // Get the tab element that was right-clicked
    const targetEl = event.target as HTMLElement;
    const tabEl = targetEl.closest('.treestyletabs-tab') as HTMLElement;
    
    if (!tabEl) {
      Zotero.debug("[Tree Style Tabs] No tab element found");
      return;
    }
    
    Zotero.debug("[Tree Style Tabs] Tab element found, creating menu");
    
    // Get bounding rectangles - use viewport coordinates (fixed positioning)
    const sidebarRect = sidebar.getBoundingClientRect();
    const tabRect = tabEl.getBoundingClientRect();
    const tabListRect = tabList.getBoundingClientRect();
    
    Zotero.debug(`[Tree Style Tabs] Sidebar rect: ${sidebarRect.left},${sidebarRect.top} ${sidebarRect.width}x${sidebarRect.height}`);
    Zotero.debug(`[Tree Style Tabs] Tab rect: ${tabRect.left},${tabRect.top} ${tabRect.width}x${tabRect.height}`);
    Zotero.debug(`[Tree Style Tabs] TabList rect: ${tabListRect.left},${tabListRect.top} ${tabListRect.width}x${tabListRect.height}`);
    
    // Use fixed positioning relative to viewport (more reliable)
    // Position menu to the right of the sidebar
    const menuLeft = sidebarRect.right + 5; // 5px to the right of the sidebar
    const menuTop = tabRect.top;
    
    // Force position styles
    menu.style.position = 'fixed';
    menu.style.left = `${menuLeft}px`;
    menu.style.top = `${menuTop}px`;
    
    Zotero.debug(`[Tree Style Tabs] Menu position set (fixed): left=${menuLeft}px, top=${menuTop}px`);

    const tab = TreeTabManager.getTab(tabId);
    const hasChildren = tab?.childIds && tab.childIds.length > 0;

    const items: SidebarContextMenuItem[] = [];

    if (tab?.nodeType === "group") {
      items.push({
        type: "action",
        label: getString("context-rename-group"),
        action: () => this.startInlineEdit(win, tabId),
      });

      items.push({
        type: "action",
        label: getString("context-delete-group"),
        action: () => {
          TreeTabManager.removeGroup(tabId);
          this.refresh(win);
        },
      });

      items.push({ type: "separator" });
    } else {
      items.push({
        type: "action",
        label: getString("context-close"),
        action: () => TreeTabManager.closeTab(win, tabId),
      });

      if (hasChildren) {
        items.push({
          type: "action",
          label: getString("context-close-tree"),
          action: () => TreeTabManager.closeTabTree(win, tabId),
        });
      }

      items.push({ type: "separator" });
    }

    if (hasChildren) {
      items.push({
        type: "action",
        label: tab?.collapsed ? getString("context-expand") : getString("context-collapse"),
        action: () => {
          TreeTabManager.toggleCollapsed(tabId);
          this.refresh(win);
        },
      });
    }

    items.push({
      type: "action",
      label: getString("context-collapse-all"),
      action: () => {
        TreeTabManager.collapseAll(win);
        this.refresh(win);
      },
    });

    items.push({
      type: "action",
      label: getString("context-expand-all"),
      action: () => {
        TreeTabManager.expandAll(win);
        this.refresh(win);
      },
    });

    items.push({ type: "separator" });

    items.push({
      type: "action",
      label: getString("context-make-root"),
      action: () => {
        TreeTabManager.makeRootTab(tabId);
        this.refresh(win);
      },
    });

    items.push({
      type: "action",
      label: getString("context-move-up"),
      action: () => {
        TreeTabManager.moveUp(tabId);
        this.refresh(win);
      },
    });

    items.push({
      type: "action",
      label: getString("context-move-down"),
      action: () => {
        TreeTabManager.moveDown(tabId);
        this.refresh(win);
      },
    });

    for (const item of items) {
      if (item.type === "separator") {
        const sep = doc.createElement("div");
        sep.className = "treestyletabs-context-menu-separator";
        menu.appendChild(sep);
      } else {
        const menuItem = doc.createElement("div");
        menuItem.className = "treestyletabs-context-menu-item";
        menuItem.textContent = item.label;
        
        // Add inline styles for visibility
        menuItem.style.padding = "8px 12px";
        menuItem.style.cursor = "pointer";
        menuItem.style.whiteSpace = "nowrap";
        menuItem.style.color = "#000000";
        
        menuItem.addEventListener("mouseover", () => {
          menuItem.style.backgroundColor = "#e8e8e8";
        });
        menuItem.addEventListener("mouseout", () => {
          menuItem.style.backgroundColor = "transparent";
        });
        menuItem.addEventListener("click", () => {
          item.action?.();
          this.hideContextMenu(win);
        });
        menu.appendChild(menuItem);
      }
    }

    // Append to document body for fixed positioning
    const body = doc.body || doc.documentElement;
    body.appendChild(menu);
    this.contextMenu = menu;
    
    Zotero.debug(`[Tree Style Tabs] Menu appended to body. Item count: ${items.length}, menu children: ${menu.children.length}`);
    
    // Adjust position if menu would overflow
    setTimeout(() => {
      const menuRect = menu.getBoundingClientRect();
      const viewportHeight = win.innerHeight;
      const viewportWidth = win.innerWidth;
      
      Zotero.debug(`[Tree Style Tabs] Menu rect: ${menuRect.width}x${menuRect.height} at (${menuRect.left}, ${menuRect.top})`);
      Zotero.debug(`[Tree Style Tabs] Viewport: ${viewportWidth}x${viewportHeight}`);
      
      // If menu extends below viewport, move it up
      if (menuRect.bottom > viewportHeight) {
        const overflow = menuRect.bottom - viewportHeight;
        const currentTop = parseInt(menu.style.top) || 0;
        menu.style.top = `${Math.max(0, currentTop - overflow - 10)}px`;
        Zotero.debug(`[Tree Style Tabs] Adjusted menu top to ${menu.style.top} for overflow`);
      }
      
      // If menu extends beyond right edge, position to the left of the tab
      if (menuRect.right > viewportWidth) {
        const tabRect = tabEl.getBoundingClientRect();
        const leftPosition = tabRect.left - menuRect.width - 5;
        menu.style.left = `${Math.max(5, leftPosition)}px`;
        Zotero.debug(`[Tree Style Tabs] Adjusted menu left to ${menu.style.left} for overflow`);
      }
    }, 0);

    // Close on click outside
    const closeHandler = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        this.hideContextMenu(win);
        doc.removeEventListener("mousedown", closeHandler);
      }
    };

    // Delay to avoid immediate close from the same right-click
    setTimeout(() => {
      doc.addEventListener("mousedown", closeHandler);
    }, 200);
  }

  /**
   * Hide context menu
   */
  private static hideContextMenu(win: Window): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
      this.contextTabId = null;
    }
  }

  /**
   * Toggle sidebar visibility
   */
  static toggle(win: Window): void {
    const sidebar = this.data?.ui.sidebar;
    const handle =
      this.data?.ui.toggleHandle ||
      (win.document.getElementById("treestyletabs-toggle-handle") as HTMLElement | null);

    if (sidebar) {
      // Use hidden attribute instead of display:none to preserve layout
      const isHidden = sidebar.hasAttribute("hidden");
      
      if (isHidden) {
        // Restoring sidebar
        Zotero.debug(`[Tree Style Tabs] Restoring sidebar`);
        
        // Remove hidden attribute
        sidebar.removeAttribute("hidden");
        
        Zotero.debug(`[Tree Style Tabs] Sidebar restored. offsetWidth: ${sidebar.offsetWidth}px`);
        
        // Hide the toggle handle when sidebar is visible
        if (handle) {
          handle.setAttribute("hidden", "true");
        }
      } else {
        // Hiding sidebar - save current width first
        const currentWidth = sidebar.offsetWidth;
        Zotero.debug(`[Tree Style Tabs] Hiding sidebar, current offsetWidth: ${currentWidth}px`);
        
        if (currentWidth >= 180 && currentWidth <= 400) {
          setPref("sidebarWidth", currentWidth);
          Zotero.debug(`[Tree Style Tabs] Saved width: ${currentWidth}px`);
        }
        
        // Use hidden attribute instead of display:none
        sidebar.setAttribute("hidden", "true");
        
        // Show the toggle handle when sidebar is hidden
        if (handle) {
          handle.removeAttribute("hidden");
        }
      }
    }
  }

  /**
   * Track element for cleanup
   */
  private static trackElement(win: Window, element: HTMLElement): void {
    if (!this.data.ui.registeredElements.has(win)) {
      this.data.ui.registeredElements.set(win, []);
    }
    this.data.ui.registeredElements.get(win)?.push(element);
  }

  /**
   * Destroy sidebar for a specific window
   */
  static destroyForWindow(win: Window): void {
    const elements = this.data?.ui.registeredElements.get(win);
    if (elements) {
      for (const el of elements) {
        el.remove();
      }
      this.data.ui.registeredElements.delete(win);
    }

    this.hideContextMenu(win);
  }

  /**
   * Destroy all sidebar instances
   */
  static destroy(): void {
    const addon = Zotero[config.addonInstance];
    if (!addon?.data.ui) return;

    // Clean up references
    addon.data.ui.sidebar = undefined;
    addon.data.ui.tabList = undefined;
    addon.data.ui.toggleHandle = undefined;

    Zotero.debug("[Tree Style Tabs] Sidebar destroyed");
  }
}
