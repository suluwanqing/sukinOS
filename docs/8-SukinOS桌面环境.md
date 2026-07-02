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

> 桌面 UI 组件的完整 Props/State/方法接口文档、函数调用链、12 项性能优化措施详见 [02-deskbook.md](./module/02-deskbook.md)

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
│   ├── sukinOS/          # 模拟桌面环境
│       ├── about.jsx     # APP 信息
│       ├── home.jsx      # APP 主页
│       ├── layout.jsx    # 布局
│       └── logic.jsx     # 业务逻辑
├── package.json
└── index.html
```

## 八、安全与隔离

SukinOS 实现了多层安全沙箱：PID 命名空间隔离（Storage/IndexedDB）、Fetch 注入、CDN 白名单、Blob 递归沙箱化、API 禁用（eval/Function/XHR/importScripts）、设备屏蔽、SDK 冻结、清理机制。VirtualWorker 还实现了资源追踪注册表，terminate 时强制清理所有 timer/interval/RAF/EventListener 防止 CPU 空转。

> 安全沙箱 8 类策略详解、CDN 白名单列表、Worker 沙箱前导代码、VirtualWorker 资源追踪与清理详见 [05-file-system-tools.md](./module/05-file-system-tools.md)

> VirtualWorker Proxy 代理层、NoWorker sysConfig 注入详见 [07-app-routing.md](./module/07-app-routing.md) §3.3-3.4

## 九、数据持久化

SukinOS 使用 5 个 IndexedDB 数据库实现全量本地持久化：SukinOS_Sys（应用注册表）、SukinOS_Res（资源库）、SUKIN_OS_VFS（虚拟文件系统）、SUKIN_STATE_INSTANCE（实例状态）、sukin_system_app（系统应用数据）。

> 数据库架构详解、VFS Inode 数据模型、三数据库 Mermaid 图详见 [05-file-system-tools.md](./module/05-file-system-tools.md)

> saveState 持久化链（三层存储、写入链路、恢复链路、分裂式清理）详见 [07-app-routing.md](./module/07-app-routing.md) §5

## 十、路由与消息处理

SukinOS 路由是双层架构：外层浏览器级路由（React Router + AuthGuard + RoutePermission），内层 App 级路由（Bundle App 自动注入 vs 系统 App 手动 reducer）。消息处理有三种运行模式差异（RealWorker/VirtualWorker/NoWorker），Dispatch 有双路径（KERNEL_CALL vs UI_ACTION）。

> 路由与消息处理的完整深度解析详见 [07-app-routing.md](./module/07-app-routing.md)

> 浏览器级 AuthGuard 鉴权守卫流程详见 [4-前端模块详解.md](./4-前端模块详解.md)

## 十一、Redux Store 与认证

Redux Store 使用 Redux Toolkit `createSlice`，包含 userInfo/theme/ui/assistant/setting/appStore/fileSystemConfig 7 个域。登录模块支持 3 种业务模式，useAuth Hook 提供完整认证流程，三层权限控制（菜单/路由/APP 注册池）。

> Redux Store 完整状态树、8 个 Reducer + 7 个 Selector、登录模块、useAuth 接口、三层权限控制详见 [06-middleware-login.md](./module/06-middleware-login.md)
