import { config } from "../../package.json";
import type { TabNode, TreeStructure } from "../addon";
import { getPref } from "../utils/prefs";

// Declare globals
declare const Zotero: _ZoteroTypes.Zotero;
declare const Zotero_Tabs: any;

const STORAGE_KEY = "treeStyleTabs.treeStructure";

/**
 * TreeTabManager - Manages the tree structure of tabs
 * Inspired by Firefox Tree Style Tab by piroor
 */
export class TreeTabManager {
  private static win: Window | null = null;
  private static lastActiveTabId: string | null = null;

  static async init(win: Window) {
    this.win = win;
    await this.loadTreeStructure();
    this.recalculateLevels();
  }

  /**
   * Get the addon data
   */
  private static get data() {
    return Zotero[config.addonInstance]?.data;
  }

  /**
   * Get the tabs map
   */
  private static get tabs(): Map<string, TabNode> {
    return this.data?.treeData.tabs || new Map();
  }

  /**
   * Get the tree structure
   */
  private static get structure(): TreeStructure {
    return this.data?.treeData.structure || { roots: [], collapsed: new Set() };
  }

  /**
   * Get a meaningful title for a Zotero tab
   */
  private static getTabTitle(zt: any): string {
    // If we have a title, use it
    if (zt.title && zt.title.trim() !== "") {
      return zt.title;
    }

    // For reader tabs, try to get the title from the tab data
    if (zt.type === "reader" && zt.data) {
      // Try to get the item title
      if (zt.data.itemID) {
        try {
          const item = Zotero.Items.get(zt.data.itemID);
          if (item) {
            const itemTitle = item.getField("title");
            if (itemTitle && itemTitle.trim() !== "") {
              return itemTitle;
            }
          }
        } catch (e) {
          Zotero.debug(`[Tree Style Tabs] Could not get item title: ${e}`);
        }
      }
      
      // Fallback to attachment filename if available
      if (zt.data.title && zt.data.title.trim() !== "") {
        return zt.data.title;
      }
    }

    // Fallback to type as last resort
    return zt.type || "Tab";
  }

  /**
   * Sync our tree data with Zotero's actual tabs
   */
  static syncWithZoteroTabs(win: Window): void {
    try {
      const zoteroTabs = (win as any).Zotero_Tabs;
      if (!zoteroTabs?._tabs) {
        Zotero.debug("[Tree Style Tabs] No Zotero tabs found for sync");
        return;
      }

      Zotero.debug(`[Tree Style Tabs] Syncing ${zoteroTabs._tabs.length} Zotero tabs`);

      const currentTabIds = new Set<string>();
      const selectedTabId = zoteroTabs.selectedID;
      const idMigrationMap = new Map<string, string>(); // oldId -> newId

      // First pass: Try to match existing tabs by title to migrate IDs
      zoteroTabs._tabs.forEach((zt: any) => {
        currentTabIds.add(zt.id);
        const ztTitle = this.getTabTitle(zt);

        // Check if this tab already exists with a different ID (by matching title)
        let existingNode: TabNode | undefined;
        for (const [tabId, node] of this.tabs.entries()) {
          if (node.nodeType === "tab" && node.title === ztTitle && !currentTabIds.has(tabId)) {
            existingNode = node;
            idMigrationMap.set(tabId, zt.id); // oldId -> newId
            break;
          }
        }

        if (existingNode) {
          // Migrate the existing node to new ID
          this.tabs.delete(existingNode.id);
          existingNode.id = zt.id;
          existingNode.title = ztTitle;
          existingNode.type = zt.type;
          existingNode.selected = zt.id === selectedTabId;
          this.tabs.set(zt.id, existingNode);
        } else if (!this.tabs.has(zt.id)) {
          // Truly new tab - add to tree
          this.addTab(zt.id, ztTitle, zt.type);
        } else {
          // Update existing tab with same ID
          const node = this.tabs.get(zt.id)!;
          node.title = ztTitle;
          node.type = zt.type;
          node.selected = zt.id === selectedTabId;
        }
      });

      // Second pass: Update parent/child IDs based on migration
      if (idMigrationMap.size > 0) {
        // Update parent IDs
        this.tabs.forEach((node) => {
          if (node.parentId && idMigrationMap.has(node.parentId)) {
            node.parentId = idMigrationMap.get(node.parentId)!;
          }
        });

        // Update child IDs
        this.tabs.forEach((node) => {
          node.childIds = node.childIds.map((childId) => 
            idMigrationMap.get(childId) || childId
          );
        });

        // Update roots
        this.structure.roots = this.structure.roots.map((rootId) => 
          idMigrationMap.get(rootId) || rootId
        );

        // Update collapsed set
        const newCollapsed = new Set<string>();
        this.structure.collapsed.forEach((collapsedId) => {
          newCollapsed.add(idMigrationMap.get(collapsedId) || collapsedId);
        });
        this.structure.collapsed = newCollapsed;
      }

      // Remove tabs that no longer exist in Zotero
      for (const [tabId, node] of this.tabs.entries()) {
        if (node.nodeType === "tab" && !currentTabIds.has(tabId)) {
          this.removeTabFromTree(tabId);
        }
      }

      // Update selection state
      this.tabs.forEach((node) => {
        node.selected = node.nodeType === "tab" && node.id === selectedTabId;
      });

      Zotero.debug(`[Tree Style Tabs] Sync complete: ${this.tabs.size} total nodes, ${this.structure.roots.length} roots`);

      this.recalculateLevels();
      this.saveTreeStructure();
    } catch (e) {
      Zotero.logError(`[Tree Style Tabs] Error syncing tabs: ${e}`);
    }
  }

  /**
   * Add a new tab to the tree
   */
  static addTab(
    id: string,
    title: string,
    type: string,
    parentId: string | null = null
  ): TabNode {
    const node: TabNode = {
      id,
      parentId,
      childIds: [],
      level: 0,
      collapsed: false,
      title,
      type,
      nodeType: "tab",
      selected: false,
    };

    // If there's a parent, add as child and calculate level
    if (parentId && this.tabs.has(parentId)) {
      const parent = this.tabs.get(parentId)!;
      parent.childIds.push(id);
      node.level = parent.level + 1;
    } else {
      // No parent - add as root
      node.parentId = null;
      this.structure.roots.push(id);
    }

    this.tabs.set(id, node);
    this.saveTreeStructure();

    return node;
  }

  /**
   * Create a placeholder group node
   */
  static createGroup(title = "New Group", parentId: string | null = null): TabNode {
    const id = `group-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const node: TabNode = {
      id,
      parentId,
      childIds: [],
      level: 0,
      collapsed: false,
      title,
      type: "group",
      nodeType: "group",
      selected: false,
    };

    if (parentId && this.tabs.has(parentId)) {
      const parent = this.tabs.get(parentId)!;
      parent.childIds.push(id);
      node.level = parent.level + 1;
    } else {
      node.parentId = null;
      this.structure.roots.push(id);
    }

    this.tabs.set(id, node);
    this.saveTreeStructure();

    return node;
  }

  /**
   * Rename a tab/group
   */
  static renameNode(id: string, title: string): void {
    const node = this.tabs.get(id);
    if (!node) return;

    node.title = title.trim() || node.title;
    this.saveTreeStructure();
  }

  /**
   * Remove a tab from the tree
   */
  static removeTabFromTree(id: string): void {
    const collapseOnClose = getPref<boolean>("collapseOnClose") ?? true;
    this.removeNodeFromTree(id, collapseOnClose);
  }

  /**
   * Remove a placeholder group (promote children)
   */
  static removeGroup(id: string): void {
    this.removeNodeFromTree(id, true);
  }

  /**
   * Remove a node from the tree
   */
  private static removeNodeFromTree(id: string, promoteChildren: boolean): void {
    const node = this.tabs.get(id);
    if (!node) return;

    if (promoteChildren) {
      for (const childId of node.childIds) {
        const child = this.tabs.get(childId);
        if (child) {
          child.parentId = node.parentId;
          child.level = node.level;
          this.updateChildLevels(childId);

          if (node.parentId) {
            const grandparent = this.tabs.get(node.parentId);
            grandparent?.childIds.push(childId);
          } else {
            const idx = this.structure.roots.indexOf(childId);
            if (idx === -1) {
              this.structure.roots.push(childId);
            }
          }
        }
      }
    }

    if (node.parentId) {
      const parent = this.tabs.get(node.parentId);
      if (parent) {
        const idx = parent.childIds.indexOf(id);
        if (idx !== -1) parent.childIds.splice(idx, 1);
      }
    } else {
      const idx = this.structure.roots.indexOf(id);
      if (idx !== -1) this.structure.roots.splice(idx, 1);
    }

    this.structure.collapsed.delete(id);
    this.tabs.delete(id);
    this.saveTreeStructure();
  }

  /**
   * Update levels of all descendants
   */
  private static updateChildLevels(parentId: string): void {
    const parent = this.tabs.get(parentId);
    if (!parent) return;

    for (const childId of parent.childIds) {
      const child = this.tabs.get(childId);
      if (child) {
        child.level = parent.level + 1;
        this.updateChildLevels(childId);
      }
    }
  }

  /**
   * Recalculate levels for all nodes
   */
  private static recalculateLevels(): void {
    for (const rootId of this.structure.roots) {
      const root = this.tabs.get(rootId);
      if (root) {
        root.level = 0;
        this.updateChildLevels(rootId);
      }
    }
  }

  /**
   * Handle tab added event from Zotero
   */
  static onTabAdded(
    win: Window,
    ids: string[],
    extraData: Record<string, any>
  ): void {
    const zoteroTabs = (win as any).Zotero_Tabs;

    for (const id of ids) {
      const zt = zoteroTabs?._tabs?.find((t: any) => t.id === id);
      // Only add if it's truly a new tab (not in our tree yet)
      if (zt && !this.tabs.has(id)) {
        // For new tabs, add as root (don't auto-parent to last active)
        this.addTab(id, zt.title || zt.type, zt.type, null);
      }
    }
  }

  /**
   * Handle tab closed event from Zotero
   */
  static onTabClosed(win: Window, ids: string[]): void {
    for (const id of ids) {
      this.removeTabFromTree(id);
    }
  }

  /**
   * Handle tab selected event from Zotero
   */
  static onTabSelected(win: Window, ids: string[]): void {
    const selectedId = ids[0];

    // Update selection state
    this.tabs.forEach((node) => {
      node.selected = node.id === selectedId;
    });

    // Track last active tab for determining parent of new tabs
    this.lastActiveTabId = selectedId;
  }

  /**
   * Select a tab in Zotero
   */
  static selectTab(win: Window, id: string): void {
    try {
      const zoteroTabs = (win as any).Zotero_Tabs;
      zoteroTabs?.select(id);
    } catch (e) {
      Zotero.debug(`[Tree Style Tabs] Error selecting tab: ${e}`);
    }
  }

  /**
   * Close a tab in Zotero
   */
  static closeTab(win: Window, id: string): void {
    try {
      const zoteroTabs = (win as any).Zotero_Tabs;
      zoteroTabs?.close(id);
    } catch (e) {
      Zotero.debug(`[Tree Style Tabs] Error closing tab: ${e}`);
    }
  }

  /**
   * Close a tab and all its descendants
   */
  static closeTabTree(win: Window, id: string): void {
    const descendants = this.getDescendants(id);

    // Close in reverse order (children first)
    for (let i = descendants.length - 1; i >= 0; i--) {
      this.closeTab(win, descendants[i]);
    }
    this.closeTab(win, id);
  }

  /**
   * Get all descendant IDs of a tab
   */
  static getDescendants(id: string): string[] {
    const result: string[] = [];
    const node = this.tabs.get(id);
    if (!node) return result;

    for (const childId of node.childIds) {
      result.push(childId);
      result.push(...this.getDescendants(childId));
    }

    return result;
  }

  /**
   * Toggle collapsed state of a tab
   */
  static toggleCollapsed(id: string): void {
    const node = this.tabs.get(id);
    if (!node || node.childIds.length === 0) return;

    node.collapsed = !node.collapsed;

    if (node.collapsed) {
      this.structure.collapsed.add(id);
    } else {
      this.structure.collapsed.delete(id);

      // Auto-collapse siblings if preference is set
      const autoCollapse = getPref<boolean>("autoCollapse");
      if (autoCollapse) {
        this.autoCollapseSiblings(id);
      }
    }

    this.saveTreeStructure();
  }

  /**
   * Collapse all sibling tabs when expanding one
   */
  private static autoCollapseSiblings(expandedId: string): void {
    const node = this.tabs.get(expandedId);
    if (!node) return;

    const siblingIds = node.parentId
      ? this.tabs.get(node.parentId)?.childIds || []
      : this.structure.roots;

    for (const siblingId of siblingIds) {
      if (siblingId !== expandedId) {
        const sibling = this.tabs.get(siblingId);
        if (sibling && sibling.childIds.length > 0) {
          sibling.collapsed = true;
          this.structure.collapsed.add(siblingId);
        }
      }
    }
  }

  /**
   * Collapse all tabs
   */
  static collapseAll(win: Window): void {
    this.tabs.forEach((node) => {
      if (node.childIds.length > 0) {
        node.collapsed = true;
        this.structure.collapsed.add(node.id);
      }
    });
    this.saveTreeStructure();
  }

  /**
   * Expand all tabs
   */
  static expandAll(win: Window): void {
    this.tabs.forEach((node) => {
      node.collapsed = false;
    });
    this.structure.collapsed.clear();
    this.saveTreeStructure();
  }

  /**
   * Move a tab to be a child of another tab (for drag & drop)
   */
  static attachTabTo(tabId: string, newParentId: string | null): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    // Prevent circular reference
    if (newParentId) {
      const descendants = this.getDescendants(tabId);
      if (descendants.includes(newParentId)) return;
    }

    // Remove from old parent
    if (tab.parentId) {
      const oldParent = this.tabs.get(tab.parentId);
      if (oldParent) {
        const idx = oldParent.childIds.indexOf(tabId);
        if (idx !== -1) oldParent.childIds.splice(idx, 1);
      }
    } else {
      const idx = this.structure.roots.indexOf(tabId);
      if (idx !== -1) this.structure.roots.splice(idx, 1);
    }

    // Add to new parent
    tab.parentId = newParentId;

    if (newParentId) {
      const newParent = this.tabs.get(newParentId);
      if (newParent) {
        newParent.childIds.push(tabId);
        tab.level = newParent.level + 1;
      }
    } else {
      this.structure.roots.push(tabId);
      tab.level = 0;
    }

    this.updateChildLevels(tabId);
    this.saveTreeStructure();
  }

  /**
   * Make a tab a root tab (remove parent relationship)
   */
  static makeRootTab(tabId: string): void {
    this.attachTabTo(tabId, null);
  }

  /**
   * Move tab up in the sibling order
   */
  static moveUp(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const siblings = tab.parentId
      ? this.tabs.get(tab.parentId)?.childIds
      : this.structure.roots;

    if (!siblings) return;

    const idx = siblings.indexOf(tabId);
    if (idx > 0) {
      siblings.splice(idx, 1);
      siblings.splice(idx - 1, 0, tabId);
      this.saveTreeStructure();
    }
  }

  /**
   * Move tab down in the sibling order
   */
  static moveDown(tabId: string): void {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    const siblings = tab.parentId
      ? this.tabs.get(tab.parentId)?.childIds
      : this.structure.roots;

    if (!siblings) return;

    const idx = siblings.indexOf(tabId);
    if (idx < siblings.length - 1) {
      siblings.splice(idx, 1);
      siblings.splice(idx + 1, 0, tabId);
      this.saveTreeStructure();
    }
  }

  /**
   * Get tabs in tree order (for rendering)
   */
  static getTabsInTreeOrder(): TabNode[] {
    const result: TabNode[] = [];

    const addWithChildren = (
      id: string,
      isHidden: boolean = false
    ): void => {
      const node = this.tabs.get(id);
      if (!node) return;

      // Clone to avoid modifying the original
      const tabForDisplay = { ...node };
      result.push(tabForDisplay);

      // Add children if not collapsed
      const shouldHideChildren = isHidden || node.collapsed;
      for (const childId of node.childIds) {
        addWithChildren(childId, shouldHideChildren);
      }
    };

    // Start from roots
    for (const rootId of this.structure.roots) {
      addWithChildren(rootId);
    }

    return result;
  }

  /**
   * Check if a tab should be visible (not hidden by collapsed ancestor)
   */
  static isTabVisible(tabId: string): boolean {
    const tab = this.tabs.get(tabId);
    if (!tab) return false;

    let current = tab.parentId;
    while (current) {
      const parent = this.tabs.get(current);
      if (!parent) break;
      if (parent.collapsed) return false;
      current = parent.parentId;
    }

    return true;
  }

  /**
   * Reset all tabs to root level (remove all parent relationships)
   */
  static resetAllToRoot(): void {
    const allTabIds: string[] = [];
    
    // Collect all tab IDs and reset their relationships
    this.tabs.forEach((node) => {
      if (node.nodeType === "tab") {
        node.parentId = null;
        node.childIds = [];
        node.level = 0;
        node.collapsed = false;
        allTabIds.push(node.id);
      }
    });
    
    // Remove all groups
    this.tabs.forEach((node, id) => {
      if (node.nodeType === "group") {
        this.tabs.delete(id);
      }
    });
    
    // Set roots to all tabs
    this.structure.roots = allTabIds;
    this.structure.collapsed.clear();
    
    this.saveTreeStructure();
    Zotero.debug(`[Tree Style Tabs] Reset ${allTabIds.length} tabs to root level`);
  }

  /**
   * Get a tab node
   */
  static getTab(id: string): TabNode | undefined {
    return this.tabs.get(id);
  }

  /**
   * Get the path to the tree structure JSON file
   */
  private static getStorageFilePath(): string {
    // Use PathUtils (modern replacement for OS.Path) or simple concatenation
    const dataDir = Zotero.DataDirectory.dir;
    return `${dataDir}/treestyletabs.json`;
  }

  /**
   * Save tree structure to external JSON file
   */
  private static async saveTreeStructure(): Promise<void> {
    try {
      const data = {
        version: 1,
        tabs: Array.from(this.tabs.entries()).map(([id, node]) => ({
          id,
          parentId: node.parentId,
          childIds: node.childIds,
          collapsed: node.collapsed,
          nodeType: node.nodeType,
          title: node.title,
          type: node.type,
        })),
        roots: this.structure.roots,
        collapsed: Array.from(this.structure.collapsed),
      };

      const filePath = this.getStorageFilePath();
      await Zotero.File.putContentsAsync(filePath, JSON.stringify(data, null, 2));
    } catch (e) {
      Zotero.logError(`[Tree Style Tabs] Error saving tree structure: ${e}`);
    }
  }

  /**
   * Load tree structure from external JSON file
   */
  private static async loadTreeStructure(): Promise<void> {
    try {
      const filePath = this.getStorageFilePath();
      
      // Try to read file - if it doesn't exist, getContentsAsync will return empty
      const contents = await Zotero.File.getContentsAsync(filePath);
      if (!contents) return;

      const data = JSON.parse(contents);

      // Restore structure
      this.structure.roots = data.roots || [];
      this.structure.collapsed = new Set(data.collapsed || []);

      // We don't fully restore tabs here - they'll be synced with actual Zotero tabs
      // But we store the parent relationships for restoration

      if (data.tabs) {
        for (const tabData of data.tabs) {
          // Store partial data that will be merged during sync
          if (!this.tabs.has(tabData.id)) {
            this.tabs.set(tabData.id, {
              id: tabData.id,
              parentId: tabData.parentId,
              childIds: tabData.childIds || [],
              level: 0,
              collapsed: tabData.collapsed || false,
              title: tabData.title || "",
              type: tabData.type || "",
              nodeType: tabData.nodeType || "tab",
              selected: false,
            });
          }
        }
      }
    } catch (e) {
      Zotero.logError(`[Tree Style Tabs] Error loading tree structure: ${e}`);
    }
  }


}
