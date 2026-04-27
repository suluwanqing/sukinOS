# SukinOS

**基于 React + Web Worker + IndexedDB **
> **核心理念**: 全量state驱动更新组件,UI只负责事件派发,任何计算都将通过worker进行计算,趋于类微前端,热插拔可持久化视窗APP交互体验。
> **注意**：代码逻辑完整，适合作为学习 React 复杂状态管理、浏览器本地存储应用及 Web OS 架构的参考案例。
> 如果您希望实时体验最新版本请访问 sukin.top/sukinos ---- [if you want get the latest ,To: sukin.top/sukinos]

---


## 项目预览

| 设置 | 默认桌面 |
| :---: | :---: |
| ![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/1.png) | ![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/2.png) |

| 本地开发 | 线上开发 |
| :---: | :---: |
| ![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/3.png) | ![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/4.png) |

*(另有应用手册功能可见图5)*

---

## 一、项目简介与核心价值

**SukinOS** 是一个在浏览器中运行的轻量级桌面环境。它不依赖传统后端，而是利用现代浏览器的能力（IndexedDB, Service Worker, Web Worker）来模拟完整的操作系统上层的体验。与常规的后台管理系统不同，SukinOS 采用了**窗口化多任务**的设计模式，支持应用程序的动态加载、文件系统的本地持久化存储以及代码的在线编译运行。

### 1. 核心价值
- **去中心化体验**：数据完全存储在用户浏览器本地。
- **高性能运行时**：耗时任务通过 Web Worker 隔离，不阻塞 UI 线程。
- **高扩展性**：基于组件化的 App 设计，易于集成新的“应用程序”。

### 2. 架构逻辑解构 (Architecture & Logic)
为了深入理解本项目，我们将系统逻辑解构为以下三个核心层级：
*   **核心层 (Kernel / State Management)** (_位于 `store.jsx` 与 `main`_)：模拟了操作系统的“内核”功能，包含**进程管理**（维护 apps 队列与窗口 Z-Index）、**任务调度**（控制前台应用聚焦）、**消息总线**（应用间通信）。
*   **文件系统层 (File System / VFS)** (_位于 `utils` 与 `resources`_)：封装 IndexedDB 作为虚拟硬盘，映射为树状目录结构，并支持桌面布局与资源的离线持久化。
*   **运行时层 (Runtime & Compiler)** (_位于 `public` 与 `hooks`_)：利用 **Babel Standalone** 进行动态沙箱编译，**Web Worker** 接管异步计算，**Service Worker** 进行 PWA 离线代理。

---

## 二、技术栈与目录架构

### 1. 技术栈详情

| 维度 | 技术选型 | 说明 |
| :--- | :--- | :--- |
| **视图层** | React 19 | 使用 Hooks 进行函数式组件开发 |
| **样式层** | CSS Modules | 避免样式冲突，实现模块化样式管理 |
| **构建工具** | Vite | 极速冷启动与热更新 |
| **存储层** | IndexedDB | 浏览器端的大容量结构化数据存储 |
| **异步处理** | Web Worker | 开启多线程处理耗时逻辑 |
| **编译器** | Babel | 浏览器端 JS/JSX 代码动态转译 |
| **离线支持** | Service Worker | PWA 基础支持 |

### 2. 核心目录体系

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

---

## 三、系统启动与 OS 注入流 (Boot Flow)

系统的启动是一个剥离了传统 HTTP 拉取，转向从底层 IndexedDB 提取代码并注入内存的“组装过程”。

### 1. 系统文件盘挂载与初始化
首先登录后，将会进入文件夹句柄挂载点，默认是原子隐私数据库即 `await navigator.storage.getDirectory()`。当进入后后续修改为非隐私模式，将会挂载在用户的真实物理文件夹中。

### 2. Boot 函数核心执行链
调用 Boot 后将会执行 `kernel.init(config)`，该 `config` 指代是否需要原子隐私等初始化配置。之后依次调用处理相关函数：

```javascript
try {
  // 加载核心依赖 and 资源
  await BabelLoader.load()
  await this.ensurePresets()
  await this.loadAllResources()

  // --- 构建内存中的应用注册表 ---
  // 先从 sys 的 DB 加载用户应用到内存。必须先加载已有记录，内核才能知道哪些资源分配了 PID
  await this.#loadUserAppsFromDb()

  // 初始化系统的注册表。系统应用直接注入 PID
  this.#initializeSystemApps()

  // 通过资源(Res)构建/补全注册表(Sys)。安全地为“有资源没注册”的应用生成新记录
  await this.syncRegistryByRes()

  // 从资源文件里解析出资源Id，并更新到注册表。主要负责关联本地文件句柄和处理僵尸文件
  await this.syncRegistry()

  // 恢复上一次的布局与会话状态
  await this.restoreSession()
  alert.success("[内核] 初始化成功。")
  return true
} catch (err) {
  alert.failure(err)
  return false // 初始化过程中发生任何错误都视为失败
}
```

---

## 四、内核应用程序生态与生命周期 (APP Environment & Lifecycle)

APP 在系统内分为“资源源信息 (Resource)”和“运行实例表 (Sys Registry)”。

### 1. APP 资源注册机制 (`uploadResource`)

#### 注册信息样例（预定义）
```javascript
// App 配置状态
const [appMeta, setAppMeta] = useState({
  shouldUpload: false, //内部使用
  appName: '',
  appIcon: '/logo.jpg',
  initialSize: { w: 600, h: 450, x: 0, y: 0 },
  logicCode: DEFAULT_LOGIC,
  appType: 'editor',
  syncLocal: false,
  custom: { hasShortcut: true, blockEd: false, isFullScreen: true, ... }
})
```

#### 资源与身份注入
执行 `kernel.uploadResource`，随即进入逻辑处理函数 `extUploadResource`。该环节拦截身份：
```javascript
if (!metaInfo?.authorId) {
  alert.warning('操作失败：请先登录！')
  return Promise.reject(new Error('操作失败：请先登录！'))
}
```
经过重组后，资源会被保存进 IndexedDB，并在内核构建快速缓存。为了维护不存储状态的 APP，原有的“同步文件注册 pid”体系转为了“安装时独立注册 pid”：
```javascript
// 存入资源
await kernel.resDb.putData(newRes)
kernel.resourceCache[truthResourceId] = newRes

// APP的注册行为 (固化PID)
const appData = {
  pid: crypto.randomUUID(),
  [ENV_KEY_RESOURCE_ID]: truthResourceId,
  [ENV_KEY_NAME]: name,
  status: 'INSTALLED',
  [ENV_KEY_META_INFO]: newRes[ENV_KEY_META_INFO]
}

// 物理本地文件映射检测
if (args?.syncLocal || false) {
  await kernel.writeAppFile({ ...newRes, [ENV_KEY_CONTENT]: content })
  try {
    const fileName = `${SUKIN_PRE}${name}${SUKIN_EXT}`
    appData.handle = await kernel.dirHandle.getFileHandle(fileName)
  } catch (e) {
    console.warn(`[内核] 获取本地文件句柄失败: ${name}`)
  }
}
```

### 2. 僵尸文件注册处理 & STATE 同步
调用 `kernel.extSyncRegistry()` 执行文件、Res、Sys 三者的协同同步。
```javascript
// 遍历虚拟盘内的实际文件句柄
for await (const entry of kernel.dirHandle.values()) {
  // 提取清洗后的应用名 (剥除专属前后缀)
  const cleanName = entry.name.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '');
  const isRegistered = Array.from(kernel.userApps.values()).some(app => app?.[ENV_KEY_NAME] === cleanName)

  // 若未注册，说明是外部导入或残留文件，抛入僵尸检测
  if (!isRegistered) {
    await kernel.extInspectZombieFile(kernel, entry) // 验证文件如果合格则发起重建和登记
  }
}
```
通过 `parseWorkerCode` 反向解析内容包，提取路由、初始化函数及纯净逻辑块重新补足内存应用树。

### 3. APP 生命周期 (启动、挂起与销毁)

#### 冷启动 (`startProcess`)
当应用尚未装载至内存或彻底关闭时，触发冷启动从 Blob 到 Web Worker 的构建：
```javascript
try {
  let workerCode
  if (app?.isSystemApp) {
    // 系统资源一定是不在文件映射中，直接提取
    workerCode = generateWorker(resource)
  } else {
    // 处理本地同步的文件提取
    if (app && app.handle) {
      if ((await app.handle.queryPermission({ mode: 'read' })) !== 'granted') {
        await app.handle.requestPermission({ mode: 'read' })
      }
      const file = await app.handle.getFile()
      workerCode = await file.text()
    } else {
      workerCode = generateWorker(resource)
    }
  }
  // 【重点】剥离主线程，采用内存地址创建独立环境
  const url = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }))
  const worker = new Worker(url, { name: truthPid })
  this.processes.set(truthPid, { worker, url })

  worker.onmessage = e => this.#handleMsg(truthPid, e.data)

  // 传输应用之前的缓存State
  const stateToRestore = app.savedState?.app
  worker.postMessage({ type: stateToRestore ? 'RESTORE' : 'INIT', payload: stateToRestore })

  // 标定状态为RUNNING并落盘
  app.status = 'RUNNING'
  return { isStart: true }
} catch(e) {
  this.#kill(truthPid) // 回收进程防止泄露
}
```

#### 热启动 / 恢复 (`hibernate`)
如果是暂存休眠态，不用重新编译构建 Blob 对象，直接激活数据：
```javascript
if (this.processes.has(truthPid)) {
  if (app.status === 'HIBERNATED') {
    app.status = 'RUNNING'
    this.#emitChange()
  }
  // 无论如何都会通知 UI 并返回窗口状态，恢复前台焦点
  this.#notify(truthPid, 'STATE', this.stateCache.get(truthPid))
  return { isStart: true }
}
```

#### 销毁 (`forceKillProcess`)
系统调用内部的私有卸载机制：`worker.terminate()` 以及极度重要的 `URL.revokeObjectURL(p.url)` 以防止内存泄漏炸毁浏览器，同时清除内存树栈。

---

## 五、OS 通信总线与状态驱动桥桥 (IPC & State Bridge)

SukinOS 并不是基于普通组件状态的，它是典型的**总线驱动**思想——Worker 保存记忆、内核作为总线调度分发、UI 只作为映射呈现。

### 1. 通信调度器 (`dispatch`)
```javascript
dispatch(pid, action) {
  const p = this.processes.get(pid)
  const isSystem = this.isSystemApp(pid)
  if (!p) return

  // 特权级系统调用
  if (action.type === 'KERNEL_CALL' && action.payload) {
    isSystem ? this.#systemSwitch(p, action.payload) : this.#notSystemSwitch(p, action.payload)
    return
  }
  // 普通UI操作，发送给具体的私有 Worker 线程处理还原纯粹数据
  p.worker.postMessage({ type: 'UI_ACTION', payload: action })
}
```

### 2. 桥接层钩子 (`useProcessBridge`)
核心的连接件，绑定在 React 与 Worker 中间监听数据跳动：
```javascript
const useProcessBridge = pid => {
  const [state, setState] = useState(null)

  useEffect(() => {
    if (!pid) return
    // 订阅应用自身 Worker 发出的状态变化
    const unsubscribeApp = kernel.subscribeApp(pid, msg => {
      if (msg.type === 'STATE') {
         // 当 Worker 更新私有状态时，合并系统信息后同步给 UI
        setState(getMergedState(msg.payload))
      }
    })
    return () => unsubscribeApp()
  }, [pid])

  const dispatch = useCallback(action => kernel.dispatch(pid, action), [pid])
  return { state, dispatch }
}
```

### 3. 跨进程唤起 (`evokeApp` & `appIntereact`)
应用间通过 OS 中转发起调用：
```javascript
async appIntereact({ process, interactInfo }) {
  // 借道宿主实现不同沙箱的间接握手
  process.postMessage({ type: "APP_INTERACT", payload: interactInfo })
}
```

---

## 六、虚拟微路由架构 (State-Driven Router)

子应用禁止直接操作原生的 `history.push`，以防止污染宿主地址栏或引发安全欺骗。该架构被称为**内核状态驱动（State-Driven）与组件动态映射**。

### 1. 路由映射与 404 处理
将 Bundle 代码视为字典 `modules`。依靠状态取出路径：
```javascript
const currentPath = state.router?.path || 'home'
// AppInternalRenderer 中的查找逻辑。降级兜底防止白屏
const RawPage = modules[currentPath]?.Component || (() => <div>404: {currentPath}</div>)
```

### 2. Layout Slot 页面外壳注入模式
SukinOS 强推“容器/页面”隔离分离，系统动态向 `layout.jsx` 塞入 Component。
```javascript
const Layout = modules['layout']?.Component
const ConnectedPage = props => <RawPage {...commonProps} {...props} />
// 以 React 属性形式下发页面
return <Layout {...commonProps} PageComponent={ConnectedPage} />
```

### 3. 被封锁的导航操作 (`navigate`)
应用调用 `SDK.navigate(path)` -> 被底层截获为派发行动 `dispatch({ type: 'NAVIGATE', payload: path })` -> 系统更新 State 造成子树组件变更，全过程浏览器地址栏无响应修改。

---

## 七、系统级沙箱与安全隔离防护 (Security & Isolation)

这是在不脱离浏览器单文档限制下，处理不可信代码运行的极限探索，架构极其严防死守。

### 1. 物理沙箱模式 (Physical Sandbox)
最彻底的硬隔离方式。通过独立的 \`iframe\` 容器阻断 DOM 树。
```javascript
const syncStyles = targetDoc => {
  // 不允许子应用独立加载外链，由宿主控制并主动同步同源受控样式
  const parentStyles = document.querySelectorAll('link[rel="stylesheet"], style')
  parentStyles.forEach(style => {
    targetDoc.head.appendChild(style.cloneNode(true))
  })
}

// 物理层 API 爆破隔离
Object.defineProperty(win, api, {
  get: () => { throw new Error(`物理沙箱拒绝直接访问 \`${api}\``) },
  configurable: false
})
```

### 2. 寄生模式 (Parasitism) 与 Shadow DOM 防溢出
对于需要深度交互的内部模块，其脱开 Iframe 直接渲染，系统采用“软隔离”：
*   **状态强阻断机制 (`deepCloneAndFreeze`)**: 将传递的状态进行递归深拷贝再 `Object.freeze`。修改彻底无效，且无法污染宿主 Redux。
*   **CSS 前缀强制加域 (`scopeCss`)**: 处理字符串为 `#proc-${pid}` 前缀，构建类 Shadow DOM 防御布局错乱。

### 3. 桥接幽灵系统 (Ghost Sandbox Bridge)
针对 JS 运行隔离，UI 又需要直接外露：后台创建一个 `display:none` 的 Iframe，将逻辑装弹在此处，UI 通过跨界回调（`factory.call`）执行渲染。

### 4. SDK 防纂改深度克隆
所有传递进进程的 API 包都被死锁，以防原型链投毒：
```javascript
const deepCloneAndFreeze = (obj, seen = new WeakMap()) => {
  // ... 跳过 React 内核以免阻塞，其余一律递归深度 Freeze
}
export const createSdkForInstance = (...) => {
  return Object.freeze(AppSDK); // 彻底封锁 App 对 SDK 的篡改权
};
```

### 5. 存储空间 PID 命名隔离 (`createStorageProxy`)
防止不同 APP 抢夺相同的 Storage Key 导致覆盖互串：
```javascript
const createStorageProxy = (storage, pid) => {
  const prefix = `pid-${pid}_`;
  return new Proxy(storage, {
    get(target, prop) {
      if (prop === 'getItem') return (key) => target.getItem(prefix + key);
      if (prop === 'setItem') return (key, value) => target.setItem(prefix + key, value);
      if (prop === 'clear') return () => { /* 正则筛选属于自己的键清除... */ };
      // ... 代理收尾工作
    }
  });
};
```

### 6. 宿主 Window 环形迷宫护城河
为了防止获取 `window.window` 时拿到真正的宿主句柄：
```javascript
const _safeProxyHandler = {
  get(target, prop) {
    // 拦截自循环引用，防止无限向外域查探导致越权逃逸
    if (prop === 'window' || prop === 'self' || prop === 'globalThis') {
      return _safeGlobalProxy
    }
    // 强制返回只包含受控 API 的替身 document 代理
    if (prop === 'document') {
      return _safeDocumentProxy
    }
  }
}
```

### 7. Fetch 改写与 XHR 熔断机制
*   网络包请求全部经过内核加签：
```javascript
// 全局 Fetch 全部由 AppSDK 提供的加料版顶替。包含跨域审计和 PID 头部注入
const _safeFetch = (AppSDK && AppSDK.API && AppSDK.API.fetch) ? AppSDK.API.fetch : globalThis.fetch;
```
*   阻止老式漏洞百出的攻击渗透路径：在沙箱内声明 `const XMLHttpRequest = undefined` 强行击碎原代码使用 XHR 的可能。

### 8. CDN 外链防 XSS 注入与恶意加载检查
拦截 `document.createElement('script')` 产生的对象 `src/href` 设置事件，匹配预设白名单 `TRUSTED_CDN_WHITELIST` 进行准入判定：
```javascript
const _isUrlAllowed = url => {
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('blob:')) return true
  return _TRUSTED_CDN.some(domain => url.startsWith(domain)) // CDN检查
}

// 代理标签属性监听
if (tag === 'script' || tag === 'link') {
  Object.defineProperty(el, attr, {
    set: v => {
      if (_isUrlAllowed(v)) el.setAttribute(attr, v)
      else throw new Error("Security Error: CDN URL '" + v + "' is not whitelisted.")
    }
  })
}
```

---

## 八、高性能窗口缝合架构 (Window Stitching Architecture)

这是一个基于“宿主外壳 (Host Shell)”与“物理沙箱 (Iframe Sandbox)”缝合架构的完整交互层设计。为了突破 React 状态驱动在窗口化（UI频更）带来的渲染瓶颈，该架构直接绕开了 `React State`，实施物理坐标归一化以及 Iframe 指针锁定技术。

### 1. 核心交互 Hook (`useWindowInteraction.js`)
负责计算位移并直接操作 DOM，同时管理 Iframe 的状态，是“缝合行为”的中枢神经。
```javascript
import { useRef, useCallback, useEffect } from 'react'

export const useWindowInteraction = ({ winSize, isIframeMode = false }) => {
  const windowElRef = useRef(null)

  // 逻辑坐标存储：摒弃 React Context 同步，单纯利用底层指引保持真实位置计算
  const rectRef = useRef(winSize)
  const actionType = useRef(null)
  const startPos = useRef({ x: 0, y: 0 })
  const startRect = useRef({ ...winSize })

  // 缝合优化：准备交互锁定
  const prepareForInteraction = useCallback((el) => {
    if (!el) return
    el.style.transition = 'none'

    if (isIframeMode) {
      el.style.willChange = 'transform, width, height, left, top'
      const iframe = el.querySelector('iframe')
      if (iframe) {
        // 关键缝合点：锁定沙箱鼠标响应指针，让鼠标全部穿越给宿主的 document 监控拖拽
        iframe.style.pointerEvents = 'none'
      }
    }
  }, [isIframeMode])

  // ... 鼠标移动运算和解绑 (核心：取消 transition/改变 transform3d/恢复指针事件) ...
}
```

### 2. 窗口外壳组件宿放 (`ProcessWindow.jsx`)
应用“宿主边界”本身，包裹沙箱实施隔离与视觉框限制。
```javascript
const ProcessWindow = ({ initialRect, isPhysicalSandbox }) => {
  const { windowElRef, handleMouseDown } = useWindowInteraction({
    winSize: initialRect,
    isIframeMode: isPhysicalSandbox
  })

  return (
    <div ref={windowElRef} style={{
        position: 'absolute',
        transition: isPhysicalSandbox ? 'none' : 'left 0.2s...',
        contain: 'layout style' // 性能缝合的最关键独立渲染绘制指示器
      }}>
      {/* 拖拽手柄标题头 */}
      <div onMouseDown={(e) => handleMouseDown(e, 'drag')}>标题</div>

      {/* 内容区：实体落点缝合与寄生呈现兼容分配 */}
      <div style={{ flex: 1, position: 'relative' }}>
        {isPhysicalSandbox ? (
          <iframe src="about:blank" style={{ width: '100%', height: '100%', border: 'none', contain: 'strict' }} />
        ) : (
          <div>寄生模式内容</div>
        )}
      </div>
    </div>
  )
}
```

### 3. 技术手册：四大缝合原理机制

这套纯前端的底层模拟机制完美解决了浏览器常规实现桌面操作系统多视窗高频拖拽的失帧与卡顿问题：

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
