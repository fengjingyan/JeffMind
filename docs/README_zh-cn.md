# JeffMind

[English](../README.md) | 中文文档

**JeffMind** 是一个 [Obsidian](https://obsidian.md) 插件，可以把 Markdown 笔记渲染成 XMind 风格的思维导图——显示在右侧栏或主区域的标签页中。笔记修改保存后导图会自动刷新，每个节点都关联回笔记中的源行。

## 功能特性

- **Markdown 转思维导图**——标题和嵌套列表变成分支；笔记有多个顶层章节时，会生成一个以文件名命名的虚拟根节点。
- **四种布局**——Balanced（左右平衡）、Right（仅右侧）、Left（仅左侧）、Tree（自上而下树形）。树形布局会自动对长文本换行，保持树形紧凑。
- **八款内置主题**——Snowbrush（默认）、Classic、Business、Dark、Solarized、Blueprint、Rainbow、Handwritten，每款主题自带字体、分支风格和节点样式。
- **单击定位**——单击节点会打开笔记并跳转到该节点的源行。
- **展开 / 折叠**——双击节点（或点击折叠圆点）可展开或折叠分支；折叠标记会显示被隐藏的节点数量。
- **注释**——`%%...%%` 和 `<!--...-->` 注释会附着到最近的节点上，通过注释图标和气泡框查看。
- **实时刷新**——编辑并保存笔记后导图自动重新渲染。
- **跟随模式**——可选择跟随当前活动笔记。
- **缩放与平移**——滚轮缩放、拖拽平移，工具栏提供适应视图和缩放按钮。

## 使用方法

### 打开思维导图

使用左侧功能区的图标，或在命令面板中执行以下命令：

| 命令 | 说明 |
| --- | --- |
| `JeffMind: Open current note as mind map` | 按设置中配置的位置打开导图。 |
| `JeffMind: Open current note as mind map in right sidebar` | 始终在右侧栏打开导图。 |
| `JeffMind: Open file as mind map…` | 弹出文件选择器，打开选中的笔记。 |

### 节点交互

| 操作 | 效果 |
| --- | --- |
| 单击 | 打开笔记并滚动到该节点的源行。 |
| 双击 | 展开 / 折叠该分支。 |
| Ctrl/Cmd + 单击 | 打开节点的 wikilink 目标（如果节点包含链接）。 |
| 右键 | 上下文菜单：定位到笔记、复制文本、打开链接、展开/折叠子树。 |
| 点击注释图标 | 在气泡框中显示该节点的注释。 |
| 点击折叠圆点 | 展开 / 折叠分支，并显示被隐藏的节点数量。 |

### 工具栏

从左到右依次为：主题选择器、布局选择器、全部展开、全部折叠、适应视图、放大、缩小、跟随当前笔记开关。

## 解析规则

- `#` 到 `######` 的标题层级会变成嵌套分支。
- 嵌套的无序列表（`-`、`*`、`+`）和有序列表（`1.`、`1)`）按缩进层级变成子节点。
- 缩进的纯文本续行会追加到上一个列表项中。
- YAML frontmatter 和围栏代码块会被忽略。
- 复选框前缀（`[ ]`、`[x]`）会被移除；行内的粗体/斜体/删除线/行内代码/图片语法会被剥离。
- 节点中的第一个 `[[wikilink]]` 会保留为链接目标（Ctrl/Cmd + 单击打开）。
- `%%注释%%` 和 `<!-- 注释 -->`（支持多行）会附着到上方最近的节点。

## 设置项

| 设置 | 选项 | 默认值 |
| --- | --- | --- |
| Theme（主题） | 8 款内置主题 | Snowbrush |
| Open location（打开位置） | 右侧栏 / 主区域（新标签页） | 右侧栏 |
| Mind map layout（导图布局） | Balanced / Right / Left / Tree (top-down) | Balanced |

## 安装

需要 Obsidian 1.4.0 或更高版本，支持桌面端和移动端。

### 手动安装

1. 从最新 Release 下载 `main.js`、`manifest.json`、`styles.css`（或按下方说明从源码构建）。
2. 创建目录 `<Vault>/.obsidian/plugins/jeffmind/`，把三个文件复制进去。
3. 重启 Obsidian，在 **设置 → 第三方插件** 中启用 **JeffMind**。

## 开发

```bash
npm install          # 安装依赖
npm run dev          # 监听模式：改动后自动重新构建 main.js
npm run build        # 类型检查并构建生产版 main.js
npm run deploy -- "<vault 路径>"
                     # 把 main.js / manifest.json / styles.css 复制到
                     # <vault>/.obsidian/plugins/jeffmind/
npm run release      # 构建并打包 dist/jeffmind-<version>.zip
```

`npm run deploy` 支持三种方式指定 vault 路径：命令行参数、`OBSIDIAN_VAULT` 环境变量，或项目根目录下的 `vault-path.txt` 文件。

### 发布流程

1. 更新 `manifest.json` 和 `package.json` 中的 `version`（如有需要，同时更新 `versions.json`）。
2. 执行 `npm run release`。
3. 创建 GitHub Release，tag 与版本号一致（不加 `v` 前缀），并把 `main.js`、`manifest.json`、`styles.css` 作为 Release 附件上传。

## 许可证

[MIT](../LICENSE)
