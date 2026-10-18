export type BranchStyle = "taper" | "curve" | "elbow";
export type CornerStyle = "pill" | "round" | "soft" | "sharp";
export type FillMode = "solid" | "tint" | "none" | "surface";

export interface NodeTheme {
	/** solid = branch color fill; tint = translucent branch color; surface = theme surface; none = text only */
	fill: FillMode;
	fillAlpha: number;
	/** "onFill" (auto contrast on fill) | "normal" | "muted" | raw CSS color */
	text: string;
	/** "none" | "accent" (branch color) | "subtle" (theme subtle border) | raw CSS color */
	border: string;
	borderWidth: number;
	corner: CornerStyle;
	/** draw a colored underline under depth >= 2 nodes */
	underline: boolean;
}

export interface BranchTheme {
	style: BranchStyle;
	/** stroke widths for curve / elbow styles, by child depth 1 / 2 / 3+ */
	widths: [number, number, number];
	/** taper style: [base, tip] widths for depth-1 and depth-2 branches */
	taperL1: [number, number];
	taperL2: [number, number];
}

export interface MindMapTheme {
	id: string;
	name: string;
	/** canvas background (CSS color, may use Obsidian var()) */
	background: string;
	/** optional blueprint-style grid overlay */
	gridColor: string | null;
	fontFamily: string;
	palette: string[];
	/** fill color for "surface" fill mode */
	surface: string;
	/** stroke color for "subtle" border mode */
	subtleBorder: string;
	/** root fill: "accent" (Obsidian accent color) or a CSS color */
	rootFill: string;
	/** drop shadow on root / level-1 boxes */
	shadow: boolean;
	root: NodeTheme;
	level1: NodeTheme;
	level2: NodeTheme;
	branch: BranchTheme;
}

export const SYSTEM_FONT = `-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", sans-serif`;
export const MONO_FONT = `ui-monospace, "Cascadia Code", Consolas, "Courier New", monospace`;
export const HAND_FONT = `"Segoe Print", "Comic Sans MS", "Bradley Hand", "Microsoft YaHei", cursive`;

const SNOW_PALETTE = [
	"#F4433C",
	"#FB8C00",
	"#FBC02D",
	"#43A047",
	"#00897B",
	"#039BE5",
	"#3949AB",
	"#8E24AA",
	"#D81B60",
	"#6D4C41",
	"#00ACC1",
	"#7CB342",
];

const BUSINESS_PALETTE = [
	"#3E5C76",
	"#4F6D7A",
	"#55779E",
	"#5B8C85",
	"#607D8B",
	"#6E8CAB",
	"#455A64",
	"#526D82",
	"#7FA3B8",
	"#819CA9",
	"#37474F",
	"#546E7A",
];

const DARK_PALETTE = [
	"#FF6B6B",
	"#FFA94D",
	"#FFD43B",
	"#69DB7C",
	"#38D9A9",
	"#4DABF7",
	"#748FFC",
	"#DA77F2",
	"#F783AC",
	"#A9E34B",
	"#66D9E8",
	"#E599F7",
];

const SOLARIZED_PALETTE = [
	"#B58900",
	"#CB4B16",
	"#D33682",
	"#6C71C4",
	"#268BD2",
	"#2AA198",
	"#859900",
	"#DC322F",
];

const BLUEPRINT_PALETTE = [
	"#9FC3E0",
	"#B8D4EA",
	"#8FB8DE",
	"#C9DEF2",
	"#7FA8D0",
	"#A8C8E8",
	"#96BDDD",
	"#BDD6EC",
];

const RAINBOW_PALETTE = [
	"#FF5252",
	"#FF7043",
	"#FFCA28",
	"#66BB6A",
	"#26A69A",
	"#29B6F6",
	"#5C6BC0",
	"#AB47BC",
	"#EC407A",
	"#8D6E63",
	"#26C6DA",
	"#9CCC65",
];

const HAND_PALETTE = ["#E76F51", "#F4A261", "#E9C46A", "#2A9D8F", "#8AB17D", "#457B9D", "#B5838D", "#6D6875"];

export const THEMES: MindMapTheme[] = [
	{
		id: "snowbrush",
		name: "Snowbrush (default)",
		background: "var(--background-primary)",
		gridColor: null,
		fontFamily: SYSTEM_FONT,
		palette: SNOW_PALETTE,
		surface: "var(--background-primary)",
		subtleBorder: "var(--background-modifier-border)",
		rootFill: "accent",
		shadow: true,
		root: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "pill", underline: false },
		level1: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "round", underline: false },
		level2: { fill: "none", fillAlpha: 1, text: "normal", border: "none", borderWidth: 0, corner: "round", underline: true },
		branch: { style: "taper", widths: [2, 2, 2], taperL1: [18, 4], taperL2: [7, 2.5] },
	},
	{
		id: "classic",
		name: "Classic",
		background: "var(--background-primary)",
		gridColor: null,
		fontFamily: SYSTEM_FONT,
		palette: SNOW_PALETTE,
		surface: "var(--background-primary)",
		subtleBorder: "var(--background-modifier-border)",
		rootFill: "#2F4B7C",
		shadow: true,
		root: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "round", underline: false },
		level1: { fill: "tint", fillAlpha: 0.16, text: "normal", border: "accent", borderWidth: 1.5, corner: "round", underline: false },
		level2: { fill: "surface", fillAlpha: 1, text: "normal", border: "subtle", borderWidth: 1, corner: "round", underline: false },
		branch: { style: "curve", widths: [3, 2.5, 2], taperL1: [18, 4], taperL2: [7, 2.5] },
	},
	{
		id: "business",
		name: "Business",
		background: "var(--background-primary)",
		gridColor: null,
		fontFamily: SYSTEM_FONT,
		palette: BUSINESS_PALETTE,
		surface: "var(--background-primary)",
		subtleBorder: "var(--background-modifier-border)",
		rootFill: "#33475B",
		shadow: false,
		root: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "round", underline: false },
		level1: { fill: "tint", fillAlpha: 0.14, text: "normal", border: "none", borderWidth: 0, corner: "soft", underline: false },
		level2: { fill: "none", fillAlpha: 1, text: "normal", border: "none", borderWidth: 0, corner: "soft", underline: false },
		branch: { style: "curve", widths: [2.5, 2, 1.6], taperL1: [18, 4], taperL2: [7, 2.5] },
	},
	{
		id: "dark",
		name: "Dark",
		background: "#17181C",
		gridColor: null,
		fontFamily: SYSTEM_FONT,
		palette: DARK_PALETTE,
		surface: "#22242B",
		subtleBorder: "#3A3D46",
		rootFill: "#4DABF7",
		shadow: false,
		root: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "pill", underline: false },
		level1: { fill: "tint", fillAlpha: 0.2, text: "#E8EAED", border: "accent", borderWidth: 1.2, corner: "round", underline: false },
		level2: { fill: "none", fillAlpha: 1, text: "#C9CDD4", border: "none", borderWidth: 0, corner: "round", underline: true },
		branch: { style: "taper", widths: [2, 2, 2], taperL1: [16, 3.5], taperL2: [6, 2], },
	},
	{
		id: "solarized",
		name: "Solarized",
		background: "#002B36",
		gridColor: null,
		fontFamily: SYSTEM_FONT,
		palette: SOLARIZED_PALETTE,
		surface: "#073642",
		subtleBorder: "#586E75",
		rootFill: "#268BD2",
		shadow: false,
		root: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "pill", underline: false },
		level1: { fill: "tint", fillAlpha: 0.18, text: "#93A1A1", border: "accent", borderWidth: 1, corner: "soft", underline: false },
		level2: { fill: "none", fillAlpha: 1, text: "#93A1A1", border: "none", borderWidth: 0, corner: "soft", underline: true },
		branch: { style: "taper", widths: [2, 2, 2], taperL1: [15, 3.5], taperL2: [6, 2.2] },
	},
	{
		id: "blueprint",
		name: "Blueprint",
		background: "#0E2A47",
		gridColor: "rgba(140, 180, 220, 0.14)",
		fontFamily: MONO_FONT,
		palette: BLUEPRINT_PALETTE,
		surface: "#0E2A47",
		subtleBorder: "rgba(140, 180, 220, 0.35)",
		rootFill: "#C9DEF2",
		shadow: false,
		root: { fill: "none", fillAlpha: 1, text: "#E8F2FB", border: "#C9DEF2", borderWidth: 1.8, corner: "sharp", underline: false },
		level1: { fill: "none", fillAlpha: 1, text: "#DCEAF7", border: "accent", borderWidth: 1.4, corner: "sharp", underline: false },
		level2: { fill: "none", fillAlpha: 1, text: "#B8D2EA", border: "none", borderWidth: 0, corner: "sharp", underline: true },
		branch: { style: "elbow", widths: [2, 1.6, 1.2], taperL1: [18, 4], taperL2: [7, 2.5] },
	},
	{
		id: "rainbow",
		name: "Rainbow",
		background: "var(--background-primary)",
		gridColor: null,
		fontFamily: SYSTEM_FONT,
		palette: RAINBOW_PALETTE,
		surface: "var(--background-primary)",
		subtleBorder: "var(--background-modifier-border)",
		rootFill: "accent",
		shadow: true,
		root: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "pill", underline: false },
		level1: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "round", underline: false },
		level2: { fill: "none", fillAlpha: 1, text: "normal", border: "none", borderWidth: 0, corner: "round", underline: true },
		branch: { style: "taper", widths: [2, 2, 2], taperL1: [20, 5], taperL2: [8, 3] },
	},
	{
		id: "handwritten",
		name: "Handwritten",
		background: "#FBF3E4",
		gridColor: null,
		fontFamily: HAND_FONT,
		palette: HAND_PALETTE,
		surface: "#FFF8EB",
		subtleBorder: "rgba(120, 90, 50, 0.25)",
		rootFill: "#2A9D8F",
		shadow: true,
		root: { fill: "solid", fillAlpha: 1, text: "onFill", border: "none", borderWidth: 0, corner: "soft", underline: false },
		level1: { fill: "tint", fillAlpha: 0.22, text: "#4A3B2A", border: "accent", borderWidth: 1.4, corner: "soft", underline: false },
		level2: { fill: "tint", fillAlpha: 0.12, text: "#5A4A38", border: "none", borderWidth: 0, corner: "soft", underline: false },
		branch: { style: "curve", widths: [3, 2.4, 1.8], taperL1: [18, 4], taperL2: [7, 2.5] },
	},
];

const THEME_MAP = new Map(THEMES.map((theme) => [theme.id, theme]));

export function getTheme(id: string): MindMapTheme {
	return THEME_MAP.get(id) ?? THEMES[0];
}

export function withAlpha(color: string, alpha: number): string {
	if (!color.startsWith("#")) return color;
	const hex = color.slice(1);
	const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
	const value = parseInt(full.slice(0, 6), 16);
	if (Number.isNaN(value)) return color;
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
}

export function contrastText(color: string): string {
	if (!color.startsWith("#")) return "#ffffff";
	const hex = color.slice(1);
	const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
	const value = parseInt(full.slice(0, 6), 16);
	if (Number.isNaN(value)) return "#ffffff";
	const r = (value >> 16) & 255;
	const g = (value >> 8) & 255;
	const b = value & 255;
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance > 0.62 ? "#1f2328" : "#ffffff";
}
