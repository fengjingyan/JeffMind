import type { MindMapLayout, PositionedNode } from "./layout";
import { COMMENT_ICON_SPACE, styleFor } from "./layout";
import type { MindMapTheme, NodeTheme } from "./theme";
import { contrastText, withAlpha } from "./theme";

export interface RendererHandlers {
	onToggle: (id: string) => void;
	onNodeClick: (id: string) => void;
	onOpenLink: (link: string) => void;
	onContextMenu: (event: MouseEvent, node: PositionedNode) => void;
}

function svgEl<K extends keyof SVGElementTagNameMap>(
	tag: K,
	attrs?: Record<string, string | number>,
): SVGElementTagNameMap[K] {
	const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
	if (attrs) {
		for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
	}
	return el;
}

function paletteColor(theme: MindMapTheme, branch: number): string {
	const palette = theme.palette;
	const index = ((branch % palette.length) + palette.length) % palette.length;
	return palette[index];
}

function rootColor(theme: MindMapTheme): string {
	return theme.rootFill === "accent" ? "var(--interactive-accent)" : theme.rootFill;
}

function cubicPoint(p0: number, p1: number, p2: number, p3: number, t: number): number {
	const mt = 1 - t;
	return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

function cubicTangent(p0: number, p1: number, p2: number, p3: number, t: number): number {
	const mt = 1 - t;
	return 3 * mt * mt * (p1 - p0) + 6 * mt * t * (p2 - p1) + 3 * t * t * (p3 - p2);
}

function taperPath(
	x0: number,
	y0: number,
	x1: number,
	y1: number,
	w0: number,
	w1: number,
	vertical: boolean,
): string {
	const c1x = vertical ? x0 : x0 + (x1 - x0) * 0.55;
	const c1y = vertical ? y0 + (y1 - y0) * 0.55 : y0;
	const c2x = vertical ? x1 : x0 + (x1 - x0) * 0.45;
	const c2y = vertical ? y0 + (y1 - y0) * 0.45 : y1;
	const segments = 22;
	const top: string[] = [];
	const bottom: string[] = [];

	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const px = cubicPoint(x0, c1x, c2x, x1, t);
		const py = cubicPoint(y0, c1y, c2y, y1, t);
		const dx = cubicTangent(x0, c1x, c2x, x1, t);
		const dy = cubicTangent(y0, c1y, c2y, y1, t);
		const len = Math.hypot(dx, dy) || 1;
		const nx = -dy / len;
		const ny = dx / len;
		const half = (w0 + (w1 - w0) * t) / 2;
		top.push(`${(px + nx * half).toFixed(2)},${(py + ny * half).toFixed(2)}`);
		bottom.push(`${(px - nx * half).toFixed(2)},${(py - ny * half).toFixed(2)}`);
	}

	bottom.reverse();
	return `M${top.join(" L")} L${bottom.join(" L")} Z`;
}

function elbowPath(x0: number, y0: number, x1: number, y1: number): string {
	const dir = x1 >= x0 ? 1 : -1;
	const mx = (x0 + x1) / 2;
	const dy = Math.abs(y1 - y0);
	const dx = Math.abs(x1 - x0);
	const r = Math.min(8, dy / 2, dx / 4);
	const sign = y1 >= y0 ? 1 : -1;
	if (r < 0.5) {
		return `M${x0},${y0} L${mx},${y0} L${mx},${y1} L${x1},${y1}`;
	}
	return (
		`M${x0},${y0} ` +
		`H${(mx - dir * r).toFixed(2)} ` +
		`Q${mx},${y0} ${mx},${(y0 + sign * r).toFixed(2)} ` +
		`V${(y1 - sign * r).toFixed(2)} ` +
		`Q${mx},${y1} ${(mx + dir * r).toFixed(2)},${y1} ` +
		`H${x1}`
	);
}

function elbowPathV(x0: number, y0: number, x1: number, y1: number): string {
	const dir = y1 >= y0 ? 1 : -1;
	const my = (y0 + y1) / 2;
	const dx = Math.abs(x1 - x0);
	const dy = Math.abs(y1 - y0);
	const r = Math.min(8, dx / 2, dy / 4);
	const sign = x1 >= x0 ? 1 : -1;
	if (r < 0.5) {
		return `M${x0},${y0} L${x0},${my} L${x1},${my} L${x1},${y1}`;
	}
	return (
		`M${x0},${y0} ` +
		`V${(my - dir * r).toFixed(2)} ` +
		`Q${x0},${my} ${(x0 + sign * r).toFixed(2)},${my} ` +
		`H${(x1 - sign * r).toFixed(2)} ` +
		`Q${x1},${my} ${x1},${(y1 + dir * r).toFixed(2)} ` +
		`V${y1}`
	);
}

function radiusFor(corner: NodeTheme["corner"], h: number): number {
	switch (corner) {
		case "pill":
			return h / 2;
		case "soft":
			return Math.min(14, h / 2);
		case "sharp":
			return 2;
		default:
			return Math.min(8, h / 2);
	}
}

function resolveFill(nodeTheme: NodeTheme, color: string, theme: MindMapTheme): string {
	switch (nodeTheme.fill) {
		case "solid":
			return color;
		case "tint":
			return withAlpha(color, nodeTheme.fillAlpha);
		case "surface":
			return theme.surface;
		default:
			return "none";
	}
}

function resolveBorder(nodeTheme: NodeTheme, color: string, theme: MindMapTheme): string {
	switch (nodeTheme.border) {
		case "none":
			return "none";
		case "accent":
			return color;
		case "subtle":
			return theme.subtleBorder;
		default:
			return nodeTheme.border;
	}
}

function resolveText(nodeTheme: NodeTheme, contrastBase: string): string {
	switch (nodeTheme.text) {
		case "onFill":
			return contrastText(contrastBase);
		case "normal":
			return "var(--text-normal)";
		case "muted":
			return "var(--text-muted)";
		default:
			return nodeTheme.text;
	}
}

export class MindMapRenderer {
	private svg: SVGSVGElement;
	private viewport: SVGGElement;
	private theme: MindMapTheme | null = null;
	private scale = 1;
	private tx = 0;
	private ty = 0;
	private layoutData: MindMapLayout | null = null;
	private panning = false;
	private panPointer = -1;
	private panStartX = 0;
	private panStartY = 0;
	private pendingFit = false;
	private userAdjusted = false;
	private retryTimer: number | null = null;
	private clickTimer: number | null = null;
	private popover: HTMLElement | null = null;
	private popoverFor: string | null = null;

	constructor(
		private host: HTMLElement,
		private handlers: RendererHandlers,
	) {
		this.svg = svgEl("svg", { class: "mm-svg" });
		this.viewport = svgEl("g");
		this.svg.appendChild(this.viewport);
		host.appendChild(this.svg);

		this.svg.addEventListener("wheel", this.onWheel, { passive: false });
		this.svg.addEventListener("pointerdown", this.onPointerDown);
		this.svg.addEventListener("pointermove", this.onPointerMove);
		this.svg.addEventListener("pointerup", this.onPointerUp);
		this.svg.addEventListener("pointercancel", this.onPointerUp);
	}

	destroy(): void {
		this.hideCommentPopover();
		this.cancelNodeClick();
		if (this.retryTimer !== null) {
			window.clearTimeout(this.retryTimer);
			this.retryTimer = null;
		}
		this.svg.removeEventListener("wheel", this.onWheel);
		this.svg.removeEventListener("pointerdown", this.onPointerDown);
		this.svg.removeEventListener("pointermove", this.onPointerMove);
		this.svg.removeEventListener("pointerup", this.onPointerUp);
		this.svg.removeEventListener("pointercancel", this.onPointerUp);
		this.svg.remove();
	}

	render(layout: MindMapLayout, fit: boolean, theme: MindMapTheme): void {
		this.hideCommentPopover();
		this.theme = theme;
		this.host.style.setProperty("--mm-theme-bg", theme.background);
		this.host.style.setProperty("--mm-theme-font", theme.fontFamily);
		if (theme.gridColor !== null) {
			this.host.style.setProperty("--mm-theme-grid", theme.gridColor);
			this.host.classList.add("mm-grid");
		} else {
			this.host.classList.remove("mm-grid");
		}

		this.layoutData = layout;
		this.viewport.empty();

		const links = svgEl("g", { class: "mm-links" });
		const nodes = svgEl("g", { class: "mm-nodes" });
		this.viewport.appendChild(links);
		this.viewport.appendChild(nodes);

		const walk = (node: PositionedNode): void => {
			if (node.parent) this.drawLink(links, node.parent, node);
			this.drawNode(nodes, node);
			if (!node.collapsed) {
				for (const child of node.children) walk(child);
			}
		};
		walk(layout.root);

		this.applyTransform();
		if (fit) {
			this.userAdjusted = false;
			this.fit();
		}
	}

	fit(): void {
		const rect = this.svg.getBoundingClientRect();
		if (!this.layoutData || rect.width < 20 || rect.height < 20) {
			this.pendingFit = true;
			this.scheduleRetryFit();
			return;
		}
		this.pendingFit = false;
		const pad = 60;
		const bw = this.layoutData.maxX - this.layoutData.minX + pad * 2;
		const bh = this.layoutData.maxY - this.layoutData.minY + pad * 2;
		const scale = Math.min(rect.width / bw, rect.height / bh, 1.2);
		this.scale = Math.max(0.1, Math.min(4, scale));
		const cx = (this.layoutData.minX + this.layoutData.maxX) / 2;
		const cy = (this.layoutData.minY + this.layoutData.maxY) / 2;
		this.tx = rect.width / 2 - cx * this.scale;
		this.ty = rect.height / 2 - cy * this.scale;
		this.applyTransform();
	}

	handleResize(): void {
		if (this.pendingFit || !this.userAdjusted) this.fit();
	}

	private scheduleRetryFit(): void {
		if (this.retryTimer !== null) return;
		let attempts = 0;
		const attempt = (): void => {
			this.retryTimer = null;
			if (!this.pendingFit) return;
			this.fit();
			if (this.pendingFit && attempts++ < 20) {
				this.retryTimer = window.setTimeout(attempt, 100);
			}
		};
		this.retryTimer = window.setTimeout(attempt, 60);
	}

	zoomBy(factor: number): void {
		const rect = this.svg.getBoundingClientRect();
		this.zoomAt(rect.width / 2, rect.height / 2, factor);
	}

	private onWheel = (event: WheelEvent): void => {
		event.preventDefault();
		this.hideCommentPopover();
		const rect = this.svg.getBoundingClientRect();
		const factor = Math.exp(-event.deltaY * 0.0015);
		this.zoomAt(event.clientX - rect.left, event.clientY - rect.top, factor);
	};

	private onPointerDown = (event: PointerEvent): void => {
		if (event.button !== 0 && event.button !== 1) return;
		const target = event.target as Element | null;
		if (target && target.closest(".mm-node")) return;
		this.panning = true;
		this.panPointer = event.pointerId;
		this.panStartX = event.clientX - this.tx;
		this.panStartY = event.clientY - this.ty;
		this.svg.setPointerCapture(event.pointerId);
		this.svg.classList.add("mm-panning");
	};

	private onPointerMove = (event: PointerEvent): void => {
		if (!this.panning || event.pointerId !== this.panPointer) return;
		this.tx = event.clientX - this.panStartX;
		this.ty = event.clientY - this.panStartY;
		this.userAdjusted = true;
		this.hideCommentPopover();
		this.applyTransform();
	};

	private onPointerUp = (event: PointerEvent): void => {
		if (!this.panning || event.pointerId !== this.panPointer) return;
		this.panning = false;
		this.panPointer = -1;
		this.svg.classList.remove("mm-panning");
	};

	private zoomAt(px: number, py: number, factor: number): void {
		const next = Math.max(0.1, Math.min(4, this.scale * factor));
		const applied = next / this.scale;
		this.tx = px - (px - this.tx) * applied;
		this.ty = py - (py - this.ty) * applied;
		this.scale = next;
		this.userAdjusted = true;
		this.applyTransform();
	}

	private applyTransform(): void {
		this.viewport.setAttribute(
			"transform",
			`translate(${this.tx.toFixed(2)},${this.ty.toFixed(2)}) scale(${this.scale.toFixed(4)})`,
		);
	}

	private drawLink(group: SVGGElement, parent: PositionedNode, child: PositionedNode): void {
		const theme = this.theme;
		if (!theme) return;
		const color = paletteColor(theme, child.branch);
		const vertical = this.layoutData !== null && this.layoutData.vertical;
		let x0: number;
		let y0: number;
		let x1: number;
		let y1: number;
		if (vertical) {
			x0 = parent.x + parent.w / 2;
			y0 = parent.y + parent.h;
			x1 = child.x + child.w / 2;
			y1 = child.y;
		} else {
			const side = child.side;
			x0 = side === 1 ? parent.x + parent.w : parent.x;
			x1 = side === 1 ? child.x : child.x + child.w;
			y0 = parent.y + parent.h / 2;
			y1 = child.y + child.h / 2;
		}
		const branch = theme.branch;

		if (branch.style === "taper") {
			if (child.depth === 1) {
				group.appendChild(
					svgEl("path", {
						d: taperPath(x0, y0, x1, y1, branch.taperL1[0], branch.taperL1[1], vertical),
						fill: color,
						class: "mm-branch",
					}),
				);
				return;
			}
			if (child.depth === 2) {
				group.appendChild(
					svgEl("path", {
						d: taperPath(x0, y0, x1, y1, branch.taperL2[0], branch.taperL2[1], vertical),
						fill: color,
						class: "mm-branch",
					}),
				);
				return;
			}
		}

		const width = branch.widths[Math.min(child.depth, 3) - 1];
		if (branch.style === "elbow") {
			group.appendChild(
				svgEl("path", {
					d: vertical ? elbowPathV(x0, y0, x1, y1) : elbowPath(x0, y0, x1, y1),
					fill: "none",
					stroke: color,
					"stroke-width": width,
					"stroke-linecap": "round",
					"stroke-linejoin": "round",
					"stroke-opacity": 0.9,
					class: "mm-branch",
				}),
			);
			return;
		}

		const curve = vertical
			? `M${x0},${y0} C${x0},${(y0 + (y1 - y0) * 0.5).toFixed(2)} ${x1},${(y0 + (y1 - y0) * 0.5).toFixed(2)} ${x1},${y1}`
			: `M${x0},${y0} C${x0 + (x1 - x0) * 0.5},${y0} ${x0 + (x1 - x0) * 0.5},${y1} ${x1},${y1}`;
		group.appendChild(
			svgEl("path", {
				d: curve,
				fill: "none",
				stroke: color,
				"stroke-width": width,
				"stroke-linecap": "round",
				"stroke-opacity": 0.85,
				class: "mm-branch",
			}),
		);
	}

	private drawNode(group: SVGGElement, node: PositionedNode): void {
		const theme = this.theme;
		if (!theme) return;
		const style = styleFor(node.depth);
		const color = node.depth === 0 ? rootColor(theme) : paletteColor(theme, node.branch);
		const nodeTheme = node.depth === 0 ? theme.root : node.depth === 1 ? theme.level1 : theme.level2;
		const fill = resolveFill(nodeTheme, color, theme);
		const stroke = resolveBorder(nodeTheme, color, theme);
		const radius = radiusFor(nodeTheme.corner, node.h);
		const textFill = resolveText(nodeTheme, color);

		const nodeGroup = svgEl("g", {
			class: `mm-node mm-d${Math.min(node.depth, 3)}`,
			transform: `translate(${node.x.toFixed(2)},${node.y.toFixed(2)})`,
			"data-id": node.id,
		});

		const title = svgEl("title");
		let titleText = node.text;
		if (node.comment) titleText += `\n\nNote: ${node.comment}`;
		if (node.link !== null) titleText += `\n\nCtrl+Click to open ${node.link}`;
		if (node.children.length > 0) titleText += "\n\nDouble-click to expand/collapse";
		title.textContent = titleText;
		nodeGroup.appendChild(title);

		const iconSpace = node.comment ? COMMENT_ICON_SPACE : 0;
		const textCenter = node.side === 1 ? (node.w - iconSpace) / 2 : iconSpace + (node.w - iconSpace) / 2;

		const hasBox = fill !== "none" || stroke !== "none";
		if (node.depth <= 1 || hasBox) {
			nodeGroup.appendChild(
				svgEl("rect", {
					x: 0,
					y: 0,
					width: node.w,
					height: node.h,
					rx: radius,
					ry: radius,
					fill,
					stroke: stroke === "none" ? "none" : stroke,
					"stroke-width": stroke === "none" ? 0 : nodeTheme.borderWidth,
					class: theme.shadow && node.depth <= 1 ? "mm-box mm-shadowed" : "mm-box",
				}),
			);
		} else {
			nodeGroup.appendChild(
				svgEl("rect", { x: -6, y: 0, width: node.w + 12, height: node.h, rx: 6, class: "mm-hit" }),
			);
		}

		if (nodeTheme.underline && node.depth >= 2) {
			nodeGroup.appendChild(
				svgEl("line", {
					x1: textCenter - node.textW / 2,
					y1: node.h - 0.5,
					x2: textCenter + node.textW / 2,
					y2: node.h - 0.5,
					stroke: color,
					"stroke-width": 2,
					"stroke-linecap": "round",
					"stroke-opacity": 0.55,
					class: "mm-underline",
				}),
			);
		}

		const label = svgEl("text", {
			x: textCenter,
			y: node.h / 2 + 0.5,
			"font-size": style.fontSize,
			"font-weight": style.weight,
			fill: textFill,
			class: "mm-label",
		});
		if (node.lines.length > 1) {
			const lineHeight = style.fontSize * 1.45;
			const baseY = node.h / 2 + 0.5 - ((node.lines.length - 1) * lineHeight) / 2;
			node.lines.forEach((line, index) => {
				const tspan = svgEl("tspan", { x: textCenter, y: (baseY + index * lineHeight).toFixed(2) });
				tspan.textContent = line;
				label.appendChild(tspan);
			});
		} else {
			label.textContent = node.lines[0] ?? node.text;
		}
		nodeGroup.appendChild(label);

		if (node.comment) {
			nodeGroup.appendChild(this.buildCommentIcon(node, nodeTheme, color));
		}

		if (node.depth > 0 && node.children.length > 0) {
			const vertical = this.layoutData !== null && this.layoutData.vertical;
			const cx = vertical ? node.w / 2 : node.side === 1 ? 0 : node.w;
			const cy = vertical ? node.h : node.h / 2;
			if (node.collapsed) {
				nodeGroup.appendChild(svgEl("circle", { cx, cy, r: 6.5, fill: color, class: "mm-toggle" }));
				nodeGroup.appendChild(
					svgEl("line", {
						x1: cx - 3.5,
						y1: cy,
						x2: cx + 3.5,
						y2: cy,
						stroke: "#ffffff",
						"stroke-width": 1.6,
						"stroke-linecap": "round",
					}),
				);
				nodeGroup.appendChild(
					svgEl("line", {
						x1: cx,
						y1: cy - 3.5,
						x2: cx,
						y2: cy + 3.5,
						stroke: "#ffffff",
						"stroke-width": 1.6,
						"stroke-linecap": "round",
					}),
				);
			} else {
				nodeGroup.appendChild(svgEl("circle", { cx, cy, r: 3.5, fill: color, class: "mm-joint" }));
			}
			nodeGroup.appendChild(
				svgEl("circle", { cx, cy, r: 10, fill: "transparent", class: "mm-toggle-hit" }),
			);
		}

		nodeGroup.addEventListener("click", (event) => {
			const target = event.target;
			const iconTarget = target instanceof Element ? target.closest(".mm-comment-icon") : null;
			if (iconTarget && node.comment) {
				if (this.popoverFor === node.id) this.hideCommentPopover();
				else this.showCommentPopover(iconTarget, node);
				return;
			}
			const el = event.target as Element;
			if (el.closest(".mm-toggle-hit")) {
				if (node.children.length > 0) this.handlers.onToggle(node.id);
				return;
			}
			if (node.link !== null && (event.ctrlKey || event.metaKey)) {
				this.handlers.onOpenLink(node.link);
				return;
			}
			this.scheduleNodeClick(node.id);
		});
		nodeGroup.addEventListener("dblclick", (event) => {
			const el = event.target as Element;
			if (el.closest(".mm-toggle-hit") || el.closest(".mm-comment-icon")) return;
			this.cancelNodeClick();
			if (node.children.length > 0) this.handlers.onToggle(node.id);
		});
		nodeGroup.addEventListener("contextmenu", (event) => {
			event.preventDefault();
			this.handlers.onContextMenu(event, node);
		});

		group.appendChild(nodeGroup);
	}

	private scheduleNodeClick(id: string): void {
		this.cancelNodeClick();
		this.clickTimer = window.setTimeout(() => {
			this.clickTimer = null;
			this.handlers.onNodeClick(id);
		}, 230);
	}

	private cancelNodeClick(): void {
		if (this.clickTimer !== null) {
			window.clearTimeout(this.clickTimer);
			this.clickTimer = null;
		}
	}

	private buildCommentIcon(node: PositionedNode, nodeTheme: NodeTheme, color: string): SVGGElement {
		const icon = svgEl("g", { class: "mm-comment-icon" });
		const cx = node.side === 1 ? node.w - COMMENT_ICON_SPACE / 2 : COMMENT_ICON_SPACE / 2;
		const cy = node.h / 2 - 0.5;
		const onSolidFill = nodeTheme.fill === "solid";
		const fill = onSolidFill ? "#ffffff" : "var(--background-primary)";
		const stroke = onSolidFill ? "rgba(0, 0, 0, 0.15)" : color;
		const dotColor = onSolidFill ? color : stroke;

		const d =
			`M${cx - 7},${cy - 3.5} ` +
			`A3,3 0 0 1 ${cx - 4},${cy - 6.5} ` +
			`H${cx + 4} ` +
			`A3,3 0 0 1 ${cx + 7},${cy - 3.5} ` +
			`V${cy - 0.5} ` +
			`A3,3 0 0 1 ${cx + 4},${cy + 2.5} ` +
			`H${cx - 1} ` +
			`L${cx - 6.5},${cy + 7} ` +
			`L${cx - 4},${cy + 2.5} ` +
			`A3,3 0 0 1 ${cx - 7},${cy - 0.5} Z`;
		icon.appendChild(svgEl("path", { d, fill, stroke, "stroke-width": 1.2, "stroke-linejoin": "round" }));

		for (const dx of [-3, 0, 3]) {
			icon.appendChild(svgEl("circle", { cx: cx + dx, cy: cy - 2, r: 1, fill: dotColor }));
		}
		icon.appendChild(
			svgEl("circle", { cx, cy: cy + 0.5, r: 10, fill: "transparent", class: "mm-comment-icon-hit" }),
		);
		return icon;
	}

	private showCommentPopover(iconEl: Element, node: PositionedNode): void {
		this.hideCommentPopover();
		if (!node.comment) return;

		const hostRect = this.host.getBoundingClientRect();
		const iconRect = iconEl.getBoundingClientRect();
		const popover = document.createElement("div");
		popover.className = "mm-comment-popover";
		popover.textContent = node.comment;
		this.host.appendChild(popover);

		const pw = popover.offsetWidth;
		const ph = popover.offsetHeight;
		const centerX = iconRect.left - hostRect.left + iconRect.width / 2;
		const minLeft = pw / 2 + 8;
		const maxLeft = Math.max(minLeft, hostRect.width - pw / 2 - 8);
		const left = Math.min(Math.max(centerX, minLeft), maxLeft);
		let top = iconRect.bottom - hostRect.top + 10;
		if (top + ph > hostRect.height - 8) {
			top = Math.max(8, iconRect.top - hostRect.top - ph - 10);
		}
		popover.style.left = `${left}px`;
		popover.style.top = `${top}px`;

		this.popover = popover;
		this.popoverFor = node.id;
		document.addEventListener("pointerdown", this.popoverClose, true);
	}

	private hideCommentPopover(): void {
		if (this.popover === null) return;
		document.removeEventListener("pointerdown", this.popoverClose, true);
		this.popover.remove();
		this.popover = null;
		this.popoverFor = null;
	}

	private popoverClose = (event: Event): void => {
		if (this.popover === null) return;
		const target = event.target;
		if (target instanceof Element && target.closest(".mm-comment-icon")) return;
		if (target instanceof Node && this.popover.contains(target)) return;
		this.hideCommentPopover();
	};
}
