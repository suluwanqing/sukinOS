# SukinOS

**基于 React + Web Worker + IndexedDB **
> **核心理念**: 全量state驱动更新组件,趋于类微前端,热插拔可持久化视窗APP交互体验。
> **注意**：代码逻辑完整，适合作为学习 React 复杂状态管理、浏览器本地存储应用及 Web OS 架构的参考案例。
> 如果您希望实时体验最新版本请访问 sukin.top/sukinos ---- [if you want get the latest ,To: sukin.top/sukinos]


## 项目简介与核心价值

**SukinOS** 是一个在浏览器中运行的轻量级桌面环境。它不依赖传统后端，而是利用现代浏览器的能力（IndexedDB, Service Worker, Web Worker）来模拟完整的操作系统上层的体验。与常规的后台管理系统不同，SukinOS 采用了**窗口化多任务**的设计模式，支持应用程序的动态加载、文件系统的本地持久化存储以及代码的在线编译运行。

###  核心价值
- **去中心化体验**：数据完全存储在用户浏览器本地。
- **高性能运行时**：耗时任务通过 Web Worker 隔离，不阻塞 UI 线程。
- **高扩展性**：基于组件化的 App 设计，易于集成新的“应用程序”。
- **多种模式**:支持iframe,单iframe,noWorker
## 项目文档

```text
docs/
├── diagrams/      # 项目图表（如架构图、业务流程图、数据流图等）
├── module/        # 核心模块的技术文档与详细设计方案
└── screenshot/    # APP 实际运行截图及界面预览
```
- 流程图 - 请参考`diagrams`
- 模块文档 - 请参考`module`
- 实机截屏 - 请参考 `screenshot`

## 技术栈与目录架构

###  技术栈详情

| 维度 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **视图层** | React 19 | 使用 Hooks 进行函数式组件开发 |
| **样式层** | CSS Modules | 避免样式冲突，实现模块化样式管理 |
| **构建工具** | Vite | 极速冷启动与热更新 |
| **存储层** | IndexedDB | 浏览器端的大容量结构化数据存储 |
| **异步处理** | Web Worker | 开启多线程处理耗时逻辑 |
| **编译器** | Babel | 浏览器端 JS/JSX 代码动态转译 |
| **离线支持** | Service Worker | PWA 基础支持 |

###  项目目录

```bash
src/sukinos/
├── component/        # 【UI组件库】系统基础控件 (alert, confirm 等)
├── main/             # 【系统入口】桌面环境主逻辑、登录页面
│   ├── deskBook/
│   └── login/
├── resources/        # 【资源层】内置系统应用 (预设应用资源)
├── utils/            # 【工具层】
│   ├── file/         # VFS与实体文件内核封装类
│   └── process/      # 内核进程与沙箱调度管理
├── hooks/            # 【逻辑复用】OS交互Hooks (useFileSystem, useKernel等)
├── store.jsx         # 【状态管理】全局红黑树、Context/Reducer配置
└── router/main.jsx   # 【路由配置】基于系统调度的非传统虚拟路由
```


###  四大缝合原理机制

这套纯前端的底层模拟机制解决了浏览器常规实现桌面操作系统多视窗高频拖拽的失帧与卡顿问题：

#### A. 物理坐标缝合 (Coordinate Stitching)
*   **现象**：拖拽开启时如果基于 React 更新引发重渲染获取坐标（或 `getBoundingClientRect` 提取带偏移状态的 left），会发生拖拽错位脱手。
*   **解决**：放弃基于中间层通信的同步查询，通过 `window.getComputedStyle(el)` 发动物理样式底层探针。由于计算结果只产生稳定的文档流动基础数据，完全剔除了瞬时 `transform` 余波对偏移量造成的干扰归一化，实现稳固接管。

#### B. 事件流缝合 (Event Stitching)
*   **现象**：快速位移或缩放窗口时，因为光标进入到了 Iframe 内（跨越了全局 DOM 管辖区），导致主页级的 `mousemove` 和拖拽动作意外中断流产（事件失水）。
*   **解决**：基于钩子的交互前拦截 `prepareForInteraction`，触发一瞬间设置 `iframe.style.pointerEvents = 'none'`，使得子沙箱从事件点击面上瞬间“透明化存在”，宿主可无缝承接所有外发事件流而不产生切割吞噬效应，结束时回调复原。

#### C. 渲染层缝合 (Render Stitching)
*   **现象**：沙箱层内存在大量 UI DOM，任意一次外窗口的改动哪怕只是位移，都将引发 DOM 上推重排重画，渲染瓶颈在多任务下被指数放大性能震荡。
*   **解决**：在宿放层容器应用 `contain: layout style` 以及在其子级限制严格范围 (`contain: strict`)。由浏览器级底层开启图形加速封闭盒子，阻断一切在沙箱内部发起的变更向上影响宿主树，把绘图区域独立切分，消除了布局反噬计算的极大系统开销。

#### D. 物理化缝合 (Solidification)
*   **实质**：虽然基于纯位移属性能够变动窗口布局坐标系（影响 Redux），但不具备 GPU 硬件图层升维加速功能；如果仅提供加速属性，系统又由于 React 更新周期机制产生断层和重影。
*   **解决**：在 `useWindowInteraction` 的设计中采取双轨模式，鼠标滑动期间使用合成渲染接口的 `translate3d`，在操作结束后（MouseUp）由计算差值再物理固化回最基础的 CSS (`left/top`) 并落库 `saveWindowState`。这提供了高频的纵享丝滑交互，与稳定持久化的完美结合。
