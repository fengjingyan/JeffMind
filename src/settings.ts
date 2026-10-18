import { App, PluginSettingTab, Setting } from "obsidian";
import type MindMapPlugin from "./main";
import { LAYOUT_MODES, isLayoutMode, type LayoutMode } from "./layout";
import { THEMES } from "./theme";
import { VIEW_TYPE_MINDMAP } from "./view";
import type { MindMapView } from "./view";

export interface MindMapSettings {
	layout: LayoutMode;
	openLocation: "right-sidebar" | "main";
	theme: string;
}

export const DEFAULT_SETTINGS: MindMapSettings = {
	layout: "balanced",
	openLocation: "right-sidebar",
	theme: "snowbrush",
};

export class MindMapSettingTab extends PluginSettingTab {
	constructor(
		app: App,
		private plugin: MindMapPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();

		new Setting(this.containerEl)
			.setName("Theme")
			.setDesc("Visual theme: fonts, branch style, node borders and corners.")
			.addDropdown((dropdown) => {
				for (const theme of THEMES) dropdown.addOption(theme.id, theme.name);
				dropdown.setValue(this.plugin.settings.theme);
				dropdown.onChange(async (value) => {
					this.plugin.settings.theme = value;
					await this.plugin.saveSettings();
					for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_MINDMAP)) {
						(leaf.view as MindMapView).refreshView();
					}
				});
			});

		new Setting(this.containerEl)
			.setName("Open location")
			.setDesc("Where the mind map view is opened by default.")
			.addDropdown((dropdown) => {
				dropdown.addOption("right-sidebar", "Right sidebar");
				dropdown.addOption("main", "Main area (new tab)");
				dropdown.setValue(this.plugin.settings.openLocation);
				dropdown.onChange(async (value) => {
					this.plugin.settings.openLocation = value === "main" ? "main" : "right-sidebar";
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.containerEl)
			.setName("Mind map layout")
			.setDesc(
				"Balanced places main branches on both sides of the root topic. Right and Left place every branch on one side. Tree stacks branches top-down.",
			)
			.addDropdown((dropdown) => {
				for (const mode of LAYOUT_MODES) dropdown.addOption(mode.id, mode.name);
				dropdown.setValue(this.plugin.settings.layout);
				dropdown.onChange(async (value) => {
					if (!isLayoutMode(value)) return;
					this.plugin.settings.layout = value;
					await this.plugin.saveSettings();
					for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_MINDMAP)) {
						(leaf.view as MindMapView).refreshView();
					}
				});
			});
	}
}
