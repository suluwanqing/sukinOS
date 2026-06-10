# 记事本

## 基本信息

| 字段 | 值 |
|---|---|
| 资源ID | `sys-notebook-demo` |
| 应用类型 | `editor` |
| 寄生模式 | 否 |
| 暴露状态 | 是 |

## 功能说明

编辑器类应用，提供文本文件编辑功能。支持虚拟盘/本地盘模式、自动保存、行号显示、光标位置追踪、`Ctrl+S` 保存快捷键。

## Reducer 说明

接收来自 System 的 `dispatch(interactInfo)`，根据 `openType` 切换读写/只读模式：

- `openType: 'wr'` — 读写模式，打开文件进行编辑
- `openType: 'r'` — 只读模式

## 注册配置

- **快捷方式**：支持 (`hasShortcut: true`)
- **持久化**：不保存状态 (`saveState: false`)

## 依赖

- `AppSDK.Components.NoteBook`
- `AppSDK.hooks.useFileSystem`
