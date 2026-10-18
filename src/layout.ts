import type { MindMapNode } from "./parser";
import { countDescendants } from "./parser";
import { SYSTEM_FONT } from "./theme";

export const COMMENT_ICON_SPACE = 26;

export type LayoutMode = "balanced" | "right" | "left" | "down";

export const LAYOUT_MODES: { id: LayoutMode; name: string }[] = [
	{ id: "balanced", name: "Balanced" },
	{ id: "right", name: "Right" },
	{ id: "left", name: "Left" },
	{ id: "down", name: "Tree (top-down)" },
];

export function isLayoutMode(value: unknown): value is LayoutMode {
	return LAYOUT_MODES.some((mode) => mode.id === value);
}

export const WRAP_WIDTH = 180;

export interface NodeStyle {
	fontSize: number;
	weight: number;
	padX: number;
	padY: number;
	minH: number;
	gapX: number;
	gapY: number;
}

export function styleFor(depth: number): NodeStyle {
	if (depth <= 0) {
		return { fontSize: 20, weight: 700, padX: 22, padY: 12, minH: 48, gapX: 72, gapY: 18 };
	}
	if (depth === 1) {
		return { fontSize: 16, weight: 600, padX: 16, padY: 8, minH: 38, gapX: 48, gapY: 14 };
	}
	return { fontSize: 14, weight: 500, padX: 10, padY: 5, minH: 28, gapX: 34, gapY: 10 };
}

export interface PositionedNode {
	id: string;
	text: string;
	lines: string[];
	link: string | null;
	comment: string | null;
	depth: number;
	collapsed: boolean;
	w: number;
	h: number;
	textW: number;
	subtreeH: number;
	subtreeW: number;
	hiddenCount: number;
	x: number;
	y: number;
	side: 1 | -1;
	branch: number;
	parent: PositionedNode | null;
	children: PositionedNode[];
}

export interface MindMapLayout {
	root: PositionedNode;
	vertical: boolean;
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

let measureCtx: CanvasRenderingContext2D | null = null;

function measure(text: string, style: NodeStyle, fontFamily: string): number {
	if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
	if (!measureCtx) return text.length * style.fontSize * 0.62;
	measureCtx.font = `${style.weight} ${style.fontSize}px ${fontFamily}`;
	return measureCtx.measureText(text).width;
}

function fitsWidth(text: string, style: NodeStyle, fontFamily: string, maxWidth: number): boolean {
	return measure(text, style, fontFamily) <= maxWidth;
}

function wrapText(text: string, style: NodeStyle, fontFamily: string, maxWidth: number): string[] {
	const words = text.split(/\s+/).filter((word) => word.length > 0);
	if (words.length === 0) return [""];

	const lines: string[] = [];
	let current = "";
	const flush = (): void => {
		if (current.length > 0) {
			lines.push(current);
			current = "";
		}
	};

	for (const word of words) {
		const pieces: string[] = [];
		let rest = Array.from(word);
		while (!fitsWidth(rest.join(""), style, fontFamily, maxWidth) && rest.length > 1) {
			let lo = 1;
			let hi = rest.length - 1;
			let best = 1;
			while (lo <= hi) {
				const mid = (lo + hi) >> 1;
				if (fitsWidth(rest.slice(0, mid).join(""), style, fontFamily, maxWidth)) {
					best = mid;
					lo = mid + 1;
				} else {
					hi = mid - 1;
				}
			}
			pieces.push(rest.slice(0, best).join(""));
			rest = rest.slice(best);
		}
		pieces.push(rest.join(""));

		for (const piece of pieces) {
			const candidate = current.length === 0 ? piece : `${current} ${piece}`;
			if (fitsWidth(candidate, style, fontFamily, maxWidth)) {
				current = candidate;
			} else {
				flush();
				current = piece;
			}
		}
	}
	flush();
	return lines.length > 0 ? lines : [text];
}

function build(
	element: MindMapNode,
	depth: number,
	branch: number,
	fontFamily: string,
	wrapWidth: number | null,
): PositionedNode {
	const style = styleFor(depth);
	const lines = wrapWidth !== null ? wrapText(element.text, style, fontFamily, wrapWidth) : [element.text];
	let textW = 0;
	for (const line of lines) textW = Math.max(textW, measure(line, style, fontFamily));
	const commentSpace = element.comment ? COMMENT_ICON_SPACE : 0;
	const lineHeight = style.fontSize * 1.45;
	const node: PositionedNode = {
		id: element.id,
		text: element.text,
		lines,
		link: element.link,
		comment: element.comment,
		depth,
		collapsed: element.collapsed,
		w: Math.ceil(textW + style.padX * 2 + commentSpace),
		h: Math.max(style.minH, Math.ceil(lines.length * lineHeight + style.padY * 2)),
		textW: Math.ceil(textW),
		subtreeH: 0,
		subtreeW: 0,
		hiddenCount: 0,
		x: 0,
		y: 0,
		side: 1,
		branch,
		parent: null,
		children: [],
	};
	node.subtreeH = node.h;
	node.subtreeW = node.w;

	for (let i = 0; i < element.children.length; i++) {
		const child = build(element.children[i], depth + 1, depth === 0 ? i : branch, fontFamily, wrapWidth);
		child.parent = node;
		node.children.push(child);
	}

	if (element.collapsed) {
		node.hiddenCount = countDescendants(element);
	} else if (node.children.length > 0) {
		const gapY = styleFor(depth + 1).gapY;
		const childrenH =
			node.children.reduce((sum, child) => sum + child.subtreeH, 0) + gapY * (node.children.length - 1);
		node.subtreeH = Math.max(node.h, childrenH);
		const gapX = styleFor(depth + 1).gapY + 10;
		const childrenW =
			node.children.reduce((sum, child) => sum + child.subtreeW, 0) + gapX * (node.children.length - 1);
		node.subtreeW = Math.max(node.w, childrenW);
	}
	return node;
}

function place(node: PositionedNode, anchorX: number, centerY: number, side: 1 | -1): void {
	node.side = side;
	node.x = side === 1 ? anchorX : anchorX - node.w;
	node.y = centerY - node.h / 2;
	if (node.collapsed || node.children.length === 0) return;

	const gapX = styleFor(node.depth + 1).gapX;
	const gapY = styleFor(node.depth + 1).gapY;
	const total =
		node.children.reduce((sum, child) => sum + child.subtreeH, 0) + gapY * (node.children.length - 1);
	const childAnchor = side === 1 ? node.x + node.w + gapX : node.x - gapX;

	let y = centerY - total / 2;
	for (const child of node.children) {
		place(child, childAnchor, y + child.subtreeH / 2, side);
		y += child.subtreeH + gapY;
	}
}

function placeGroup(nodes: PositionedNode[], anchorX: number, side: 1 | -1): void {
	if (nodes.length === 0) return;
	const gapY = styleFor(1).gapY;
	const total = nodes.reduce((sum, node) => sum + node.subtreeH, 0) + gapY * (nodes.length - 1);
	let y = -total / 2;
	for (const node of nodes) {
		place(node, anchorX, y + node.subtreeH / 2, side);
		y += node.subtreeH + gapY;
	}
}

function placeDown(node: PositionedNode, centerX: number, topY: number): void {
	node.side = 1;
	node.x = centerX - node.w / 2;
	node.y = topY;
	if (node.collapsed || node.children.length === 0) return;

	const gapX = styleFor(node.depth + 1).gapY + 10;
	const rowGap = styleFor(node.depth + 1).gapY + 24;
	const total =
		node.children.reduce((sum, child) => sum + child.subtreeW, 0) + gapX * (node.children.length - 1);
	const childTop = node.y + node.h + rowGap;

	let x = centerX - total / 2;
	for (const child of node.children) {
		placeDown(child, x + child.subtreeW / 2, childTop);
		x += child.subtreeW + gapX;
	}
}

export function layoutMindMap(
	root: MindMapNode,
	mode: LayoutMode,
	fontFamily: string = SYSTEM_FONT,
): MindMapLayout {
	const vertical = mode === "down";
	const mapRoot = build(root, 0, -1, fontFamily, vertical ? WRAP_WIDTH : null);

	if (vertical) {
		placeDown(mapRoot, 0, 0);
	} else {
		mapRoot.x = -mapRoot.w / 2;
		mapRoot.y = -mapRoot.h / 2;

		const right: PositionedNode[] = [];
		const left: PositionedNode[] = [];
		if (mode === "right") {
			right.push(...mapRoot.children);
		} else if (mode === "left") {
			left.push(...mapRoot.children);
		} else {
			let rightH = 0;
			let leftH = 0;
			for (const child of mapRoot.children) {
				if (rightH <= leftH) {
					right.push(child);
					rightH += child.subtreeH + styleFor(1).gapY;
				} else {
					left.push(child);
					leftH += child.subtreeH + styleFor(1).gapY;
				}
			}
		}

		const gapX = styleFor(1).gapX;
		placeGroup(right, mapRoot.x + mapRoot.w + gapX, 1);
		placeGroup(left, mapRoot.x - gapX, -1);
	}

	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;
	const visit = (node: PositionedNode): void => {
		minX = Math.min(minX, node.x);
		minY = Math.min(minY, node.y);
		maxX = Math.max(maxX, node.x + node.w);
		maxY = Math.max(maxY, node.y + node.h);
		if (!node.collapsed) {
			for (const child of node.children) visit(child);
		}
	};
	visit(mapRoot);

	return { root: mapRoot, vertical, minX, minY, maxX, maxY };
}
