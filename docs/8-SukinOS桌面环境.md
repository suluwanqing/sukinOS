# SukinOS 桌面环境详解

## 一、桌面环境概述

SukinOS 的桌面环境是一个运行在浏览器中的**完整桌面操作系统模拟器**。它具备传统操作系统的主要特征：桌面、窗口管理器、进程管理、应用商店、文件系统等。

### 核心架构

```
┌───────────────────────────────────────────────────────────┐
│                   浏览器 (Browser)                          │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐  │
│  │                 SukinOS 桌面环境                      │  │
│  │                                                      │  │
│  │  ┌───────────────┐    ┌──────────────────────────┐  │  │
│  │  │   桌面 UI      │    │   进程内核 (Kernel)        │  │  │
│  │  │  ┌───────────┐│    │  ┌────────┐ ┌───────────┐│  │  │
│  │  │  │ 窗口管理器  ││    │  │ Lifecycle│ │ Registry  ││  │  │
│  │  │  │ 任务栏     ││    │  │ Messaging│ │ Resource  ││  │  │
│  │  │  │ 状态栏     ││    │  │ CommHub  │ │ Instance  ││  │  │
│  │  │  │ 快捷方式   ││    │  └────────┘ └───────────┘│  │  │
│  │  │  └───────────┘│    └──────────────────────────┘  │  │
│  │  └───────────────┘                                   │  │
│  │                                                      │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │         内置应用系统 (Resources)                │   │  │
│  │  │  商店 │ 开始 │ 设置 │ 开发者中心 │ 文件管理      │   │  │
│  │  │  记事本 │ 画板 │ 表格 │ 本地开发               │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## 二、桌面 UI 组件

> 桌面 UI 组件的完整 Props/State/方法接口文档、函数调用链、性能优化措施（`02-deskbook.md` §9 共 12 项，其中 §9.2 的 resize handle 聚焦门控已停用）详见 [02-deskbook.md](./module/02-deskbook.md)

### 2.1 布局 (`sukinos/layout.jsx`)

桌面整体布局分为三层：

```
┌─────────────────────────────────────────────────────┐
│                  窗口管理区域                           │
│  (多个应用窗口叠加，支持拖拽/缩放/最小化/关闭)           │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  APP A   │  │   APP B     │  │    APP C      │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────┤
│  开始菜单 │ 任务栏 (窗口列表)           │ 状态栏(时间)  │
└─────────────────────────────────────────────────────┘
```

### 2.2 窗口管理器 (`deskBook/window/`)

**功能特性**：
- **拖动**：鼠标拖拽窗口标题栏移动位置
- **缩放**：拖动窗口边框/角调整大小
- **最小化**：窗口缩到任务栏，不销毁进程
- **最大化**：窗口铺满工作区
- **Z-index 管理**：点击窗口自动升到最上层
- **进程绑定**：每个窗口对应一个进程实例

### 2.3 任务栏 (`deskBook/statusBar/`)

- 显示已打开窗口列表，点击切换窗口焦点
- 右侧显示系统时间，与状态栏协同布局

### 2.4 快捷方式 (`deskBook/shortcut/`)

- 桌面图标显示，双击启动应用，支持拖拽排列

### 2.5 启动画面 (`deskBook/boot/`)

- 系统启动时的引导动画，加载资源/初始化内核

## 三、进程内核

> **关于"进程"的说明**：SukinOS 运行在浏览器 JS 环境中，这里的"进程"是**逻辑抽象概念**（模拟操作系统），并非操作系统级进程。每个 APP 的"进程"实际是一个**沙箱实例**，运行在 JS 线程中。根据运行模式不同，底层载体可能是独立 Web Worker 线程（RealWorker）、共享 iframe 沙箱（VirtualWorker）或主线程（NoWorker）。文档中的 `pid`（进程 ID）、`#proc-{pid}`（CSS 作用域前缀）均指这个逻辑进程实例。

进程内核是 SukinOS 的核心调度引擎，采用**微内核 + 沙箱隔离**的设计模式。Kernel 单例内部组合了 10 个子模块（Core/Cache/Flags/Instance/Internals/Lifecycle/Messaging/Registry/ResourceAccess/Settings），通过 CommHub 实现三种通信模式（EventBus/subscribers/topicSubscribers），支持三种运行模式（RealWorker/VirtualWorker/NoWorker）。

> Kernel 完整公共 API、10 个子模块详解、CommHub 消息协议、三种运行模式消息处理差异、5 个核心调用链 Mermaid 图详见 [04-process-kernel.md](./module/04-process-kernel.md)

> 路由与消息处理的深度解析（双层路由体系、Dispatch 双路径、三种 Worker 消息链路）详见 [07-app-routing.md](./module/07-app-routing.md)

### 3.1 核心模块一览

| 模块 | 职责 |
|------|------|
| **Core** | 系统初始化、内核启动、安装队列执行 |
| **Lifecycle** | 进程生命周期：冷启动/休眠恢复/会话恢复保护/跨应用唤起 |
| **Messaging** | 消息分发：KERNEL_CALL 内核拦截 vs UI_ACTION 透传 |
| **Registry** | 双注册表维护（systemApps / userApps Map） |
| **CommHub** | 通信枢纽：状态缓存 + 主题 Pub/Sub + EventBus |

### 3.2 进程生命周期状态机

```
INSTALLED → RUNNING (startProcess 冷启动)
RUNNING → HIBERNATED (hibernate 休眠，Worker 保持热状态)
HIBERNATED → RUNNING (startProcess 唤醒)
RUNNING → INSTALLED (forceKillProcess / forceResetApp)
```

> 状态机完整 Mermaid 图、startProcess 冷启动流程、VirtualWorker/NoWorker 详细机制、evokeApp/restoreSession/forceResetApp 全 API 详解详见 [04-process-kernel.md](./module/04-process-kernel.md) §3.7

## 四、内置应用系统

> 10 个内置应用注册详情、SDK 工厂（devAppSdk/adminAppSdk）、中间件详见 [03-resources.md](./module/03-resources.md)

### 4.1 应用列表

| 应用 | 说明 |
|------|------|
| **APP商店** | 应用浏览/安装/更新 |
| **开始菜单** | 应用启动器 |
| **设置** | 系统/用户/个性化/快捷键设置 |
| **开发者中心** | 在线 IDE、APP 管理 |
| **本地开发** | 本地开发同步工具 |
| **文件管理** | 文件浏览器（含 OPFS） |
| **记事本** | 富文本笔记 |
| **画板** | 绘图 + 思维导图 |
| **表格** | 电子表格 |

## 五、桌面中间件

> InteractiveAwakening 和 VfsImage 的完整 Props/工作流程文档详见 [03-resources.md](./module/03-resources.md) §4

### 5.1 交互唤醒 (`middleware/InteractiveAwakening/`)

检测用户交互行为，唤醒休眠的应用进程，管理屏幕锁定/解锁。

### 5.2 VFS 镜像 (`middleware/VfsImage/`)

虚拟文件系统镜像管理，图标解析优先级与缓存机制。

## 六、Hooks 系统

Hooks 是连接 Redux Store、Kernel 进程内核与 UI 组件的核心桥梁。14 个 Hook 覆盖内核桥接、认证、进程通信、文件系统、窗口交互等全部 UI→底层通道。

> 14 个 Hook 的完整接口文档（参数、内部状态、方法、返回值、订阅机制）、调用链关系图、依赖关系矩阵详见 [01-hooks.md](./module/01-hooks.md)

| Hook | 用途 |
|------|------|
| `useKernel` | 进程内核交互（应用列表、启动/休眠、监听系统事件） |
| `useAuth` | 认证状态检查（登录验证、Session 维护） |
| `useProcessBridge` | 进程桥通信（状态订阅、dispatch、Pub/Sub） |
| `useFileSystem` | 文件系统操作 |
| `useWindowInteraction` | 窗口拖拽/缩放/最大化交互 |
| `usePersonalization` | 个性化/主题配置 |

## 七、本地开发 SDK (`sukinOsLocalDevSDK/`)

独立的本地开发项目，用于在本地开发环境快速预览和测试 SukinOS APP：

```
sukinOsLocalDevSDK/
├── src/
│   ├── main.jsx          # 入口
│   ├── App.jsx           # 根组件
│   └── sukinOS/          # 模拟桌面环境（多文件夹结构）
│       ├── layout.jsx    # 主布局（相对导入 Sidebar + 副作用导入 global.css）
│       ├── logic.jsx     # 业务逻辑（Reducer，无 export）
│       ├── components/   # 共享组件（具名导出）
│       │   ├── Sidebar.jsx
│       │   ├── Counter.jsx
│       │   └── ui/
│       │       ├── Button.jsx
│       │       └── Button.module.css   # CSS Modules
│       ├── pages/        # 路由页面（export default）
│       │   ├── home/index.jsx
│       │   ├── about/index.jsx
│       │   └── contact/index.jsx
│       ├── styles/
│       │   └── global.css               # 全局样式（副作用导入）
│       └── utils/
│           └── format.js                # .js 工具模块（具名 + 默认导出）
├── package.json
└── index.html
```

> 该示例演示了非系统 APP 的**多文件夹组织**与**相对路径导入**：`layout.jsx` 通过 `import { Sidebar } from './components/Sidebar'` 导入共享组件，通过 `import './styles/global.css'` 副作用导入全局样式；`pages/home/index.jsx` 通过 `import { Counter } from '../../components/Counter'` 跨文件夹导入组件，通过 `import { formatCount } from '../../utils/format'` 导入 `.js` 工具模块。

## 八、安全与隔离

SukinOS 实现了多层安全沙箱：PID 命名空间隔离（Storage/IndexedDB）、Fetch 注入、CDN 白名单、Blob 递归沙箱化、敏感 API 代理（`eval`/`XMLHttpRequest`/`importScripts` 一律禁；`Function` 只在 worker 沙箱放行真实构造器，UI 沙箱仍禁）、受保护属性不可覆写（`set` trap 的 `blockedProps`）、设备屏蔽、SDK 冻结、清理机制。VirtualWorker 还实现了资源追踪注册表，terminate 时强制清理所有 timer/interval/RAF/EventListener 防止 CPU 空转。

> 安全沙箱 8 类策略详解、CDN 白名单列表、Worker 沙箱前导代码、VirtualWorker 资源追踪与清理详见 [05-file-system-tools.md](./module/05-file-system-tools.md)

> VirtualWorker Proxy 代理层、NoWorker sysConfig 注入详见 [07-app-routing.md](./module/07-app-routing.md) §3.3-3.4

## 九、数据持久化

SukinOS 用 5 类 IndexedDB 数据库实现全量本地持久化。其中三类**按用户加后缀**（未登录/游客回落到 `DEFAULT_USER_ID`，登录态变化时 Kernel 整体换库）：`SukinOS_Sys_${userId}`（用户应用注册表）、`SukinOS_Res_${userId}`（应用资源库）、`SUKIN_STATE_INSTANCE_${userId}`（有状态实例，如文件句柄）；另外两类是固定名：`SUKIN_OS_VFS`（虚拟文件系统，全局唯一，不带用户后缀）和 `sukin_system_app`（系统应用自己的业务数据，如 boards/mindmaps/sheet，见 `utils/_db.js`）。

旧文档里写作 `SukinOS_Sys` / `SukinOS_Res` / `SUKIN_STATE_INSTANCE` 的裸名已不存在——它们只是工厂函数 `createSysDbConfig(userId)` / `createResDbConfig(userId)` / `createInstanceDbConfig(userId)` 产出名字时的前缀（`config.js:102-137`）。

> 数据库配置表（§3.2）、VFS Inode 数据模型（§1.2）、模块关系总览图（§6）详见 [05-file-system-tools.md](./module/05-file-system-tools.md)

> saveState 持久化链（三层存储、写入链路、恢复链路）详见 [07-app-routing.md](./module/07-app-routing.md) §5。注意清理是**整体置 null**：曾实现过"只清 `app` 保留 `window`"的分裂式清理，提交 `cb49e72` 已回退，窗口几何靠 `saveWindowState` 的 `{...prevSavedState, window}` 增量维护。

## 十、路由与消息处理

SukinOS 路由是双层架构：外层浏览器级路由（React Router + AuthGuard + RoutePermission），内层 App 级路由（Bundle App 自动注入 vs 系统 App 手动 reducer）。消息处理有三种运行模式差异（RealWorker/VirtualWorker/NoWorker），Dispatch 有双路径（KERNEL_CALL vs UI_ACTION）。

> 路由与消息处理的完整深度解析详见 [07-app-routing.md](./module/07-app-routing.md)

> 浏览器级 AuthGuard 鉴权守卫流程详见 [4-前端模块详解.md](./4-前端模块详解.md)

## 十一、Redux Store 与认证

Redux Store 使用 Redux Toolkit `createSlice`，包含 userInfo/theme/ui/assistant/setting/appStore/fileSystemConfig/routePermissions 8 个域。登录模块支持 3 种业务模式，useAuth Hook 提供完整认证流程，三层权限控制（菜单/路由/APP 注册池）。

> Redux Store 完整状态树、10 个 Reducer + 9 个 Selector、登录模块、useAuth 接口、三层权限控制详见 [06-middleware-login.md](./module/06-middleware-login.md)
