# JeffMind

English | [中文文档](docs/README_zh-cn.md)

**JeffMind** is an [Obsidian](https://obsidian.md) plugin that renders your Markdown notes as XMind-style mind maps — in the right sidebar or a main tab. The map refreshes automatically when the note changes, and every node is linked back to its source line in the note.

## Features

- **Markdown to mind map** — headings and nested lists become branches, with a synthetic root when a note has several top-level sections.
- **Four layouts** — Balanced (branches on both sides), Right, Left, and Tree (top-down). The top-down tree wraps long node text automatically to keep the tree compact.
- **Eight built-in themes** — Snowbrush (default), Classic, Business, Dark, Solarized, Blueprint, Rainbow, and Handwritten, each with its own fonts, branch style, and node styling.
- **Click to locate** — single-clicking a node opens the note and jumps to the node's source line.
- **Expand / collapse** — double-click a node (or click its collapse marker) to toggle a branch; collapse markers show how many nodes are hidden.
- **Comments** — `%%...%%` and `<!--...-->` comments are attached to the nearest node and shown via a comment icon with a popover.
- **Live refresh** — the map re-renders as you edit and save the note.
- **Follow mode** — optionally follow the active note.
- **Pan & zoom** — wheel to zoom, drag to pan, with fit-to-view and zoom buttons in the toolbar.

## Usage

### Opening a mind map

Use the ribbon icon, or one of the commands in the command palette:

| Command | Description |
| --- | --- |
| `JeffMind: Open current note as mind map` | Opens the map in the location configured in settings. |
| `JeffMind: Open current note as mind map in right sidebar` | Always opens the map in the right sidebar. |
| `JeffMind: Open file as mind map…` | Shows a file picker, then opens the selected note. |

### Node interactions

| Action | Result |
| --- | --- |
| Click | Opens the note and scrolls to the node's source line. |
| Double-click | Expands / collapses the branch. |
| Ctrl/Cmd + click | Opens the node's wikilink target (if the node contains one). |
| Right-click | Context menu: Locate in note, Copy text, Open link, Expand or collapse subtree. |
| Click the comment icon | Shows the note's comment in a popover. |
| Click the collapse marker | Expands / collapses the branch and shows the hidden node count. |

### Toolbar

From left to right: theme selector, layout selector, expand all, collapse all, fit to view, zoom in, zoom out, and the follow-active-note toggle.

## How notes are parsed

- Heading levels (`#` to `######`) become nested branches.
- Nested unordered (`-`, `*`, `+`) and ordered (`1.`, `1)`) list items become child nodes, based on indentation.
- Indented plain-text continuation lines are appended to the preceding list item.
- YAML frontmatter and fenced code blocks are ignored.
- Checkbox prefixes (`[ ]`, `[x]`) are removed; inline bold/italic/strikethrough/code/image syntax is stripped.
- The first `[[wikilink]]` in a node is kept as its link target (Ctrl/Cmd + click to open).
- `%%comment%%` and `<!-- comment -->` blocks (including multi-line) are attached to the nearest node above them.

## Settings

| Setting | Options | Default |
| --- | --- | --- |
| Theme | 8 built-in themes | Snowbrush |
| Open location | Right sidebar / Main area (new tab) | Right sidebar |
| Mind map layout | Balanced / Right / Left / Tree (top-down) | Balanced |

## Installation

Requires Obsidian 1.4.0 or later. Works on desktop and mobile.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release (or build them from source, see below).
2. Create the folder `<Vault>/.obsidian/plugins/jeffmind/` and copy the three files into it.
3. Reload Obsidian and enable **JeffMind** under **Settings → Community plugins**.

## Development

```bash
npm install          # install dependencies
npm run dev          # watch mode: rebuild main.js on every change
npm run build        # type-check and build a production main.js
npm run deploy -- "<path-to-vault>"
                     # copy main.js / manifest.json / styles.css into
                     # <vault>/.obsidian/plugins/jeffmind/
npm run release      # build and package dist/jeffmind-<version>.zip
```

`npm run deploy` accepts the vault path as an argument, the `OBSIDIAN_VAULT` environment variable, or a `vault-path.txt` file in the project root.

### Releasing

Releases are automated with GitHub Actions (`.github/workflows/release.yml`). To publish a new version:

1. Bump `version` in `manifest.json` and `package.json` (and add the version to `versions.json` if needed).
2. Commit the change.
3. Create and push a tag equal to the version (no `v` prefix):

   ```bash
   git tag 0.3.1
   git push origin 0.3.1
   ```

The workflow then builds the plugin on a clean runner, verifies that the tag matches `manifest.json`, and creates a GitHub release with `main.js`, `manifest.json`, and `styles.css` attached.

If the release step fails with a permissions error, check **Settings → Actions → General → Workflow permissions** and allow read and write permissions.

You can also build and package locally with `npm run release` (creates `dist/jeffmind-<version>.zip`).

## License

[MIT](LICENSE)
