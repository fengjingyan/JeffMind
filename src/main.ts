import { Notice, Plugin, SuggestModal, TFile, Workspace, WorkspaceLeaf } from "obsidian";
import { DEFAULT_SETTINGS, MindMapSettingTab, type MindMapSettings } from "./settings";
import { MindMapView, VIEW_TYPE_MINDMAP } from "./view";

type WorkspaceWithSideApi = Workspace & {
	ensureSideLeaf?: (
		type: string,
		side: "left" | "right",
		options?: { active?: boolean; reveal?: boolean; split?: boolean },
	) => Promise<WorkspaceLeaf>;
};

class FileSuggestModal extends SuggestModal<TFile> {
	constructor(private plugin: MindMapPlugin) {
		super(plugin.app);
		this.setPlaceholder("Choose a Markdown file to view as a mind map…");
	}

	getSuggestions(query: string): TFile[] {
		const lower = query.toLowerCase();
		return this.plugin.app.vault
			.getMarkdownFiles()
			.filter((file) => lower.length === 0 || file.path.toLowerCase().includes(lower))
			.sort((a, b) => a.path.localeCompare(b.path))
			.slice(0, 50);
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	onChooseSuggestion(file: TFile): void {
		void this.plugin.openFile(file);
	}
}

export default class MindMapPlugin extends Plugin {
	settings: MindMapSettings = { ...DEFAULT_SETTINGS };

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE_MINDMAP, (leaf: WorkspaceLeaf) => new MindMapView(leaf, this));

		this.addRibbonIcon("network", "Open mind map for current note", () => {
			void this.openForActiveFile();
		});

		this.addCommand({
			id: "open-current-note",
			name: "Open current note as mind map",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const available = file !== null && file.extension === "md";
				if (available && !checking) void this.openForActiveFile();
				return available;
			},
		});

		this.addCommand({
			id: "open-current-note-right-sidebar",
			name: "Open current note as mind map in right sidebar",
			checkCallback: (checking) => {
				const file = this.app.workspace.getActiveFile();
				const available = file !== null && file.extension === "md";
				if (available && !checking) void this.openForActiveFile("right-sidebar");
				return available;
			},
		});

		this.addCommand({
			id: "open-file-as-mindmap",
			name: "Open file as mind map…",
			callback: () => {
				new FileSuggestModal(this).open();
			},
		});

		this.addSettingTab(new MindMapSettingTab(this.app, this));
	}

	onunload(): void {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_MINDMAP);
	}

	async openForActiveFile(location?: "right-sidebar" | "main"): Promise<void> {
		const file = this.app.workspace.getActiveFile();
		if (!file || file.extension !== "md") {
			new Notice("Open a Markdown note first.");
			return;
		}
		await this.openFile(file, location);
	}

	async openFile(file: TFile, forceLocation?: "right-sidebar" | "main"): Promise<void> {
		const location = forceLocation ?? this.settings.openLocation;
		let leaf: WorkspaceLeaf | null = this.app.workspace.getLeavesOfType(VIEW_TYPE_MINDMAP)[0] ?? null;

		if (!leaf) {
			if (location === "right-sidebar") {
				const workspace = this.app.workspace as WorkspaceWithSideApi;
				if (typeof workspace.ensureSideLeaf === "function") {
					leaf = await workspace.ensureSideLeaf(VIEW_TYPE_MINDMAP, "right", {
						active: true,
						reveal: true,
					});
				} else {
					leaf = this.app.workspace.getRightLeaf(true) ?? this.app.workspace.getLeaf("tab");
					await leaf.setViewState({
						type: VIEW_TYPE_MINDMAP,
						active: true,
						state: { filePath: file.path },
					});
				}
			} else {
				leaf = this.app.workspace.getLeaf("tab");
				await leaf.setViewState({
					type: VIEW_TYPE_MINDMAP,
					active: true,
					state: { filePath: file.path },
				});
			}
		}

		const view = leaf.view;
		if (view instanceof MindMapView) {
			await view.setFile(file, true);
		} else {
			await leaf.setViewState({
				type: VIEW_TYPE_MINDMAP,
				active: true,
				state: { filePath: file.path },
			});
		}
		await this.app.workspace.revealLeaf(leaf);
	}

	async loadSettings(): Promise<void> {
		const stored = (await this.loadData()) as Partial<MindMapSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, stored);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
