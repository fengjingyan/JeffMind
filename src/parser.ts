export interface MindMapNode {
	id: string;
	text: string;
	link: string | null;
	comment: string | null;
	line: number | null;
	depth: number;
	collapsed: boolean;
	children: MindMapNode[];
}

const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const LIST_RE = /^(\s*)(?:[-*+]|\d+[.)])\s+(.+?)\s*$/;
const FENCE_RE = /^\s*(`{3,}|~{3,})/;

export function findNode(root: MindMapNode | null, id: string): MindMapNode | null {
	if (!root) return null;
	if (root.id === id) return root;
	for (const child of root.children) {
		const hit = findNode(child, id);
		if (hit) return hit;
	}
	return null;
}

export function countDescendants(node: MindMapNode): number {
	let total = 0;
	for (const child of node.children) total += 1 + countDescendants(child);
	return total;
}

function parseInline(raw: string): { text: string; link: string | null } {
	let text = raw.trim();
	text = text.replace(/^\[[ xX]\]\s+/, "");

	let link: string | null = null;
	const wiki = text.match(/\[\[([^\[\]]+)\]\]/);
	if (wiki) {
		const inner = wiki[1];
		const pipe = inner.indexOf("|");
		const target = (pipe >= 0 ? inner.slice(0, pipe) : inner).split("#")[0].trim();
		link = target.length > 0 ? target : null;
	}

	text = text
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/\[\[([^\[\]|]+)\|([^\]]+)\]\]/g, "$2")
		.replace(/\[\[([^\[\]]+)\]\]/g, "$1")
		.replace(/`([^`]*)`/g, "$1")
		.replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/__([^_]+)__/g, "$1")
		.replace(/~~([^~]+)~~/g, "$1")
		.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1$2")
		.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?:;]|$)/g, "$1$2")
		.replace(/[ \t]{2,}/g, " ")
		.trim();

	return { text, link };
}

function appendComment(node: MindMapNode, comment: string): void {
	const clean = comment.trim();
	if (clean.length === 0) return;
	node.comment = node.comment ? `${node.comment}\n${clean}` : clean;
}

interface OpenComment {
	close: string;
	parts: string[];
}

interface PreparedLine {
	text: string;
	comments: string[];
	line: number;
}

function extractComments(
	line: string,
	open: OpenComment | null,
): { text: string; comments: string[]; open: OpenComment | null } {
	let text = "";
	let rest = line;
	const comments: string[] = [];
	let state = open;

	while (rest.length > 0) {
		if (state) {
			const end = rest.indexOf(state.close);
			if (end >= 0) {
				state.parts.push(rest.slice(0, end));
				const joined = state.parts.join("\n").trim();
				if (joined.length > 0) comments.push(joined);
				rest = rest.slice(end + state.close.length);
				state = null;
			} else {
				state.parts.push(rest);
				rest = "";
			}
			continue;
		}

		const pct = rest.indexOf("%%");
		const html = rest.indexOf("<!--");
		let idx = -1;
		let closer = "";
		let openerLength = 0;
		if (pct >= 0 && (html < 0 || pct < html)) {
			idx = pct;
			closer = "%%";
			openerLength = 2;
		} else if (html >= 0) {
			idx = html;
			closer = "-->";
			openerLength = 4;
		}

		if (idx < 0) {
			text += rest;
			break;
		}

		text += rest.slice(0, idx);
		const after = rest.slice(idx + openerLength);
		const end = after.indexOf(closer);
		if (end >= 0) {
			const body = after.slice(0, end).trim();
			if (body.length > 0) comments.push(body);
			rest = after.slice(end + closer.length);
		} else {
			state = { close: closer, parts: [after] };
			rest = "";
		}
	}

	return { text, comments, open: state };
}

function prepareLines(lines: string[], start: number): PreparedLine[] {
	const prepared: PreparedLine[] = [];
	let open: OpenComment | null = null;
	let inFence = false;

	for (let i = start; i < lines.length; i++) {
		const line = lines[i];

		if (open) {
			const res = extractComments(line, open);
			open = res.open;
			prepared.push({ text: res.text.trim().length === 0 ? "" : res.text, comments: res.comments, line: i });
			continue;
		}
		if (inFence) {
			if (FENCE_RE.test(line)) inFence = false;
			prepared.push({ text: "", comments: [], line: i });
			continue;
		}
		if (FENCE_RE.test(line)) {
			inFence = true;
			prepared.push({ text: "", comments: [], line: i });
			continue;
		}

		const res = extractComments(line, null);
		open = res.open;
		prepared.push({ text: res.text, comments: res.comments, line: i });
	}

	return prepared;
}

export function parseMarkdown(source: string, fallbackTitle: string): MindMapNode {
	const rawLines = source.split(/\r?\n/);

	let start = 0;
	if (rawLines[0] !== undefined && rawLines[0].trim() === "---") {
		start = 1;
		while (start < rawLines.length && rawLines[start].trim() !== "---") start++;
		start++;
	}

	const lines = prepareLines(rawLines, start);

	let counter = 0;
	const makeNode = (raw: string, depth: number, line: number | null): MindMapNode => {
		const parsed = parseInline(raw);
		return {
			id: `n${counter++}`,
			text: parsed.text.length > 0 ? parsed.text : raw.trim(),
			link: parsed.link,
			comment: null,
			line,
			depth,
			collapsed: false,
			children: [],
		};
	};

	const roots: MindMapNode[] = [];
	const headingStack: (MindMapNode | null)[] = [];
	const orphanComments: string[] = [];
	let listStack: { indent: number; node: MindMapNode }[] = [];
	let lastNode: MindMapNode | null = null;

	const attachOrphans = (node: MindMapNode): void => {
		for (const orphan of orphanComments.splice(0)) appendComment(node, orphan);
	};

	for (const prepared of lines) {
		const text = prepared.text;
		const trimmed = text.trim();

		if (trimmed.length === 0) {
			if (prepared.comments.length > 0) {
				if (lastNode) {
					for (const comment of prepared.comments) appendComment(lastNode, comment);
				} else {
					orphanComments.push(...prepared.comments);
				}
			}
			continue;
		}

		const heading = text.match(HEADING_RE);
		if (heading) {
			const level = heading[1].length;
			let parent: MindMapNode | null = null;
			for (let l = level - 2; l >= 0; l--) {
				const candidate = headingStack[l];
				if (candidate) {
					parent = candidate;
					break;
				}
			}
			const node = makeNode(heading[2], parent ? parent.depth + 1 : 0, prepared.line);
			attachOrphans(node);
			for (const comment of prepared.comments) appendComment(node, comment);
			if (parent) parent.children.push(node);
			else roots.push(node);
			headingStack.length = level - 1;
			headingStack[level - 1] = node;
			listStack = [];
			lastNode = node;
			continue;
		}

		const item = text.match(LIST_RE);
		if (item) {
			const indent = item[1].replace(/\t/g, "    ").length;
			while (listStack.length > 0 && listStack[listStack.length - 1].indent >= indent) {
				listStack.pop();
			}
			let parent: MindMapNode | null = listStack.length > 0 ? listStack[listStack.length - 1].node : null;
			if (!parent) {
				for (let l = headingStack.length - 1; l >= 0; l--) {
					const candidate = headingStack[l];
					if (candidate) {
						parent = candidate;
						break;
					}
				}
			}
			const node = makeNode(item[2], parent ? parent.depth + 1 : 0, prepared.line);
			attachOrphans(node);
			for (const comment of prepared.comments) appendComment(node, comment);
			if (parent) parent.children.push(node);
			else roots.push(node);
			listStack.push({ indent, node });
			lastNode = node;
			continue;
		}

		const indentMatch = /^\s*/.exec(text);
		const indent = indentMatch ? indentMatch[0].replace(/\t/g, "    ").length : 0;
		const listTop = listStack.length > 0 ? listStack[listStack.length - 1].node : null;
		const listTopIndent = listStack.length > 0 ? listStack[listStack.length - 1].indent : -1;

		if (listTop && indent > listTopIndent) {
			const appended = parseInline(trimmed).text;
			if (appended.length > 0) {
				listTop.text = listTop.text.length > 0 ? `${listTop.text} ${appended}` : appended;
			}
			for (const comment of prepared.comments) appendComment(listTop, comment);
			lastNode = listTop;
			continue;
		}

		if (prepared.comments.length > 0) {
			if (lastNode) {
				for (const comment of prepared.comments) appendComment(lastNode, comment);
			} else {
				orphanComments.push(...prepared.comments);
			}
		}
	}

	let root: MindMapNode;
	if (roots.length === 0) {
		root = makeNode(fallbackTitle, 0, null);
	} else if (roots.length === 1) {
		root = roots[0];
	} else {
		root = {
			id: "root",
			text: fallbackTitle,
			link: null,
			comment: null,
			line: null,
			depth: 0,
			collapsed: false,
			children: roots,
		};
	}
	attachOrphans(root);
	assignDepths(root, 0);
	return root;
}

function assignDepths(node: MindMapNode, depth: number): void {
	node.depth = depth;
	for (const child of node.children) assignDepths(child, depth + 1);
}
