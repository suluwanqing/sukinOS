# 画板

## 基本信息

| 字段 | 值 |
|---|---|
| 资源ID | `sys-drawBoard-demo` |
| 应用类型 | `system` |
| 寄生模式 | 是 |
| 暴露状态 | 否 |

## 功能说明

集成画板与思维导图的创作工具，包含三个子页面：

- **图库 (gallery)** — 管理所有画板，支持新建/删除/重命名/导入导出
- **画板 (canvas)** — 手绘风格绘图，支持矩形/椭圆/菱形/直线/箭头/画笔/文本/图片等工具，带撤销重做、导出 PNG/JSON
- **思维导图 (mindmap)** — 节点式思维导图，支持多种形状/连线/自动排版/锁定/复制粘贴/导出

## Reducer 说明

内部路由使用 `dispatch({ type: 'NAV', payload: path })` 而非 SDK 的 `navigate`（后者 dispatch `{ type: 'NAVIGATE' }`）。

主要 action 类型：
- 画板：`SET_TOOL`, `SET_STYLE`, `SET_VIEW`, `ADD_ELEMENT`, `UPDATE_ELEMENT`, `DELETE_ELEMENTS`, `UNDO`, `REDO`, `LOAD_SCENE`, `SET_EDITING_TEXT`
- 思维导图：`SET_ACTIVE_MINDMAP`, `ADD_MM_NODE`, `UPDATE_MM_NODE`, `DELETE_MM_NODES`, `ADD_MM_CONN`, `UPDATE_MM_CONN`, `DELETE_MM_CONN`, `MM_PUSH_HIST`, `MM_UNDO`, `MM_REDO`, `AUTO_LAYOUT`

## 注册配置

- **快捷方式**：支持 (`hasShortcut: true`)
- **持久化**：不保存状态 (`saveState: false`)

## 依赖

- `AppSDK.Components.DrawBoard`
- `../db.js` — IndexedDB 工具模块 (画板 + 思维导图 CRUD)

## 文件结构

```
drawBoard/
├── layout.jsx          # 主布局 (内部路由)
├── style.module.css    # 主布局样式
├── registry.jsx        # 注册配置
├── readme.md           # 说明文档
├── db.js               # IndexedDB 工具
├── canvas/
│   ├── layout.jsx      # 画板绘图组件
│   └── style.module.css
├── gallery/
│   ├── layout.jsx      # 图库组件
│   └── style.module.css
└── mindmap/
    ├── layout.jsx      # 思维导图组件
    └── style.module.css
```
