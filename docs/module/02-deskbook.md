# DeskBook -- 桌面环境模块

## 1. 模块概述

DeskBook 是 SukinOS 的桌面环境核心模块，负责模拟操作系统的桌面体验。它涵盖了从系统启动引导、桌面图标网格布局、窗口进程管理、状态栏导航到应用自定义配置的完整桌面交互链路。

### 核心能力

- **系统引导**：启动画面展示与内核初始化触发
- **桌面图标网格**：基于 CSS Grid 的图标排列，支持拖拽交换与位置持久化
- **窗口管理**：多窗口层级排序、拖拽/缩放、最大化/最小化、进程生命周期
- **进程沙箱**：支持物理 iframe 沙箱、桥接模式、寄生模式三种运行隔离策略
- **窗口调度中心**：类 Ubuntu 的 Alt+Tab 窗口切换器（Ctrl+Alt+C）
- **状态栏**：底部应用栏，支持拖拽滚动，点击切换聚焦/休眠
- **应用自定义**：图标上传、偏好开关等资自定义配置面板

---

## 2. 文件列表与职责

| 文件路径 | 职责说明 |
|---------|---------|
| `deskBook/layout.jsx` | 桌面主容器，编排所有子模块，管理全局状态（窗口层级、网格布局、快捷键、应用排序） |
| `deskBook/style.module.css` | 桌面主容器样式 |
| `deskBook/boot/layout.jsx` | 系统启动引导界面，展示 SukinOS 品牌信息和启动按钮 |
| `deskBook/boot/style.module.css` | 启动界面样式 |
| `deskBook/shortcut/layout.jsx` | 桌面快捷方式图标组件，展示应用图标与名称 |
| `deskBook/shortcut/style.module.css` | 快捷方式图标样式 |
| `deskBook/statusBar/layout.jsx` | 底部状态栏，展示运行中应用图标，支持鼠标拖拽横向滚动 |
| `deskBook/statusBar/style.module.css` | 状态栏样式 |
| `deskBook/window/layout.jsx` | 应用窗口容器，管理窗口标题栏、缩放/拖拽、最大化、进程状态面板 |
| `deskBook/AdaptivePlaceholder.jsx` | 后台窗口轻量占位组件（自适应挂载优化），非可见窗口仅渲染 `<div style="display:none">` 而非完整 ProcessWindow；由 `deskBook/layout.jsx:8` 引入 |
| `deskBook/window/style.module.css` | 窗口容器样式 |
| `deskBook/window/process/layout.jsx` | 进程动态渲染引擎，包含 ErrorBoundary、Iframe 沙箱、代码编译与 SDK 注入 |
| `component/fileSystemView/layout.jsx` | 通用文件系统浏览视图组件（列表/网格布局），供应用内部使用 |

---

## 3. 组件树结构

```mermaid
graph TD
    DeskBook["DeskBook<br/>(deskBook/layout.jsx)"]
    Boot["Boot<br/>(boot/layout.jsx)"]
    CM_Desktop["ContextMenu<br/>(桌面右键菜单)"]
    GridCell["GridCell<br/>(网格单元格 x N)"]
    CM_Shortcut["ContextMenu<br/>(图标右键菜单)"]
    Shortcut["Shortcut<br/>(shortcut/layout.jsx)"]
    VfsImage_S["VfsImage<br/>(图标图片)"]
    ProcessWindow["ProcessWindow<br/>(window/layout.jsx) x N"]
    AdaptivePH["AdaptiveWindowPlaceholder<br/>(非可见窗口占位) x N"]
    CustomApp["CustomApp<br/>(customApp/layout.jsx)"]
    Switcher["WindowSwitcher<br/>(调度中心 Portal)"]
    StatusBar["StatusBar<br/>(statusBar/layout.jsx)"]

    DeskBook -->|"未就绪"| Boot
    DeskBook --> CM_Desktop
    CM_Desktop --> GridCell
    GridCell --> CM_Shortcut
    CM_Shortcut --> Shortcut
    Shortcut --> VfsImage_S

    DeskBook -->|"可见/焦点窗口"| ProcessWindow
    DeskBook -->|"非可见窗口<br/>(adaptiveMount !== false)"| AdaptivePH

    DeskBook -->|"editingApp"| CustomApp
    DeskBook -->|"Portal"| Switcher
    DeskBook -->|"statusBarOpen"| StatusBar

    ProcessWindow --> DynamicRenderer["DynamicRenderer<br/>(process/layout.jsx)"]
    DynamicRenderer --> ErrorBoundary["ErrorBoundary<br/>(故障隔离边界)"]
    ErrorBoundary -->|"寄生/桥接模式"| AppRenderer["AppInternalRenderer"]
    ErrorBoundary -->|"物理沙箱"| IframeSandbox["IframeSandbox"]
    IframeSandbox --> IframeStyleProvider["IframeStyleProvider"]
    IframeStyleProvider --> AppRenderer
    AppRenderer --> LayoutComponent["动态 Layout/Page<br/>(编译后的应用组件)"]

    CustomApp --> Thumb["Thumb<br/>(缩略图组件)"]

    StatusBar --> VfsImage_SB["VfsImage x N"]
    Switcher --> VfsImage_SW["VfsImage x N"]
```

---

## 4. 各组件详情

### 4.1 DeskBook (`deskBook/layout.jsx`)

**组件类型**：`React.memo(DeskBook)`，顶层桌面容器。

#### State

| 状态变量 | 类型 | 用途 |
|---------|------|------|
| `zOrders` | `Record<string, number>` | PID 到 z-index 的映射，控制窗口层级 |
| `maxZ` | `number` | 当前最大 z-index 值，初始 10 |
| `statusBarOpen` | `boolean` | 状态栏显隐状态（持久化到 localStorage） |
| `currentFocus` | `string \| null` | 当前焦点窗口的 PID |
| `gridSize` | `{ rows, cols }` | 桌面网格的行列数 |
| `appPositions` | `Record<string, string>` | PID 到 "row-col" 的坐标映射 |
| `dragOverCell` | `string \| null` | 当前拖拽悬停的格子坐标 |
| `editingApp` | `object \| null` | 正在编辑配置的应用对象 |
| `showWindowSwitcher` | `boolean` | 窗口调度中心显隐 |
| `selectedWindowIndex` | `number` | 调度中心选中索引 |

#### 关键 Refs

| Ref | 用途 |
|-----|------|
| `mainContainerRef` | 主容器 DOM 引用，用于网格计算和焦点管理 |
| `viewRef` | 桌面视图 DOM 引用，用于空白区域焦点抢夺 |
| `runningOrderRef` | 维护应用先来后到的 PID 顺序 |
| `windowRefsMap` | 收集每个 ProcessWindow 的 DOM 引用，用于 Switcher 动画 |
| `stateRef` | 缓存最新状态引用，避免全局键盘监听器的闭包陷阱 |
| `appPositionsRef` | 最新位置引用，用于 pagehide 事件安全保存 |

#### 计算属性（useMemo）

| 名称 | 用途 |
|------|------|
| `isRunningApps` | 从 `apps` 中过滤出非 INSTALLED 状态的应用，按 PID 先来后到排序 |
| `showDisplay` | PID 到 `boolean` 的映射（`status === 'RUNNING'`），控制窗口显示 |
| `sortedRunningApps` | 按 `currentFocus` 优先、然后 z-index 降序排列，用于 Switcher 展示 |

#### 关键方法

| 方法 | 说明 |
|------|------|
| `handleFocus(pid)` | 提升 PID 的 z-index 到最高，设置 `currentFocus` |
| `handleStartApp(pid)` | 先聚焦再调用 `startApp({ pid })` |
| `handleColseApp(pid)` | 休眠应用、清理 z-index 和焦点 |
| `handleForceKill(pid)` | 强制终止进程、清理 z-index 和焦点 |
| `handleGlobalKeyDown(event)` | 全局快捷键处理：Ctrl+R（软刷新）、Ctrl+Alt+C（Switcher）、Ctrl+Alt+O（状态栏） |
| `autoArrangeApps(apps, positions, rows, cols)` | 自动排列未分配位置的快捷方式图标 |
| `handleDragStart / Over / Leave / Drop` | 桌面图标拖拽事件处理（支持位置交换） |
| `handleCustomUpdate(newConfig)` | 调用内核更新资源自定义配置 |
| `handleUnload()` | `pagehide` 兜底处理器：先 `kernel.forceSaveAllStates()`，再把 `appPositionsRef` 里的图标位置交给 `setLayout` 写入 VFS 布局文件（`deskBook/layout.jsx:538-545`，系统未就绪或布局为空时不写） |

#### Props 传递给子组件

| 子组件 | 关键 Props |
|--------|-----------|
| `Boot` | `boot={bootSystem}`, `loading={loading}` |
| `Shortcut` | `app={{ label, ...appData }}` |
| `ProcessWindow` | `kernel, pid, fileName, zIndex, onFocus, onClose, onKill, isDisplay, isShow, exposeState, reStartApp, forceReStartApp, generateAppSetting, app, showWindowSwitcher, isSelected, initialRect, windowSize` |
| `StatusBar` | `blockEdApps, startApp, hibernateApp, currentFocus, onFocus, isRunningApps` |
| `CustomApp` | `initialCustom, onUpdateConfig, onClose, editingAppName` |

---

### 4.2 Boot (`deskBook/boot/layout.jsx`)

**组件类型**：`memo(Boot)`，纯展示组件。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `boot` | `function` | 点击按钮时触发的系统启动回调 |
| `loading` | `boolean` | 启动中状态，控制按钮文案和 spinner |

#### 功能

- 展示 SukinOS 品牌信息（Logo、标题、副标题）
- 展示四个特性标签：PWA_READY、LOCAL_SECURE、FETCH_MODE、EXT_MODULES
- 点击按钮调用 `boot()` 启动系统

---

### 4.3 Shortcut (`deskBook/shortcut/layout.jsx`)

**组件类型**：`React.memo(Shortcut)`，纯展示组件。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `app` | `object` | 应用对象，包含 `label` 和图标相关字段 |

#### 功能

- 使用 `VfsImage` 渲染应用图标
- 展示应用名称标签

---

### 4.4 StatusBar (`deskBook/statusBar/layout.jsx`)

**组件类型**：`React.memo(StatusBar)`，底部应用状态栏。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `blockEdApps` | `array` | 锁定的应用列表（如系统应用） |
| `startApp` | `function` | 启动应用的回调 |
| `hibernateApp` | `function` | 休眠应用的回调 |
| `currentFocus` | `string \| null` | 当前焦点 PID |
| `onFocus` | `function` | 聚焦回调 |
| `isRunningApps` | `array` | 当前运行中的应用列表 |
| `className` | `string` | 额外的 CSS 类名 |

#### State

| 状态变量 | 用途 |
|---------|------|
| (无本地状态) | -- |

#### 计算属性

| 名称 | 用途 |
|------|------|
| `displayApps` | 合并 `blockEdApps` 和 `isRunningApps`，去重后生成统一展示列表 |

#### 关键方法

| 方法 | 说明 |
|------|------|
| `handleAppClick(app)` | 三态切换：未运行 -> 启动；运行但未聚焦 -> 聚焦；已聚焦 -> 休眠 |

#### 鼠标拖拽滚动

- 监听 `mousedown` / `mousemove` / `mouseup` 实现拖拽横向滚动
- 监听 `wheel` 事件将纵向滚动转为横向滚动
- 滚动时添加 CSS 类禁用内部 hover 效果

#### 性能优化

- 事件绑定 `useEffect` 依赖为 `[]`（`containerRef` 稳定），消除窗口焦点切换时的事件监听器反复绑/解绑
- `React.memo` 使用自定义比较器：`className, currentFocus, isRunningApps, blockEdApps, onFocus, startApp, hibernateApp`

---

### 4.5 ProcessWindow (`deskBook/window/layout.jsx`)

**组件类型**：`memo(ProcessWindow, memoEqual)`，应用窗口容器。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `app` | `object` | 应用完整对象 |
| `exposeState` | `boolean` | 是否暴露状态面板（开发者模式） |
| `kernel` | `object` | 内核实例 |
| `pid` | `string` | 进程 PID |
| `fileName` | `string` | 应用文件名 |
| `onClose` | `function` | 休眠/关闭回调 |
| `onKill` | `function` | 强制终止回调 |
| `windowSize` | `object` | 默认窗口尺寸 |
| `initialRect` | `object` | 初始窗口位置和大小 |
| `zIndex` | `number` | 当前 z-index |
| `onFocus` | `function` | 聚焦回调 |
| `isDisplay` | `boolean` | 是否参与显示规则 |
| `isShow` | `boolean` | 是否可见 |
| `isFocused` | `boolean` | 是否为当前焦点窗口（`is-focused` 类名与 GPU 合成层分配依据；缩放手柄的门控已停用，见 §9.2） |
| `renderRef` | `Ref` | 转发给内部 `DynamicRenderer` 的 ref（`window/layout.jsx:291`） |
| `ref` | `Ref` | 组件自身 DOM 引用回传（`setWindowRef(pid)`） |
| `reStartApp` | `function` | 软重启回调 |
| `forceReStartApp` | `function` | 硬重启回调 |
| `generateAppSetting` | `object` | 全局应用生成设置（singleIframe, useVirtualWorker, maxWindows, maxWorkers, workerLRU） |
| `showWindowSwitcher` | `boolean` | 调度中心是否开启 |
| `isSelected` | `boolean` | 在调度中心是否被选中 |

> 调用方还会传 `initialIndex`（`deskBook/layout.jsx:759`），但组件签名（`window/layout.jsx:26-29`）并未接收它，属无害冗余入参。

> 标题栏相关配置在 `customConfig`（`window/layout.jsx:36-47`）里解析：`hideHeader` 取 `app.metaInfo.hideHeader ?? resource.metaInfo.hideHeader ?? false`；`hideHeaderHover` 取 `app.metaInfo.custom.hideHeaderHover ?? resource.metaInfo.custom.hideHeaderHover ?? false`，且一旦 `hideHeader` 为真就被强制置回 `false`（两者互斥，隐藏优先）。

#### State

| 状态变量 | 用途 |
|---------|------|
| `showState` | `boolean` | 进程状态面板显隐 |
| `isMaximized` | `boolean` | 窗口是否最大化 |

#### 关键方法

| 方法 | 说明 |
|------|------|
| `handleCompoundMouseDown(e, type)` | 组合鼠标事件：先聚焦再调用拖拽/缩放 hook |
| `toggleMaximize()` | 切换最大化状态 |
| `handleClose()` | 保存当前窗口位置到内核后关闭 |

#### 子组件：DynamicRenderer

- 由 `process/layout.jsx` 导出，在 ProcessWindow 的 content 区域渲染（`window/layout.jsx:278-293`）
- 接收 `resource, state, dispatch, pid, isSystemApp, onFocus, forceReStartApp, reStartApp, onKill, generateAppSetting, windowControls, isVisible` 以及 `ref`（在组件内改名 `renderRef`，`process/layout.jsx:705-707`）
- `windowControls` 由 ProcessWindow 的 `controlsRef` 适配而来（`window/layout.jsx:185-191`），含 `close / hibernate / toggleMaximize / setRect / getRect` 五个方法，透传给 `AppSDK.API.window` 供无标题栏应用自行实现窗口操作
- `isVisible` 传 `isShow`，用于 iframe 可见性解绑（见 §9.11）
- 负责代码编译、SDK 注入和沙箱渲染

#### 自定义 memo 比较

`memoEqual`（`window/layout.jsx:316-327`）对 8 个关键 props 进行浅比较：`pid, zIndex, isShow, isDisplay, exposeState, showWindowSwitcher, isSelected, isFocused`。父组件用 `useRef`/`useCallback` 稳定化的回调（`onFocus`、`onClose`、`onKill` 等）不参与比较，因此引用变化不会触发重渲染。注意：**缩放手柄的焦点门控目前已停用**（见 §9.2），窗口数量仍是后台窗口的 DOM 开销主要来源，真正省掉节点的是自适应挂载占位（§9.5）。

---

### 4.6 DynamicRenderer (`deskBook/window/process/layout.jsx`)

**组件类型**：`memo(DynamicRenderer, memoEqual)`，进程动态渲染引擎。

#### 子组件概览

| 子组件 | 用途 |
|--------|------|
| `ErrorBoundary` | Class Component，故障隔离边界。自动重试策略：3 次软重启 + 1 次硬重启，含错误节流 |
| `IframeStyleProvider` | 为 iframe 内部创建独立 Emotion Cache 上下文 |
| `IframeSandbox` | 物理隔离 iframe，拦截敏感 API，同步系统样式，转发键盘/鼠标事件 |
| `AppInternalRenderer` | 根据资源类型（单文件/bundle）渲染对应的 Layout + Page 组件 |

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `resource` | `object` | 应用资源对象（content, isBundle, metaInfo） |
| `state` | `object` | Worker 传递的进程状态 |
| `dispatch` | `function` | 状态分发函数 |
| `pid` | `string` | 进程 PID |
| `isSystemApp` | `boolean` | 是否为系统应用 |
| `onFocus` | `function` | 聚焦回调 |
| `forceReStartApp` | `function` | 硬重启回调 |
| `reStartApp` | `function` | 软重启回调 |
| `onKill` | `function` | 强制终止回调 |
| `generateAppSetting` | `object` | 全局应用生成设置 |

#### 沙箱模式判定

```
isParasitism = resource.metaInfo.isParasitism === true
useBridgeMode = (singleIframe || useVirtualWorker) && !isParasitism
```

- **寄生模式**：JS 执行在宿主 window，UI 直接渲染在宿主 DOM
- **桥接模式**：JS 执行在幽灵 iframe（单例），UI 直接渲染在宿主 DOM
- **物理沙箱模式**：JS 执行和 UI 渲染均在独立 iframe 内

#### ErrorBoundary 重试策略

1. 捕获渲染错误后自动进入重试
2. 前 3 次：指数退避软重启（`reStartApp`）
3. 第 4 次：延迟 500ms 硬重启（`forceReStartApp`）
4. 错误节流：同一错误 5 秒内不重复触发
5. 最终失败：展示错误详情 UI，支持手动重试或关闭

#### 幽灵沙箱（getGhostSandbox）

- 单例隐藏 iframe，作为桥接模式的 JS 执行上下文
- 拦截 `indexedDB`, `localStorage`, `sessionStorage`, `openDatabase`, `caches`
- 强迫 App 使用 `SDK.System.*` 替代原生持久化 API
- 宿主注入的 SDK 钩子运行在宿主闭包中，不受此限制（特权通行）

---

### 4.7 CustomApp (`deskBook/customApp/layout.jsx`)

**组件类型**：函数组件，应用自定义配置面板。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `initialCustom` | `object` | 初始自定义配置 |
| `onUpdateConfig` | `function` | 配置更新回调 |
| `onClose` | `function` | 关闭面板回调 |
| `editingAppName` | `string` | 正在编辑的应用名称 |

#### State

| 状态变量 | 用途 |
|---------|------|
| `config` | `object` | 当前配置（合并默认值与 initialCustom） |
| `iconPreview` | `string \| null` | 图标预览 URL |
| `isUploading` | `boolean` | 上传状态 |

#### 内部子组件：Thumb

缩略图组件，通过 `readFile(fileId)` 异步加载图片。

#### 功能

- 左侧：偏好设置开关列表（通过 `appCustomMapper` 配置），包括 `hasShortcut`, `blockEd`, `isFullScreen`, `autoStart`, `allowResize`, `showInLauncher`, `backgroundSleep`, `adaptiveMount`
- 右侧：图标预览与资源库管理（本地上传 / 资源库选择 / 删除）
- 使用 `useFileKernel('root')` 管理文件读写

---

### 4.8 FileSystemView (`component/fileSystemView/layout.jsx`)

**组件类型**：`React.memo(FileSystemView)`，通用文件系统浏览视图。

> 注意：此组件位于 `component/fileSystemView/` 而非 `deskBook/`，但被 deskBook 体系的应用广泛使用。

#### Props

| Prop | 类型 | 说明 |
|------|------|------|
| `items` | `array` | 目录项列表 `[{id, name, type, size, mtime}]` |
| `breadcrumbs` | `array` | 面包屑数据 `[{id, name}]` |
| `isLoading` | `boolean` | 加载状态 |
| `onItemClick` | `function` | 单击项目回调 |
| `onItemDoubleClick` | `function` | 双击项目回调 |
| `onBreadcrumbClick` | `function` | 面包屑点击回调 |
| `onBack` | `function` | 返回上一级 |
| `onRefresh` | `function` | 刷新目录 |
| `defaultLayout` | `string` | 默认视图模式 `'list' \| 'grid'` |

#### State

| 状态变量 | 用途 |
|---------|------|
| `layout` | `string` | 当前视图模式（list / grid） |
| `selectedId` | `string \| null` | 当前选中项 ID |

---

## 5. 函数调用链

### 5.1 应用启动链

```
用户点击桌面图标 Shortcut
  -> DeskBook.handleStartApp(pid)
    -> DeskBook.handleFocus(pid)          // 提升 z-index
    -> useKernel.startApp({ pid })         // 通知内核启动应用
      -> kernel 启动 Worker 进程
      -> Worker 回传 state 更新
      -> DynamicRenderer 编译资源代码
      -> AppInternalRenderer 渲染 UI
```

### 5.2 应用关闭链

```
用户点击窗口关闭按钮 (HorizontalRuleIcon)
  -> ProcessWindow.handleClose()
    -> kernel.saveWindowState(pid, rect)   // 持久化窗口位置
    -> DeskBook.handleColseApp(pid)
      -> kernel.hibernate(pid)            // 休眠进程
      -> 清理 zOrders / currentFocus
```

### 5.3 应用强制终止链

```
用户点击窗口终止按钮 (CloseIcon)
  -> ProcessWindow headerFuncs[close].onClick()
    -> DeskBook.handleForceKill(pid)
      -> kernel.forceKillProcess(pid)      // 强制杀进程
      -> 清理 zOrders / currentFocus
```

### 5.4 错误恢复链

```
应用渲染抛出异常
  -> ErrorBoundary.componentDidCatch()
    -> 错误节流检查 (5s 内去重)
    -> retryCount <= 3: reStartApp (软重启, 指数退避)
    -> retryCount === 4: forceReStartApp (硬重启)
    -> retryCount > 4: 展示最终错误 UI
```

### 5.5 窗口调度中心链

```
Ctrl+Alt+C
  -> DeskBook.handleGlobalKeyDown()
    -> setShowWindowSwitcher(true)
    -> setSelectedWindowIndex(0)
  -> Alt+C / Tab / Arrow 导航
  -> Enter 确认
    -> handleSelectWindow(index)
      -> handleStartApp(pid)
      -> closeWindowSwitcher()
```

### 5.6 桌面图标拖拽链

```
用户拖拽图标
  -> handleDragStart(e, pid)               // 设置 dataTransfer
  -> handleDragOver(e, row, col)          // 高亮目标格
  -> handleDrop(e, targetRow, targetCol)
    -> 读取 sourcePid
    -> 检查目标位置是否已有应用
      -> 有：交换位置
      -> 无：直接放置
    -> setAppPositions()                   // 更新位置映射
    -> useEffect 触发 setLayout(userId, appPositions)  // 写 VFS 布局文件（防抖 800ms）
```

### 5.7 资源编译与渲染链

```
DynamicRenderer.effect (依赖 resource + iframeMountNode)
  -> 判定沙箱模式 (isParasitism / useBridgeMode)
  -> 确定 JS 执行上下文 (window / ghostSandbox / iframeContentWindow)
  -> compileAndRun(code)
    -> compileSourceAsync({sourceCode, pid, targetFunctionConstructor, module, precompiled, …}, options)   // 单一对象入参，见 renderWindow.js:124-127
    -> factory.call(sandboxWin, mod, exports, instanceSDK, moduleRegistry, key, moduleKeys)  // 在沙箱中执行；mod 先登记再求值，循环依赖拿半成品导出
  -> setModules(resultMap)
  -> combinedCss = scopeCss(modules.style, pid)   // CSS 作用域隔离
  -> 渲染 AppInternalRenderer (通过 createPortal 或直接渲染)
```

---

## 6. 模块间依赖关系

### 6.1 内部依赖（deskBook 模块内）

```
deskBook/layout.jsx
  ├── deskBook/boot/layout.jsx           (Boot)
  ├── deskBook/shortcut/layout.jsx       (Shortcut)
  ├── deskBook/statusBar/layout.jsx      (StatusBar)
  ├── deskBook/window/layout.jsx         (ProcessWindow)
  │   └── deskBook/window/process/layout.jsx  (DynamicRenderer)
  └── deskBook/customApp/layout.jsx      (CustomApp)
```

### 6.2 外部依赖

| 依赖来源 | 导入项 | 使用位置 |
|---------|--------|---------|
| `@/sukinos/hooks/useKernel` | `useKernel` | DeskBook |
| `@/sukinos/hooks/useProcessBridge` | `useProcessBridge` | ProcessWindow |
| `@/sukinos/hooks/useWindowInteraction` | `useWindowInteraction` | ProcessWindow |
| `@/sukinos/hooks/useFileKernel` | `useFileKernel` | CustomApp |
| `@/sukinos/hooks/usePersonalization` | `usePersonalization` | DeskBook |
| `@/sukinos/middleware/VfsImage/main.jsx` | `VfsImage` | DeskBook, Shortcut, StatusBar, ProcessWindow |
| `@/component/contextMenu/layout.jsx` | `ContextMenu` | DeskBook |
| `@/component/confirm/layout` | `confirm` | DeskBook |
| `@/component/alert/layout` | `alert` | DeskBook |
| `@/sukinos/store` | `selectorSetting, selectGenerateApp` | DeskBook |
| `@/sukinos/utils/config` | `WindowSize, SUKIN_EXT, SUKIN_PRE, ENV_KEY_*`, `appCustomMapper`, `appCustom`, `FileType` | 多处 |
| `@/sukinos/resources/sdk` | `createSdkForInstance` | DynamicRenderer |
| `@/sukinos/utils/process/renderWindow` | `compileSourceAsync, scopeCss` | DynamicRenderer |
| `@/sukinos/utils/process/styleSyncHub` | `registerSandboxDoc` | IframeSandbox |
| `/utils/js/classcreate` | `createNamespace` | 所有组件 (BEM 命名) |
| `/utils/js/func/data/exChangeBase64` | `dataToBase64Mapper` | CustomApp |
| `react-redux` | `useDispatch, useSelector` | DeskBook |
| `@emotion/cache, @emotion/react` | `createCache, CacheProvider` | DynamicRenderer (IframeStyleProvider) |
| `@mui/icons-material` | `CloseIcon, CodeIcon, FullscreenIcon`, `FullscreenExitIcon`, `HorizontalRuleIcon`, `SearchIcon`, `FileUploadIcon`, `DeleteIcon`, `PhotoLibraryIcon` | StatusBar, ProcessWindow, CustomApp |

### 6.3 外部引用 deskBook 的模块

以下模块导入了 deskBook 中的子组件或使用了相关功能：

- 无其他模块直接导入 deskBook 内部组件（deskBook 作为顶层桌面容器由系统入口渲染）

### 6.4 依赖关系总图

```mermaid
graph LR
    subgraph deskBook 模块
        DB["DeskBook"]
        BT["Boot"]
        SC["Shortcut"]
        SB["StatusBar"]
        PW["ProcessWindow"]
        DR["DynamicRenderer"]
        CA["CustomApp"]
    end

    subgraph Hooks
        UK["useKernel"]
        UPB["useProcessBridge"]
        UWI["useWindowInteraction"]
        UFK["useFileKernel"]
        UP["usePersonalization"]
    end

    subgraph 公共组件
        VI["VfsImage"]
        CM["ContextMenu"]
        CF["confirm / alert"]
    end

    subgraph 工具
        CFG["config 常量"]
        SDK["createSdkForInstance"]
        RW["compileSourceAsync"]
        SSH["styleSyncHub"]
        CL["createNamespace"]
    end

    subgraph 外部库
        RR["react-redux"]
        EM["@emotion"]
        MUI["@mui/icons"]
    end

    DB --> BT
    DB --> SC
    DB --> SB
    DB --> PW
    DB --> CA
    PW --> DR

    DB --> UK
    PW --> UPB
    PW --> UWI
    CA --> UFK
    DB --> UP

    DB --> VI
    SC --> VI
    SB --> VI
    PW --> VI
    DB --> CM
    DB --> CF

    DB --> CFG
    DR --> SDK
    DR --> RW
    DR --> SSH
    BT --> CL
    SC --> CL
    SB --> CL
    PW --> CL
    CA --> CL
    DB --> RR
    DR --> EM
    SB --> MUI
    PW --> MUI
    CA --> MUI
```

---

## 7. 全局快捷键汇总

| 快捷键 | 功能 | 处理位置 |
|--------|------|---------|
| `Ctrl+Alt+C` | 切换窗口调度中心（Switcher） | DeskBook.handleGlobalKeyDown |
| `Ctrl+Alt+O` | 切换状态栏显隐 | DeskBook.handleGlobalKeyDown |
| `Ctrl+R` | 软刷新桌面布局和配置（需确认） | DeskBook.handleGlobalKeyDown |
| `Alt+C`（Switcher 开启时） | 快速轮询切换窗口 | DeskBook.handleGlobalKeyDown |
| `Tab / ArrowRight / ArrowLeft`（Switcher 内） | 导航选择窗口 | DeskBook.handleGlobalKeyDown |
| `Enter`（Switcher 内） | 确认选择 | DeskBook.handleGlobalKeyDown |
| `Escape`（Switcher 内） | 关闭 Switcher | DeskBook.handleGlobalKeyDown |

> iframe 内部的按键事件通过 `postMessage` 转发回父窗口处理，解决跨域焦点丢失问题。

---

## 8. 数据持久化

桌面布局已不再是 localStorage 键，只有状态栏开关还留在 localStorage。

| 数据 | 存储位置 | 键/结构 | 写入时机 |
|------|---------|---------|---------|
| 桌面图标位置 | **VFS 文件 `deskbook-layout.json`**（底层是 `SUKIN_OS_VFS` IndexedDB），根目录下由系统预置 | `{ [userId]: { [pid]: "row-col" } }`，所有用户共用一个文件 | `appPositions` 变化时 + 页面卸载时，经防抖 800ms 落盘 |
| 状态栏显隐 | `localStorage` | `deskbook-show-status`（字符串化的布尔值） | 切换时立即写（`deskBook/layout.jsx:343`），启动时读（`:571`） |

布局读写集中在 `useDeskLayout`（`src/sukinos/hooks/useDeskLayout.js`）：

- 文件名常量 `DESK_LAYOUT_FILENAME = 'deskbook-layout.json'`（`config.js:401`），并在 `preSystemConfigFiles`（`config.js:402-408`）里登记，挂载时若不存在自动写入默认 `{}`
- 模块级缓存 `layoutCache` + `layoutFileId`，所有 Hook 实例共享，避免重复读盘与重复查找文件 id（`useDeskLayout.js:9-11`）
- `getLayout(userId)` 只返回该用户那一层；`setLayout(userId, positions)` 先合并进全量对象再 `setTimeout(..., 800)` 写盘（`:53-72`），文件已被误删时走 `fs.writeFile` 重建
- 读盘走 `fs.readdir('root')` + `fs.readFile`，写盘走 `fs.updateContent`；文件系统未就绪时先 `fs.boot()`（`:13-15`）

双重保障仍然成立：`useEffect` 监听 `appPositions` 变化实时调用 `setLayout`（`deskBook/layout.jsx:463-467`），`beforeunload` / `pagehide` 兜底用 `appPositionsRef` 再写一次（`:541-545`、`:583-585`，用 `pagehide` 替代已弃用的 `unload`）。

> 一个已知取舍：`setLayout` 的落盘是 800ms 防抖，卸载时那次调用只保证把最新值合进 `layoutCache`（同步），磁盘写入仍要等定时器。连续拖拽后立刻刷新，理论上存在最后一次写入不生效的窗口；`beforeunload` 的确认弹窗（`:547-549`）在实践中给了定时器留出时间。

## 9. GPU/渲染性能优化措施

### 9.1 窗口 CSS 优化（window/style.module.css）

| 优化项 | 说明 |
|--------|------|
| 隐藏窗口移出渲染树 | `.su-window:not(.is-active)` 同时给 `display: none !important` 与 `contain: strict`，既防样式重算穿透隐藏子树，也防隐形盒子在 body 上拦截悬停（`:24-28`） |
| `backdrop-filter` 仅焦点窗口 | `.is-focused` 才带 `backdrop-filter: var(--su-os-backdrop, none)`，非焦点窗口不触发 GPU 密集型模糊滤镜（`:30-36`） |
| GPU 层仅焦点窗口 | `transform: translateZ(0)` 写在 `.is-focused` 内而非 `.su-window` 基类，非焦点窗口无合成层 |
| `containIntrinsicSize` | 隐藏窗口内联 `content-visibility: hidden` + `containIntrinsicSize: 500px 400px`（`window/layout.jsx:246-247`），恢复时避免 Layout 重算 |
| 非焦点阴影简化 | `.is-active:not(.is-focused)` 仅 `box-shadow: 0 1px 4px`，焦点窗口保留完整双层阴影（`:38-41`） |

> 这里没有 `isolation: isolate`。基类 `.su-window` 只设 `overflow: hidden` 与背景/边框，层叠上下文由 `.is-focused` 的 `translateZ(0)` 创建。

### 9.2 Resize Handle 聚焦门控（已停用）

- 8 个 resize handle 由 `renderResizeHandles()` 生成，渲染条件是 **`!showWindowSwitcher`**（`window/layout.jsx:302`），即调度中心开启时整批不渲染，平时全部渲染
- 曾经的"仅焦点窗口渲染"门控（`if (!isFocused) return null`）已被注释回退（`:203-208`）。原因写在注释里：保持全显示与 focus→显示两种做法都会出现判断问题——focus 切换时会出现多窗口交互串扰，需要对事件监听补 DOM 确定性比较，因此暂时回调
- 因此**不要再按"非焦点窗口省 140 个 DOM 节点"理解当前实现**；后台窗口的节点节省来自 §9.5 的自适应挂载占位
- 非焦点窗口点击边缘依旧可用：容器 `onMouseDown` 先跑 `handleEdgeMouseDown(e)` 计算方向并聚焦，未被 `preventDefault` 才继续 `onFocus(pid)`（`:231-235`）

### 9.3 useProcessBridge 条件订阅（hooks/useProcessBridge.jsx）

```javascript
useProcessBridge(pid, { isVisible, backgroundSleep })
```

- 当 `backgroundSleep === true && !isVisible` 时完全跳过 `kernel.subscribeApp`，零开销（`useProcessBridge.jsx:24-26`）
- 后台静默窗口的 worker 状态变更完全跳过：反序列化 → RAF 调度 → setState → memo 比较链条
- 首次挂载与恢复订阅时都从 `kernel.getCachedState(pid)` 拉最新缓存状态（`:6-11` 初始化、`:29-32` 订阅前补一帧），该 accessor 内部读的正是 `commHub.stateCache`
- `backgroundSleep` 取自 `app.metaInfo.custom.backgroundSleep === true`（严格等于 true 才生效，`window/layout.jsx:30-33`）

### 9.4 标题栏渲染与 hideHeader（window/layout.jsx）

标题栏不再按焦点与否裁剪图标：`headerFuncs`（`:194-199`）只有一处条件——`exposeState` 决定是否加 CodeIcon，其余三个（`HorizontalRuleIcon` 最小化、`ScreenIcon` 最大化/还原、`CloseIcon` 强杀）无条件渲染。过去"非焦点窗口仅渲染 CloseIcon"的做法已不存在。

真正的节省来自整条标题栏的条件渲染：

| 配置 | 效果 | 代码位置 |
|------|------|---------|
| `metaInfo.hideHeader = true` | header 整块不渲染（连 DOM 都没有），窗口操作交给应用自己 | `:256`（渲染守卫）、`:251`（hover 触发条也随之不渲染）、`:223`（`is-hide-header` 类名） |
| `metaInfo.custom.hideHeaderHover = true` | header 仍在 DOM，靠 CSS 上移隐藏，鼠标悬停经 `.su-window__hover-trigger` 唤回 | `:223`、`:251-253` |
| 调度中心开启（`showWindowSwitcher`） | header 内联 `display: none`，避免调度模式下抢交互 | `:262` |

`hideHeader` 与 `hideHeaderHover` 互斥：`customConfig` 解析时只要 `hideHeader` 为真，`hideHeaderHover` 被强制为 `false`（`:36-47`）。应用要能自己关窗口，必须拿到 `AppSDK.API.window`（由 `windowControls` 透传，见 §4.5 与 `03-resources.md` 的 SDK 章节）。

### 9.5 自适应挂载（AdaptiveWindowPlaceholder）

- 组件位置：`src/sukinos/deskBook/AdaptivePlaceholder.jsx`（不在 `window/` 下），渲染体只有一个 `<div style="position:absolute; display:none; pointerEvents:none" data-placeholder="true">`，零 iframe / 零 header / 零 resize handles
- **`adaptiveMount` 默认为开**：判定式是 `custom.adaptiveMount !== false`（`deskBook/layout.jsx:737`），只有显式写 `false` 才关闭
- 启用条件三连：`!isVisible && useAdaptive && !showWindowSwitcher`（`:740`）——调度中心开启期间一律渲染完整窗口，避免预览丢失
- 唤醒时序：`onFocus(pid)` → 父组件状态更新 → 占位移除、完整 `ProcessWindow` 挂载 → `useProcessBridge` 从 `kernel.getCachedState(pid)` 恢复状态 → 窗口出现在上次位置

### 9.6 useDeferredValue 优先渲染（deskBook/layout.jsx）

- 对 `zOrders` 与 `currentFocus` 使用 `useDeferredValue`（`:137-138`），传给窗口的 `zIndex` 与 `isFocused` 都取 deferred 值（`:760`、`:768`）
- 焦点窗口渲染优先级高于非焦点窗口，非焦点窗口更新可被高优先级交互打断

### 9.7 memoEqual 精简（window/layout.jsx:316-327）

- 从 17 个 prop 比较精简至 8 个（pid, zIndex, isShow, isDisplay, exposeState, showWindowSwitcher, isSelected, isFocused）
- 父组件通过 `useRef`/`useCallback` 稳定化的回调引用（onFocus, onClose, onKill 等）不再参与比较

### 9.8 LRU 自动休眠（deskBook/layout.jsx）

- 配置源：`generateAppSetting.maxWindows`（Redux）?? `personalConfig.maxWindows`（Personalization）?? `10`（`:201`）
- 开关：`generateAppSetting.workerLRU !== false && personalConfig.workerLRU !== false`（`:202`）——两处任意一处显式设为 `false` 即关闭，默认开
- 超出上限时按 `zOrders` 升序淘汰最旧的非焦点窗口，且要求已有 `currentFocus`（`:203`）
- 配 `backgroundSleep` 的应用额外停止 `useProcessBridge` 订阅（见 §9.3）

### 9.9 StyleSyncHub 样式同步（utils/process/styleSyncHub.js）

| 说明 | 详情 |
|------|------|
| 同步范围 | 所有已注册的 iframe doc 统一接收实时样式写入 |
| 写入策略 | 每次 `flushAll` 都读取最新 CSS 规则并通过 `el.textContent !== css` 比对后写入 |
| 注册 API | `registerSandboxDoc(doc)` — 注册后立即同步并持续跟踪 |
| 节流 | `flushAll` 经 `requestAnimationFrame` 调度（`styleSyncHub.js:75`） |
| ThemeObserver 同步范围 | 同步所有 `targetDocs` 的 `<html>` 类名 |

### 9.10 桌面 Filter 过渡（deskBook/layout.jsx）

- 调度中心开启时网格容器内联 `filter: blur(8px) brightness(0.65)`，关闭时为 `none`（`:719-724`）
- 该内联 filter **没有配套 transition**，是硬切换；`deskBook/style.module.css` 里的 `transition` 属于快捷方式容器与背景色等其他选择器

### 9.11 Iframe 可见性解绑（deskBook/window/process/layout.jsx）

- `IframeSandbox` 接收 `isVisible` prop（默认 `true`，`:499`），非可见时 `return isVisible ? (...) : null`（`:640`）——iframe 从 DOM 完全移除
- 自身的 memo 比较把 `isVisible` 纳入（`:649`），因此显隐变化一定会重新求值
- 恢复可见时通过 `handleIframeMount` 重建 iframe → `iframeMountNode` 变更触发重新编译 → 从 `kernel.getCachedState(pid)` 恢复状态
- 物理沙箱模式下，隐藏窗口的 iframe 不再占用渲染管线内存

### 9.12 非焦点 State 跳帧节流（hooks/useProcessBridge.jsx）

- 非可见且未开后台静默的窗口（`!isVisible && !backgroundSleep`）每 3 帧才处理一次 Worker state 更新（`:39-42`），跳过中间帧
- `backgroundSleep` 窗口完全不订阅（零开销），非可见普通窗口降低主线程压力约 2/3
- 每次订阅内的更新仍经 `requestAnimationFrame` 对齐再 `setState`（`:43-48`），卸载时取消挂起的帧（`:54-56`）

### 9.13 性能监控指南

```javascript
// DevTools Performance 面板
// 1. 录制 15+ 窗口场景下的 Layout/Recalculate Style 时长
// 2. 监控 FPS：拖拽窗口时是否保持 60fps
// 3. GPU 层：DevTools Layers 面板验证合成层数量

// 验证项目
// - 内存：20 窗口场景下 iframe 是否回落至 maxWindows 上限
// - LRU：打开 15 窗口，观察最旧的 5 个非焦点窗口是否自动休眠
// - backgroundSleep：隐藏窗口的 Worker 线程是否停止状态推送
// - adaptiveMount：非可见窗口 DOM 里是否只剩 data-placeholder 占位 div
// - hideHeader：无标题栏应用能否经 AppSDK.API.window 关窗/休眠
// - styleSyncHub：样式同步覆盖所有 iframe
```
