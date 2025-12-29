# SukinOS 

**基于 React + Web Worker + IndexedDB 的 Web 端桌面操作系统模拟框架。**

> **注意**：本项目暂时停止更新。代码逻辑完整，适合作为学习 React 复杂状态管理、浏览器本地存储应用及 Web OS 架构的参考案例。
>  如果您希望实时体验最新版本请访问sukin.top/admin/deskbook----[if you want get the latest ,To:   sukin.top/admin/deskbook]

---

## 项目简介

**SukinOS** 是一个在浏览器中运行的轻量级桌面环境。它不依赖传统后端，而是利用现代浏览器的能力（IndexedDB, Service Worker, Web Worker）来模拟完整的操作系统体验。

与常规的后台管理系统不同，SukinOS 采用了**窗口化多任务**的设计模式，支持应用程序的动态加载、文件系统的本地持久化存储以及代码的在线编译运行。

### 核心价值
- **去中心化体验**：数据完全存储在用户浏览器本地。
- **高性能运行时**：耗时任务（如代码编译）通过 Web Worker 隔离，不阻塞 UI 线程。
- **高扩展性**：基于组件化的 App 设计，易于集成新的“应用程序”。

---

## 架构逻辑解构 (Architecture & Logic)

为了深入理解本项目，我们将系统逻辑解构为以下三个核心层级：

### 1. 核心层 (Kernel / State Management)
*位于 `src/store.jsx` 与 `src/main`*
系统通过 React 的全局状态（Context/Store）模拟了操作系统的“内核”功能：
- **进程管理**：维护一个 `apps` 队列，记录当前打开的窗口、Z-Index 层级、最小化/最大化状态。
- **任务调度**：通过路由和状态分发，控制前台应用（Active Window）的聚焦逻辑。
- **消息总线**：实现了简单的事件机制，允许 App 之间通信（例如：文件管理器点击文件 -> 触发编辑器打开）。

### 2. 文件系统层 (File System / VFS)
*位于 `src/utils` 与 `src/resources`*
为了模拟真实的磁盘操作，项目封装了 **IndexedDB**：
- **虚拟文件树**：将 IndexedDB 的对象存储（Object Store）映射为树状目录结构。
- **持久化**：用户的设置、保存的代码文件、桌面布局均保存在浏览器本地，刷新页面不丢失。
- **资源管理**：图片、图标等静态资源支持以 Base64 或 Blob 形式存储和读取。

### 3. 运行时层 (Runtime & Compiler)
*位于 `public` (Workers) 与 `src/hooks`*
- **沙箱执行**：为了安全地运行用户编写的代码，SukinOS 利用 **Babel Standalone** 进行动态编译。
- **Web Worker**：编译过程在 Worker 线程中运行，避免复杂计算导致桌面 UI 卡顿。
- **Service Worker**：拦截网络请求，实现离线访问能力，模拟“本地应用”的感觉。

---

##  主要功能

### 桌面环境
- **完整交互**：包括任务栏、开始菜单、桌面图标拖拽、右键上下文菜单。
- **窗口管理**：支持多窗口重叠、缩放、拖拽、置顶及最小化动画。

### 文件资源管理器
- **可视化操作**：类似 Windows Explorer 的界面，支持新建文件夹、文件重命名、删除。
- **类型识别**：根据文件后缀自动关联打开方式（图片预览、文本编辑）。

### 开发者生态
- **内置 IDE**：支持语法高亮的在线代码编辑器。
- **动态编译**：可以直接在浏览器中编写 React 组件并实时预览渲染结果（通过 Babel 转换）。

###  UI 组件库
- 内置一套与系统风格统一的组件：`Alert`（警告框）、`Confirm`（确认框）、`Check`（选择器）等，位于 `src/component`。

---

## 技术栈详情

| 维度 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **视图层** | React 18 | 使用 Hooks 进行函数式组件开发 |
| **样式层** | CSS Modules | 避免样式冲突，实现模块化样式管理 |
| **构建工具** | Vite | 极速冷启动与热更新 |
| **存储层** | IndexedDB | 浏览器端的大容量结构化数据存储 |
| **异步处理** | Web Worker | 开启多线程处理耗时逻辑 |
| **编译器** | Babel | 浏览器端 JS/JSX 代码动态转译 |
| **离线支持** | Service Worker | PWA 基础支持 |

---

## 目录结构说明

```bash
src/
├── component/        # 【UI组件库】系统基础控件
│   ├── alert/        # 弹窗组件
│   └── ...
├── main/             # 【系统入口】
│   ├── deskBook/      # 桌面环境主逻辑
│   └── login/        # 登录页面
    └── resources/        # 【资源层，主要是系统应用】
├── utils/            # 【工具层】
│   ├── file/        # 文件管理封装类
│   ├── process/        #进程管理
│   └── ...
├── hooks/            # 【逻辑复用】自定义 React Hooks
├── store.jsx         # 【状态管理】全局 Context/Reducer 配置
└── router/main.jsx   # 【路由配置】系统页面路由

## 探索
虽然本项目已暂时停止更新，但对于希望深入研究的开发者，以下是极具潜力的改造方向：
方向一：动态后台管理系统 
目前系统配置是静态硬编码的。可以将其改造为云桌面：
App 市场化：将 App 的代码逻辑从前端解耦，改为从后端 API 动态拉取 JS 模块（Remote Components）
云存储同步：将 IndexedDB 的内容与后端同步，实现“换设备不丢失数据”。
权限控制：根据用户权限，动态下发桌面图标和可用 App。
方向二：Web IDE 增强
利用现有的 Web Worker + Babel 架构，集成 Monaco Editor，打造一个完全运行在浏览器中的 React 游乐场（Playground）

