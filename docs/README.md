# docs 索引

本目录同时存在**两套手册**，视角不同、不要混用：

| 体系 | 位置 | 视角 | 何时读 |
|------|------|------|--------|
| 产品级说明 | `docs/1-*.md` ~ `docs/8-*.md` | 整个产品：前端 + FastAPI 后端 + 权限/认证 + 数据库 | 第一次接触项目、需要端到端链路 |
| 源码级模块手册 | `docs/module/00-*.md` ~ `08-*.md` | **逐文件/逐函数**，每条结论带 `文件:行号` | 改前端源码前定位实现真相 |

两套内容有重叠，**冲突时以 `module/` 为准**（它随代码同步维护，且被静态校验脚本按行号断言）；产品级文档主要负责后端与整体叙事。

## 阅读路径

- **新人上手**：`1-项目概述` → `2-系统架构` → `module/00-overview`（模块地图 + 附录 A/B/C/D）→ 按要改的层挑 `module/01-08`
- **写/调 SukinOS 应用**：`module/08-development`（开发指南，含入口配置、metaInfo 全字段、发布四面板）→ `module/07-app-routing`（路由与消息）→ `module/04-process-kernel`（内核 API 与沙箱）
- **排查"逻辑跑不起来/视图渲染错"**：`module/04` 的解析与分层层（预编译、`sourceMapper`、`assertLayering`）→ `module/03-resources`（ENV_KEY_* 与 SDK 交付）
- **后端/数据**：`3-后端模块详解` → `7-数据库设计` → `module/00-overview` 附录C（11 张表口径）→ `docs/sql/`
- **安全**：`5-权限体系详解` → `6-认证流程详解` → `module/05-file-system-tools` §2（沙箱按 `envType` 放行的真实口径）

## 目录内容

### 产品级（`docs/`）

| 文件 | 定位 |
|------|------|
| [1-项目概述.md](./1-项目概述.md) | 项目背景、技术选型、功能范围 |
| [2-系统架构.md](./2-系统架构.md) | 前后端整体架构与分层 |
| [3-后端模块详解.md](./3-后端模块详解.md) | FastAPI 分层、路由、服务层 |
| [4-前端模块详解.md](./4-前端模块详解.md) | 前端总体结构（细粒度版见 `module/`） |
| [5-权限体系详解.md](./5-权限体系详解.md) | 三层权限（后端 RBAC + 前端应用层） |
| [6-认证流程详解.md](./6-认证流程详解.md) | JWT 双 Token、验证码、限流与防重放 |
| [7-数据库设计.md](./7-数据库设计.md) | 表结构与 ER（MySQL，11 张表） |
| [8-SukinOS桌面环境.md](./8-SukinOS桌面环境.md) | 桌面前端的叙事版说明 |
| [系统实现与测试报告.md](./系统实现与测试报告.md) | 交付/验收向的实现与测试汇总（`.docx` 由 `generate_word.py` 生成） |

### 模块级（`docs/module/`）

| 文件 | 定位 |
|------|------|
| [00-overview.md](./module/00-overview.md) | 总览 + 附录A（mermaid 图索引）/B（模块文档索引）/C（后端 11 表）/D（API 路由） |
| [01-hooks.md](./module/01-hooks.md) | 14 个 Hook 的接口、调用链与依赖矩阵 |
| [02-deskbook.md](./module/02-deskbook.md) | 桌面环境：8 个组件、窗口交互、持久化、性能措施 |
| [03-resources.md](./module/03-resources.md) | 资源与应用层：ENV_KEY_* 协议、SDK 双权限、内置应用 |
| [04-process-kernel.md](./module/04-process-kernel.md) | 进程内核：Kernel API、CommHub、10 子模块、Worker 三模式、解析与分层 |
| [05-file-system-tools.md](./module/05-file-system-tools.md) | VFS 两层架构、安全沙箱、系统数据库、通用工具 |
| [06-middleware-login.md](./module/06-middleware-login.md) | 中间件、Redux Store、登录与认证链路 |
| [07-app-routing.md](./module/07-app-routing.md) | 双层路由、三种 Worker 模式的消息链路、Dispatch 双路径、Pub/Sub |
| [08-development.md](./module/08-development.md) | 开发指南：系统/非系统 APP、入口配置、发布面板、热更新、调试 |

### 图（`docs/mermaid/`，23 个 `.mmd`）

编号与 `module/00-overview.md` 附录A 一一对应。**内联 `mermaid` 代码块与 `.mmd` 文件并存**：实测两组之间**没有逐字重复的孪生图**（41 个内联块 × 23 个 `.mmd`，节点标签集合的最大重叠只有 33%，且都是"同一主题的不同视角"而非同一张图的两份拷贝），因此约定是**两份都保留、各自服务不同粒度**——`.mmd` 是完整图集，内联块是所在小节的局部视图。校验脚本做的是**符号真实性**约束而非"两份内容相等"：所有图里的节点标签中出现的标识符（Hook 名、类名、方法名、文件名）必须在 `src/`、`myfastapi_/`、`public/`、`sukinOsLocalDevSDK/` 里存在，代码改名而图未跟就会失败。原 `03-app-routing.mmd` 因与 `03-commhub-communication.mmd` 撞前缀，已更名为 `23-app-routing.mmd`。

### 其余

- `docs/diagrams/`：架构/流程截图（PNG）
- `docs/screenshot/`：界面截图
- `docs/sql/`：`schema.sql` / `init-data.sql` / `queries.sql`
- `docs/test/`：20 篇技术专题（微内核、沙箱、VFS、IPC、Babel、WebWorker…）。**该目录被 `.gitignore:29` 的 `test` 规则排除，不进版本库**；其中 4 篇（10 高频扫码 / 11 Amis / 17 React Fiber / 19 Jenkins）与本平台实现无直接对应关系，属通用技术笔记

## 已知缺陷（文档按实现真相记录，尚未修码）

- `lifecycle.js:368` 调用 `commHub.saveState(...)`，而 CommHub 并无该方法（SAVE_STATE 实际走注入的 `onSaveState`）⇒ NoWorker 分支的状态保存静默丢失。详见 `module/07` §5.1
- `renderWindow.js:114-122` 的 JSDoc 仍是位置参数口径，真实签名是单对象入参（同文件 `:124-127`）。详见 `module/04`
- `developer/right/healper/` 目录名拼写为 `healper`，文档按真实路径引用
- `custom.allowResize` 无实际门控（`window/layout.jsx:93` 被 `|| true` 短路）；`fileIndexDb` 的 `parent_name_idx` 配了 `unique: true` 但创建索引时未透传该选项，实际不唯一

## 维护约定

- 新增/修改文档结论时，**行号必须指向当前代码**；`X.js:N-M` 形式的引用由脚本检查 `M ≤ 文件行数`
- 表数、入站消息类型数等**计数类结论**以代码为准（后端 11 张表、Worker 入站 5 类）
- 不删除 `.mmd`，不改内联/独立图的引用方式
