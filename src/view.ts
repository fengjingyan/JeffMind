import { ItemView, MarkdownView, Menu, TFile, WorkspaceLeaf, setIcon } from "obsidian";
import type MindMapPlugin from "./main";
import type { PositionedNode } from "./layout";
import { LAYOUT_MODES, isLayoutMode, layoutMindMap } from "./layout";
import { findNode, parseMarkdown, type MindMapNode } from "./parser";
import { MindMapRenderer } from "./renderer";
import { THEMES, getTheme } from "./theme";

export const VIEW_TYPE_MINDMAP = "jeffmind-view";

export class MindMapView extends ItemView {
	private file: TFile | null = null;
	private root: MindMapNode | null = null;
	private renderer: MindMapRenderer | null = null;
	private canvasEl: HTMLElement | null = null;
	private emptyEl: HTMLElement | null = null;
	private noteTitleEl: HTMLElement | null = null;
	private followBtn: HTMLElement | null = null;
	private themeSelect: HTMLSelectElement | null = null;
	private layoutSelect: HTMLSelectElement | null = null;
	private follow = false;
	private refreshTimer: number | null = null;
	private resizeObserver: ResizeObserver | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: MindMapPlugin,
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_MINDMAP;
	}

	getDisplayText(): string {
		return this.file ? `${this.file.basename} · JeffMind` : "JeffMind";
	}

	getIcon(): string {
		return "network";
	}

	async onOpen(): Promise<void> {
		const container = this.contentEl;
		container.empty();
		container.addClass("mindmap-view");

		if (!this.file) {
			const state = this.getState() as { filePath?: string } | null;
			if (state && typeof state.filePath === "string") {
				const found = this.app.vault.getAbstractFileByPath(state.filePath);
				if (found instanceof TFile) this.file = found;
			}
		}

		const toolbar = container.createDiv({ cls: "mm-toolbar" });
		this.noteTitleEl = toolbar.createDiv({ cls: "mm-title", text: this.file ? this.file.basename : "No file" });
		this.buildToolbar(toolbar);

		this.canvasEl = container.createDiv({ cls: "mm-canvas" });
		this.renderer = new MindMapRenderer(this.canvasEl, {
			onToggle: (id) => this.toggleNode(id),
			onNodeClick: (id) => {
				void this.revealNodeLine(id);
			},
			onOpenLink: (link) => {
				void this.openLink(link);
			},
			onContextMenu: (event, node) => this.showNodeMenu(event, node),
		});

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", () => {
				if (this.follow) void this.followActiveFile();
			}),
		);
		this.registerEvent(
			this.app.vault.on("modify", (changed) => {
				if (this.file && changed.path === this.file.path) this.scheduleRefresh();
			}),
		);

		this.resizeObserver = new ResizeObserver(() => this.renderer?.handleResize());
		this.resizeObserver.observe(this.canvasEl);

		if (this.file) await this.refresh(true);
		else this.showEmptyState();
	}

	async onClose(): Promise<void> {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.resizeObserver?.disconnect();
		this.resizeObserver = null;
		this.renderer?.destroy();
		this.renderer = null;
	}

	async setFile(file: TFile, fit = true): Promise<void> {
		this.file = file;
		if (this.noteTitleEl) this.noteTitleEl.setText(file.basename);
		await this.refresh(fit);
		if (fit) {
			window.requestAnimationFrame(() => this.renderer?.handleResize());
		}
	}

	refreshView(): void {
		this.render(true);
	}

	private buildToolbar(toolbar: HTMLElement): void {
		const themeSelect = toolbar.createEl("select", { cls: "mm-theme-select" });
		this.themeSelect = themeSelect;
		for (const theme of THEMES) {
			themeSelect.createEl("option", { text: theme.name, value: theme.id });
		}
		themeSelect.value = getTheme(this.plugin.settings.theme).id;
		themeSelect.addEventListener("change", () => {
			this.plugin.settings.theme = themeSelect.value;
			void this.plugin.saveSettings();
			this.render(true);
		});

		const layoutSelect = toolbar.createEl("select", { cls: "mm-layout-select" });
		this.layoutSelect = layoutSelect;
		for (const mode of LAYOUT_MODES) {
			layoutSelect.createEl("option", { text: mode.name, value: mode.id });
		}
		layoutSelect.value = this.plugin.settings.layout;
		layoutSelect.addEventListener("change", () => {
			const value = layoutSelect.value;
			if (!isLayoutMode(value)) return;
			this.plugin.settings.layout = value;
			void this.plugin.saveSettings();
			this.render(true);
		});

		const actions = toolbar.createDiv({ cls: "mm-actions" });
		const addButton = (icon: string, tooltip: string, action: () => void): HTMLElement => {
			const btn = actions.createDiv({ cls: "clickable-icon mm-btn", attr: { "aria-label": tooltip } });
			setIcon(btn, icon);
			btn.addEventListener("click", action);
			return btn;
		};

		addButton("chevrons-up-down", "Expand all", () => this.setAllCollapsed(false));
		addButton("chevrons-down-up", "Collapse all", () => this.setAllCollapsed(true));
		addButton("maximize-2", "Fit to view", () => this.renderer?.fit());
		addButton("zoom-in", "Zoom in", () => this.renderer?.zoomBy(1.25));
		addButton("zoom-out", "Zoom out", () => this.renderer?.zoomBy(0.8));

		this.followBtn = actions.createDiv({
			cls: "clickable-icon mm-btn mm-follow",
			attr: { "aria-label": "Follow active note" },
		});
		setIcon(this.followBtn, "activity");
		this.followBtn.addEventListener("click", () => {
			this.follow = !this.follow;
			this.followBtn?.classList.toggle("is-active", this.follow);
			if (this.follow) void this.followActiveFile();
		});
	}

	private async refresh(fit: boolean): Promise<void> {
		if (!this.file) return;
		const source = await this.app.vault.cachedRead(this.file);
		this.root = parseMarkdown(source, this.file.basename);
		this.hideEmptyState();
		this.render(fit);
	}

	private showEmptyState(): void {
		if (!this.canvasEl || this.emptyEl) return;
		this.emptyEl = this.canvasEl.createDiv({
			cls: "mm-empty",
			text: "No note selected. Use the ribbon icon or the \u201cOpen current note as mind map\u201d command.",
		});
	}

	private hideEmptyState(): void {
		this.emptyEl?.remove();
		this.emptyEl = null;
	}

	private render(fit: boolean): void {
		if (!this.root || !this.renderer) return;
		const theme = getTheme(this.plugin.settings.theme);
		if (this.themeSelect) this.themeSelect.value = theme.id;
		if (this.layoutSelect) this.layoutSelect.value = this.plugin.settings.layout;
		const layout = layoutMindMap(this.root, this.plugin.settings.layout, theme.fontFamily);
		this.renderer.render(layout, fit, theme);
	}

	private scheduleRefresh(): void {
		if (this.refreshTimer !== null) window.clearTimeout(this.refreshTimer);
		this.refreshTimer = window.setTimeout(() => {
			this.refreshTimer = null;
			void this.refresh(false);
		}, 300);
	}

	private toggleNode(id: string): void {
		const node = findNode(this.root, id);
		if (!node) return;
		node.collapsed = !node.collapsed;
		this.render(false);
	}

	private setAllCollapsed(collapsed: boolean): void {
		if (!this.root) return;
		const walk = (node: MindMapNode, depth: number): void => {
			node.collapsed = collapsed && depth > 0 && node.children.length > 0;
			for (const child of node.children) walk(child, depth + 1);
		};
		walk(this.root, 0);
		this.render(false);
	}

	private setSubtreeCollapsed(id: string, collapsed: boolean): void {
		const node = findNode(this.root, id);
		if (!node) return;
		const walk = (target: MindMapNode): void => {
			target.collapsed = collapsed && target.children.length > 0;
			for (const child of target.children) walk(child);
		};
		walk(node);
		this.render(false);
	}

	private async followActiveFile(): Promise<void> {
		const active = this.app.workspace.getActiveFile();
		if (active && active.extension === "md" && active.path !== this.file?.path) {
			await this.setFile(active, false);
		}
	}

	private async openLink(link: string): Promise<void> {
		await this.app.workspace.openLinkText(link, this.file?.path ?? "", false);
	}

	private async revealNodeLine(id: string): Promise<void> {
		const node = findNode(this.root, id);
		const file = this.file;
		if (!node || node.line === null || !file) return;
		const line = Math.max(0, node.line);

		let target: WorkspaceLeaf | null = null;
		for (const leaf of this.app.workspace.getLeavesOfType("markdown")) {
			const view = leaf.view;
			if (view instanceof MarkdownView && view.file?.path === file.path) {
				target = leaf;
				break;
			}
		}
		if (!target) target = this.app.workspace.getLeaf("tab");

		await target.openFile(file, { eState: { line } });
		this.app.workspace.setActiveLeaf(target, { focus: true });
		const view = target.view;
		if (view instanceof MarkdownView) {
			view.editor.setCursor({ line, ch: 0 });
			view.editor.scrollIntoView({ from: { line, ch: 0 }, to: { line, ch: 0 } }, true);
		}
	}

	private showNodeMenu(event: MouseEvent, node: PositionedNode): void {
		const menu = new Menu();
		const source = findNode(this.root, node.id);
		if (source && source.line !== null) {
			menu.addItem((item) =>
				item
					.setTitle("Locate in note")
					.setIcon("text-search")
					.onClick(() => {
						void this.revealNodeLine(node.id);
					}),
			);
		}
		menu.addItem((item) =>
			item
				.setTitle("Copy text")
				.setIcon("copy")
				.onClick(() => {
					void navigator.clipboard.writeText(node.text);
				}),
		);
		if (node.link !== null) {
			menu.addItem((item) =>
				item
					.setTitle(`Open ${node.link}`)
					.setIcon("file")
					.onClick(() => {
						void this.openLink(node.link as string);
					}),
			);
		}
		if (node.children.length > 0) {
			menu.addSeparator();
			menu.addItem((item) =>
				item
					.setTitle("Expand subtree")
					.setIcon("chevrons-up-down")
					.onClick(() => this.setSubtreeCollapsed(node.id, false)),
			);
			menu.addItem((item) =>
				item
					.setTitle("Collapse subtree")
					.setIcon("chevrons-down-up")
					.onClick(() => this.setSubtreeCollapsed(node.id, true)),
			);
		}
		menu.showAtPosition({ x: event.clientX, y: event.clientY });
	}
}
