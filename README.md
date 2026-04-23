# SukinOS

**基于 React + Web Worker + IndexedDB + FastApi**

> **注意**：本项目暂时停止更新。代码逻辑完整，适合作为学习 React 复杂状态管理、浏览器本地存储应用及 Web OS 架构的参考案例。
> 如果您希望实时体验最新版本请访问 sukin.top/sukinos ---- [if you want get the latest ,To: sukin.top/sukinos]

---

## 项目预览

设置:
![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/1.png)

默认桌面:
![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/2.png)

本地开发:
![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/3.png)

线上开发:
![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/4.png)

手册:
![Image text](https://github.com/suluwanqing/sukinOS/blob/main/md/5.png)

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

_位于 `src/store.jsx` 与 `src/main`_
系统通过 React 的全局状态（Context/Store）模拟了操作系统的“内核”功能：

- **进程管理**：维护一个 `apps` 队列，记录当前打开的窗口、Z-Index 层级、最小化/最大化状态。
- **任务调度**：通过路由和状态分发，控制前台应用（Active Window）的聚焦逻辑。
- **消息总线**：实现了简单的事件机制，允许 App 之间通信（例如：文件管理器点击文件 -> 触发编辑器打开）。

### 2. 文件系统层 (File System / VFS)

_位于 `src/utils` 与 `src/resources`_
为了模拟真实的磁盘操作，项目封装了 **IndexedDB**：

- **虚拟文件树**：将 IndexedDB 的对象存储（Object Store）映射为树状目录结构。
- **持久化**：用户的设置、保存的代码文件、桌面布局均保存在浏览器本地，刷新页面不丢失。
- **资源管理**：图片、图标等静态资源支持以 Base64 或 Blob 形式存储和读取。

### 3. 运行时层 (Runtime & Compiler)

_位于 `public` (Workers) 与 `src/hooks`_

- **沙箱执行**：为了安全地运行用户编写的代码，SukinOS 利用 **Babel Standalone** 进行动态编译。
- **Web Worker**：编译过程在 Worker 线程中运行，避免复杂计算导致桌面 UI 卡顿。
- **Service Worker**：拦截网络请求，实现离线访问能力，模拟“本地应用”的感觉。

---

## 主要功能

### 桌面环境

- **完整交互**：包括任务栏、开始菜单、桌面图标拖拽、右键上下文菜单。
- **窗口管理**：支持多窗口重叠、缩放、拖拽、置顶及最小化动画。

### 文件资源管理器

- **可视化操作**：类似 Windows Explorer 的界面，支持新建文件夹、文件重命名、删除。
- **类型识别**：根据文件后缀自动关联打开方式（图片预览、文本编辑）。

### 开发者生态

- **内置 IDE**：支持语法高亮的在线代码编辑器。
- **动态编译**：可以直接在浏览器中编写 React 组件并实时预览渲染结果（通过 Babel 转换）。

### UI 组件库

- 内置一套与系统风格统一的组件：`Alert`（警告框）、`Confirm`（确认框）、`Check`（选择器）等，位于 `src/component`。

---

## 技术栈详情

| 维度         | 技术选型       | 说明                             |
| :----------- | :------------- | :------------------------------- |
| **视图层**   | React 18       | 使用 Hooks 进行函数式组件开发    |
| **样式层**   | CSS Modules    | 避免样式冲突，实现模块化样式管理 |
| **构建工具** | Vite           | 极速冷启动与热更新               |
| **存储层**   | IndexedDB      | 浏览器端的大容量结构化数据存储   |
| **异步处理** | Web Worker     | 开启多线程处理耗时逻辑           |
| **编译器**   | Babel          | 浏览器端 JS/JSX 代码动态转译     |
| **离线支持** | Service Worker | PWA 基础支持                     |

---

## 目录结构说明

````bash
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
# 核心内核
## OS注入流程
### 系统文件盘挂载
首先登录后,将会进入文件夹句柄挂载点，默认是原子隐私数据库即await navigator.storage.getDirectory()
当进入后后续修改为非隐私模式,将会挂载在用户的文件夹中。
### Boot函数
调用Boot后将会执行kernel.init(config)  该config即指代是否需要原子隐私等等初始化配置
之后依次调用处理相关函数
```javascript
try {
      // 加载核心依赖 and 资源
      await BabelLoader.load()
      await this.ensurePresets()
      await this.loadAllResources()
      // --- 构建内存中的应用注册表  ---
      // 先从 sys 的 DB 加载用户应用到内存。
      // 必须先加载已有记录，内核才能知道哪些资源已经分配了 PID，避免 syncRegistryByRes 重复创建/修改PID
      await this.#loadUserAppsFromDb() // 从sys的DB加载用户应用到内存  注入pid

      // 初始化系统的注册表。
      this.#initializeSystemApps() //系统的注册表 直接注入pid

      // 通过资源(Res)构建/补全注册表(Sys)。
      // 此时内存中已有 userApps，此函数会安全地为那些“有资源但没注册”的应用生成新记录
      await this.syncRegistryByRes()  //通过res构建资源表

      /*
        同步文件系统，确保物理文件、内存注册表和数据库三者状态一致
        但是现在这里不再是必须的了!必需的行为将会变为从资源res中读取应用资源,再注入到sys中[因为这里,原来的架构是会删除这个的僵尸sys]
      */
      //:: await this.syncResourcesToFiles()  //将indexDb的数据资源写入indexDb [这里可以加密处理第一步确定资源不被修改]

      // 从资源文件[注意是文件不是注册表]里解析出资源Id，同时更新到注册表。
      // 这一步主要负责关联本地文件句柄 和处理僵尸文件
      await this.syncRegistry()
      //将app信息[实际是资源]同步到store,方便对appStore管理操作
      // [暂且保留，虽然有点没必要但是为了减少其他额外操作。]
      // 恢复上一次的会话状态
      await this.restoreSession()
      alert.success("[内核] 初始化成功。")
      return true
    } catch (err) {
      alert.failure(err)
      return false // 初始化过程中发生任何错误都视为失败
    }
````

# APP 相关模块

## APP 如何注册

APP 资源注册源信息

### 注册信息样例

```javascript
// App 配置状态
const [appMeta, setAppMeta] = useState({
  shouldUpload: false, //内部使用
  appName: '',
  appIcon: '/logo.jpg',
  initialSize: { w: 600, h: 450, x: 0, y: 0 },
  logicCode: DEFAULT_LOGIC,
  appType: 'editor',
  exposeState: false,
  saveState: false,
  description: '这是一个 App',
  syncLocal: false,
  custom: {
    // 这个 custom 字段是固定的禁止修改,其他其此处是非耦合的
    ...appCustom
  }
})

export const appCustom = {
  hasShortcut: true,
  blockEd: false,
  isFullScreen: true,
  autoStart: false,
  allowResize: true,
  showInLauncher: false
}
```

经过整合后的信息

```javascript
  const { appName, appIcon, logicCode, shouldUpload, ...restMetaInfo } = appMeta;
  const baseMetaInfo = {
      //这个如果需要更新这个appMeta需要对应更新metaInfo
      seed: Date.now().toString(),
      authorId: userInfo?.id,
      icon: appIcon,
      ...restMetaInfo
  };
  外层是相对固定的
  [ENV_KEY_RESOURCE_ID]:resourceID,资源ID
  [ENV_KEY_NAME]:name,
  [ENV_KEY_IS_BUNDLE]:fasle,
  [ENV_KEY_CONTENT]:content || modules,
  [ENV_KEY_LOGIC]:logic && state,
  [ENV_KEY_META_INFO]:metaInfo,//所有APP相关的信息
  shouldUpload, //用于内部判断是否需要上传
  userInfo,//用于内部传输,方便操作
  storePath//用于上传时,可能为用户自己配置的私有仓库
```

### 注册流程

首先调用 kernel 的 uploadResource 函数

#### uploadResource

```javascript
  async uploadResource(params) {
      return extUploadResource(this, params);
  }
```

紧接着进入到逻辑处理函数 extUploadResource

#### extUploadResource

其命名空间为

```javascript
async function extUploadResource(kernel, args) {}
```

该函数首先会判断是否传入用户 ID,如果没有该信息将会注册失败!

```javascript
if (!metaInfo?.authorId) {
  //简单处理
  const errorMsg = '操作失败：请先登录！'
  alert.warning(errorMsg)
  return Promise.reject(new Error(errorMsg))
}
```

APP 信息的再处理,其主要是为了配合处理应用私有的[可能被缓存]State,和 APP 的一些信息额外

```javascript
const newRes = {
  [ENV_KEY_RESOURCE_ID]: truthResourceId,
  [ENV_KEY_NAME]: name,
  [ENV_KEY_IS_BUNDLE]: isBundle,
  [ENV_KEY_CONTENT]: content,
  [ENV_KEY_LOGIC]: logic,
  [ENV_KEY_META_INFO]: {
    ...metaInfo,
    createdAt: metaInfo.createdAt || new Date().toISOString(), //如果是本地就是用这个,如果是上传就会使用到服务器的时间
    initialSize: {
      w: Math.max(500, metaInfo?.initialSize?.w || 500),
      h: Math.max(400, metaInfo?.initialSize?.h || 400)
    },
    [ENV_KEY_NAME]: name,
    version: version
  }
}
```

资源的注入，调用 kernel 的资源 Api 存入到对应 indexDb 中

```JavaScript
await kernel.resDb.putData(newRes)//存入到资源 indexDb 里
kernel.resourceCache[truthResourceId] = newRes //存储到kernel内部可用于运行时快速获取和处理的函数
```

为了维护不可存储状态的 APP,原有同步文件注册 pid 到 sys 将会修改为安装时注册 sys。同时僵尸清理更新为以 Res 为中心而不是文件句柄为中心。
该方案也同时确保了 APP 的 pid 相对不变性,确保 indexDb 等存储私有空间不被破坏。

```javascript
APP的注册行为
const appData = {
  pid: crypto.randomUUID(),
  [ENV_KEY_RESOURCE_ID]: truthResourceId,
  [ENV_KEY_NAME]: name,
  handle: null,
  savedState: null,
  status: 'INSTALLED',
  [ENV_KEY_META_INFO]: newRes[ENV_KEY_META_INFO]
}
首先会进行解析判断是否需要挂载文件句柄[本地同步]
if (args?.syncLocal || false) {
  //如果允许写入本地同步,将会触发本地写入操作[包括后续状态管理],但是实际上智慧存储到一个文件中,这个文件包含整个APP的完整信息,当再次处理将会被解析出来
  await kernel.writeAppFile({ ...newRes, [ENV_KEY_CONTENT]: content })
  // 尝试获取文件句柄并关联到 appData 中，这样安装后可以直接访问本地文件
  try {
    const fileName = `${SUKIN_PRE}${name}${SUKIN_EXT}`
    appData.handle = await kernel.dirHandle.getFileHandle(fileName)
  } catch (e) {
    console.warn(`[内核] 获取本地文件句柄失败: ${name}`)
  }
  await kernel.syncRegistry() //同步注册资源[通过本地文件注册,但是这个可能会有资源浪费因为会扫描所有本地文件]
}
无论如何都将会调用安装函数executeInstallation,
  同时触发内核更新消息kernel.emitChange()

判断APP是否需要上传
if (shouldUpload) {
  //上传服务器不等待
  kernel.uploadCloud({
    resource: newRes,
    userInfo: args?.userInfo,
    storePath: args?.storePath
  })
}
return truthResourceId
```

## APP 的解析

### 僵尸文件注册处理 & STATE 同步'三界'

由于文件句柄相对依赖文件,所以更多的是围绕文件展开,但是如果是非本地同步的 APP 将会进行特殊的处理
调用 kernel.extSyncRegistry()//执行文件,indexDb=>res & sys 的协同同步,这里主要涉及到部分应用是本地同步即 state 会更新到本地,每次启动的时候更新合并
进入实际处理函数 extSyncRegistry

```javascript
export async function extSyncRegistry(kernel) {
      ......
      const physicalFiles = new Set() // 物理文件集合(存储处理后的cleanName)
      const filesToRemove = []      // 待删除文件
      const appsToRegister = []     // 待注册的僵尸应用数据
      ......

}
首先进行判断是否有文件夹挂载点
if (!kernel.dirHandle) return

处理indexDb的打开行为分析

处理文件句柄
for await (const entry of kernel.dirHandle.values()) {
  // 这里涉及到我们的worker整合后的文件都将会成为特定前缀和后缀的js文件名。
  提取应用名
  const cleanName = entry.name.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '');
  检测是否已经注册
  const isRegistered = Array.from(kernel.userApps.values())
  .some(app => app?.[ENV_KEY_NAME] === cleanName)
  如果是已经注册的将会执行APP同步相关 , 这个行为非常关键涉及到sys稳定性
  如果没有注册将会进行解析
  调用await kernel.inspectZombieFile(entry)
  进入到僵尸文件处理流程extInspectZombieFile
}
```

extInspectZombieFile 该函数会尝试为文件句柄进行注册处理

```javascript
export async function extInspectZombieFile(kernel, fileHandle) {
  const result = {
    isValidZombie: false,
    shouldRemove: false,
    appData: null
  }
  他会尝试检测解析文件句柄的内容信息, 如果信息壳子没有问题, 将会被执行注册行为
}
```

那如果使用非本地同步没有文件句柄如何确保 SYS 不被异常清除?
在初始化同步注入 sys 之前,以 res 为基础注入 extSyncRegistryByRes。
但是在此之前系统预设资源已经被注册调用了 initializeSystemApps,所以需要判断处理一下

```javascript
export async function extSyncRegistryByRes(kernel) {
  for (const res of Object.values(kernel.resourceCache)) {
    // 这里为什么是从内核缓存获取而不是indexDb?因为在boot阶段已经进行了注入
  }
}
```

其核心在于,我们的 APP 的 pid 理论上通过安装注册行为固定,这里会尝试获取到 pid,来确保 pid 的稳定性
其次判断是否需要本地同步,如果需要但是没有进行挂载,将会尝试进行挂载文件句柄,同时同步至 indexDb 相关信息
这里也会进行 sys 有效性处理。

### APP 资源的解析和存储

APP 资源的解析和存储依赖解析函数和整合函数

```javascript
export const generateWorker = (args) => {}
我们采取的方案是将信息全量注入到一个文件,但是这样肯定会造成部分资源的浪费,但是为了简洁和数据的相关性这是可以接受的。
```

APP 的反解析 parseWorkerCode 该函数将会从 woker 文件中解析处理出来所有相关的信息用于注册等行为处理
其解构和注册解析出来的相对类似

```javascript
export const parseWorkerCode = workerCode => {
  const result = {
    [ENV_KEY_RESOURCE_ID]: null,
    [ENV_KEY_NAME]: null,
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_LOGIC]: null,
    initialState: null,
    [ENV_KEY_CONTENT]: null,
    hasReducer: false,
    hasInitFunction: false,
    originalCode: workerCode, //注意我们的worker文件内容实际上并非只有logic还是合并的,这是为了后续应用可进行自身解析处理隐私权限相关
    [ENV_KEY_META_INFO]: null
  }
}
```

## APP 生命周期

### APP 的安装

### APP 的启动

kernel.startProcess

```javascript
  func:async startProcess({ pid, resourceId, interactInfo }) {}
```

在 APP 资源信息是正常注册行为下,pid 和 resurceId 是二选一的,因为内部做了快捷获取处理。从而可以相互获取。interactInfo 将会用于交互信息处理

我们的核心架构是 worker 驱动和 UI 分离渲染

#### 冷启动

处理非挂起的应用[即需要冷启动:进程+state:注入 pid=>'PCB']
冷启动将会通过获取到 worker 信息资源.通过资源文件,解析出来 worker 进行注册,由于部分是没有本地同步的那么我们直接通过 resource 去生成 worker 即可。
同时更新合并缓存和 indexDb 中的 APP 状态信息

```javascript
try {
  let workerCode
  if (app?.isSystemApp) {
    // 系统资源一定是不在文件映射中
    if (!resource) throw new Error(`系统资源 '${app?.[ENV_KEY_NAME]}' 未找到!`)
    workerCode = generateWorker(resource)
  } else {
    // 原有的架构是非系统都将进入到本地中。新引入了:本地同步可选机制。
    // 兼容处理,处理没有进行本地同步的 APP,这个时候认为是进入到了资源缓存中
    // 先检查 app 和 app.handle 是否存在
    if (app && app.handle) {
      if ((await app.handle.queryPermission({ mode: 'read' })) !== 'granted') {
        await app.handle.requestPermission({ mode: 'read' })
        const file = await app.handle.getFile()
        workerCode = await file.text()
      } else {
        workerCode = generateWorker(resource)
      }
    } else {
      workerCode = generateWorker(resource)
    }
  }
  const url = URL.createObjectURL(
    new Blob([workerCode], { type: 'application/javascript' })
  )
  const worker = new Worker(url, { name: truthPid })
  this.processes.set(truthPid, { worker, url })
  worker.onmessage = e => this.#handleMsg(truthPid, e.data)
  // 发送初始化或恢复状态的消息
  const stateToRestore = app.savedState?.app
  worker.postMessage({
    type: stateToRestore ? 'RESTORE' : 'INIT',
    payload: stateToRestore
  })
  if (interactInfo) {
    this.appIntereact({ process: worker, interactInfo })
  }
  // 更新内存和 DB 中的状态为 'RUNNING'
  app.status = 'RUNNING'
  if (!app.isSystemApp) {
    await this.sysDb.updateData(app?.[ENV_KEY_NAME], { status: 'RUNNING' })
  }
  this.#emitChange()
  return {
    isStart: true
  }
} catch (e) {
  // console.log(e)
  alert.warning(
    `[内核] 启动应用 ${app?.[ENV_KEY_NAME]} (pid: ${truthPid}) 失败:`,
    e
  )
  this.#kill(truthPid) // 启动失败时清理进程
  return {
    isStart: false
  }
}
```

#### 热启动

实际就是 APP 在挂起模式下的重新启动处理,为了简化我们将他们呢注入到同一个函数中处理

```javascript
if (this.processes.has(truthPid)) {
  try {
  // 如果应用处于休眠状态，则唤醒它
  if (app.status === 'HIBERNATED') {
    app.status = 'RUNNING'
  if (!app?.isSystemApp) {
    await this.sysDb.updateData(app?.[ENV_KEY_NAME], { status: 'RUNNING' })
  }
  if (interactInfo) {
    const p = await this.#getProcessApp(truthPid)
    this.appIntereact({ process: p.worker, interactInfo })
  }
    // alert.success(`[内核] 应用 ${app.name} (pid: ${pid}) 已恢复运行。`)
    this.#emitChange()
  }
  // 无论之前是 HIBERNATED 还是 RUNNING，都通知 UI 并返回窗口状态
  this.#notify(truthPid, 'STATE', this.stateCache.get(truthPid))
    return {
    isStart: true
    }
  }
}
```

### APP 的挂起

kernel.hibernate
挂起行为主要涉及到对 state 的保存和状态的更新处理。
但是注意系统预制的 APP 资源是不提供 STATE 存储的所以无需进行 STATE 的同步/保存。
只会有挂起行为,当前挂起行为分为两种:
第一种:直接关闭存储 state
第二种:使用 display:none 进行伪挂起[默认]

```javascript
async hibernate(pid) {}
```

### APP 的关闭

kernel.forceKillProcess
他会根据不同 APP 的类型去处理不同的操作,比如我们的系统预制的 APP 是不被允许存储的。

```javascript
他会调用内部私有函数
#kill(pid)
该函数会调用worker.teterminate()
URL.revokeObjectURL(p.url)
同时清除缓存中的进程信息
```

## APP 的生命 & 消息处理

核心 React 是 state 驱动,除了组件本身的 useSate 等这些状态自动驱动更新外。
由于存储都存储再对应 worker,那么我们如何驱动更新呢?
我们还是利用 statte 的驱动更新性
将 hooks 注入状态

### 核心:useProcessBridge

```javascript
const useProcessBridge = pid => {
  const [state, setState] = useState(null)
  //其核心为
  useEffect(() => {
    if (!pid) return
    // 订阅应用自身 Worker 发出的状态变化
    const unsubscribeApp = kernel.subscribeApp(pid, msg => {
      if (msg.type === 'STATE') {
        // 当 Worker 更新私有状态时，合并系统信息后同步给 UI
        setState(getMergedState(msg.payload))
      }
    })
    return () => {
      unsubscribeApp()
      // unsubscribeSystem()
    }
  }, [pid, getMergedState])

  const dispatch = useCallback(action => kernel.dispatch(pid, action), [pid])
  return { state, dispatch }
}

export default useProcessBridge
我们在第一次进行订阅的时候就进行一次返回注入state避免undefined问题
```

### state 如何进行更新

我们对 worker 进行了监听

```javascript
worker.onmessage = e => this.#handleMsg(truthPid, e.data)
每当worker有消息发送都将会进行监听处理, 常规的就是state的全量返回
```

#### #handleMsg

目前他只负责 state 的更新和通知 OS 进行存储 APP 的信息两种处理行为

```javascript
内部将会调用通知函数kernel.#notify
notify函数内部会指定APP的所有cb函数并传入信息类型和payload
从而触发state的更新
进而泵入APP的UI视图触发更新
```

## APP 间如何交互

我们的通信模式是 APP 发起到 OS 通过 OS 注入到对应 APP 中[即 worker 的 postMessage]

### 唤起行为

kernel.evokeApp
我们的唤起行为并不是 OS 去维护行为处理操作表,而是运行时执行由 APP 去操作我需要指定的唤起 pid 和交互信息。
我们的唤起实际上只有信息的传输,具体操作将会通过 startProcess 的 interactInfo 去进行传递。
如果 APP 没有启动将会启动并传入 APP 信息,并执行对应的处理。

```javascript
async evokeApp({ pid, from, interactInfo }) {}
为了处理APP没有启动的情况。我们实际是分情况进行调用
涉及两个函数appIntereact & startProcess
```

#### appIntereact

我们将他提取出来是为了后续如果 app 见需要直接交互这里可以方便处理,方便后续的处理进程的

```javascript
async appIntereact({ process, interactInfo }) {
  //这里为了后续方便优化提取出来
  process.postMessage({ type: "APP_INTERACT", payload: interactInfo })
}
```

#### startProcess

启动的同时传输信息

## APP 路由实现

SukinOS 的路由实现并非基于浏览器的原生 URL（如 window.location），而是一套基于 “内核状态驱动（State-Driven）” 与 “组件动态映射（Component Mapping）” 的虚拟路由系统。
SukinOS 实现了应用内部的“微路由”架构，将路由状态脱离浏览器地址栏，完全由内核 State 托管。

### 路由状态映射逻辑 (Path-to-Component Mapping)

**逻辑解析：**
系统将应用资源（Bundle）视为一个文件查找表。路由的本质是从 `modules` 对象（已编译的代码片段集合）中根据当前的 `path` 字符串提取对应的 React 组件。

- **默认路径**：如果 `state.router.path` 不存在，系统默认为 `home`。
- **404 处理**：如果 `modules` 中找不到对应的路径 Key，系统会降级渲染一个内置的 404 提示组件。

**核心代码实现：**

```javascript
const currentPath = state.router?.path || 'home'

// AppInternalRenderer 中的查找逻辑
const RawPage =
  modules[currentPath]?.Component || (() => <div>404: {currentPath}</div>)
```

### 布局与页面注入模式

SukinOS 强制推行 “容器/页面” 分离模式。
Layout 容器：应用必须包含一个 layout.jsx（或对应的导出），作为应用的外壳（如导航栏、侧边栏）。
PageComponent 注入：系统动态创建一个 ConnectedPage 组件，并将其作为 PageComponent 属性注入到 Layout 中。这允许开发者在 Layout 中决定页面的具体渲染位置（Slot 模式）。

```javascript
const Layout = modules['layout']?.Component
// 预绑定了 SDK 和 State 的页面组件
const ConnectedPage = props => <RawPage {...commonProps} {...props} />

return <Layout {...commonProps} PageComponent={ConnectedPage} />
```

### 声明式导航与 Action 分发

子应用无法直接操作 history.push。所有的跳转请求必须通过 SDK 暴露的 navigate 函数发起。
单向数据流：navigate 实际上是调用了 dispatch({ type: 'NAVIGATE', payload: path })。
内核接管：该 Action 发送到系统内核，内核更新该进程的 state.router.path，触发 DynamicRenderer 的重新渲染，从而完成页面切换。

```javascript
// 在 createSdkForInstance 中封装
const privateScope = {
  navigate: path => dispatch({ type: 'NAVIGATE', payload: path })
}

// 在 DynamicRenderer 中注入 props
const commonProps = {
  navigate: path => dispatch({ type: 'NAVIGATE', payload: path })
}
```

### Bundle 与非 Bundle 模式的路由差异

非 Bundle 模式：应用只有一个 main.content。此时路由失效，系统直接渲染 Main 组件，并传入一个空的 PageComponent。
Bundle 模式：应用由多个文件组成。系统会解析整个内容包，并根据文件名（Key）建立路由表。

```javascript
if (!resource.isBundle) {
  const Main = modules['main']?.Component
  return <Main {...commonProps} PageComponent={() => <div />} />
}
```

### 路由安全性与隔离性

地址栏隔离：由于路由是虚拟的，子应用的跳转不会改变宿主的 URL。这防止了恶意应用通过修改 URL 锚点进行 Phishing（鱼叉式）攻击。
历史记录沙箱：每个 App 的路由状态存储在自己的 state 对象中。A 应用的跳转完全不会影响 B 应用的返回逻辑，实现了真正的多任务进程隔离。
深度冻结防护：由于路由状态也属于 state 的一部分，它在传入非 Iframe 模式的应用时会经过 deepCloneAndFreeze，防止子应用通过非法手段篡改路由历史堆栈。

## APP 生存模式

### 物理沙箱模式

**逻辑解析：**
这是最彻底的隔离方式。应用拥有完全独立的 `Window` 和 `Document` 上下文。

- **物理隔离**：UI 泵入独立的 `iframe`。
- **环境初始化**：通过 `syncStyles` 函数，宿主主动将自身的 `link` 和 `style` 标签克隆到沙箱中，确保 UI 一致性。
- **API 拦截**：在 `IframeSandbox` 的 `init` 阶段，通过 `Object.defineProperty` 物理劫持原生 API，阻断直接持久化权限。

**核心代码实现：**

```javascript
const syncStyles = targetDoc => {
  // 宿主主动同步样式，而非让子应用自行加载 CDN
  const parentStyles = document.querySelectorAll(
    'link[rel="stylesheet"], style'
  )
  parentStyles.forEach(style => {
    const clone = style.cloneNode(true)
    targetDoc.head.appendChild(clone)
  })
}

// 物理层拦截
Object.defineProperty(win, api, {
  get: () => {
    throw new Error(`物理沙箱拒绝直接访问 \`${api}\``)
  },
  configurable: false
})
```

### 寄生模式

当 isParasitism 为真时，应用直接运行在宿主 DOM 中。为了防止“寄生者”反噬宿主，系统采用了 “软隔离”。
数据防护：使用 deepCloneAndFreeze 对 state 进行递归深克隆与冻结，切断引用传递。应用对状态的修改仅限于其私有闭包，无法污染宿主 Redux。
样式污染防控：利用 scopeCss 为子应用样式强制添加 #proc-${pid} 前缀，通过 CSS 权重确保样式不溢出。

```javascript
const commonProps = useMemo(() => {
// 寄生模式下，必须通过深克隆+冻结阻断引用污染
const safeState = isParasitism ? deepCloneAndFreeze(state) : state;
return { state: safeState, ... };
}, [state, isParasitism]);

// 样式泵入宿主 head，但经过 scope 处理

<style id={`runtime-css-${pid}`} dangerouslySetInnerHTML={{ __html: combinedCss }} />

```

### 桥接模式

这是 SukinOS 的特有技术。当开启 singleIframe 且非寄生时触发。
逻辑与 UI 分离：JS 逻辑运行在后台的“幽灵沙箱”（Ghost Iframe）中，而 UI 渲染通过 factory.call(sandboxWin) 桥接到宿主。
特权通行证：应用由于在 ghostIframe 执行，无法访问原生持久化 API；但宿主注入的 SDK（如 useFileSystem）由于利用了宿主闭包，可以绕过沙箱限制操作文件，实现“受控的特权访问”。

```javascript
const sandboxWin = useBridgeMode ? getGhostSandbox() : window

const compileAndRun = async code => {
  const res = await compileSourceAsync(code)
  // 执行上下文重定向到幽灵沙箱
  res.factory.call(sandboxWin, { exports }, exports, instanceSDK)
}
```

## APP SDK 注入 & dispatch & navigate

### 实例级 SDK 定制注入

**逻辑解析：**
系统不使用全局变量污染，而是为每个进程（PID）动态生成一份独一无二的 SDK 副本。

- **工厂模式**：通过 `createSdkForInstance(dispatch, pid, isSystemApp)` 生成。
- **作用域隔离**：SDK 内部闭包持有了当前进程的 `pid` 和内核 `dispatch`，这意味着应用发送的任何指令都自带身份标签。
- **注入点**：在 `DynamicRenderer` 的 `compileAndRun` 阶段，通过 `factory.call(sandboxWin, ...)` 将 SDK 作为第三个参数注入到子应用的作用域中。

**核心代码实现：**

```javascript
// DynamicRenderer.jsx 中的注入逻辑
const instanceSDK = useMemo(() => {
  return createSdkForInstance(dispatch, pid, isSystemApp)
}, [dispatch, pid, isSystemApp])

// 执行编译代码并传入 SDK
res.factory.call(sandboxWin, { exports }, exports, instanceSDK)
```

SDK 深度冻结与防御性克隆
为了防止恶意应用通过修改 SDK 属性（如劫持 useState）实施原型链污染或跨应用攻击，系统实施了双重防护：
SDK 冻结：利用 safeDeepFreeze 递归冻结 SDK 对象。
State 阻断：在寄生模式（Parasitism）或桥接模式（Bridge）下，由于子应用与宿主共享部分执行栈，系统通过 deepCloneAndFreeze 阻断 state 的引用传递。

```javascript
/\*\*

- 递归冻结 SDK，只保留 React 核心组件的渲染机能（跳过 React 内部对象）
  \*/
  const deepCloneAndFreeze = (obj, seen = new WeakMap()) => {
  if (obj === null || typeof obj !== 'object') return obj;
  // 跳过 React 内部组件，防止渲染挂掉
  if (key === 'React') {
  clone[key] = obj[key];
  return;
  }
  // ... 递归 Object.freeze
  };

// 在 SDK 工厂最后应用
export const createSdkForInstance = (...) => {
// ... 构建 AppSDK
return Object.freeze(AppSDK); // 彻底封锁 App 对 SDK 的篡改权
};
```

### Navigate 与 Kernel 的状态协同

子应用的路由跳转并非修改地址栏，而是一个 “状态请求”。
申请流程：应用调用 SDK.navigate(path)。
Action 分发：该调用被转化为一个 dispatch({ type: 'NAVIGATE', payload: path })。
内核处理：内核接收到该 Action 后，更新 State 树中对应 PID 的 router.path。
响应式渲染：DynamicRenderer 监测到 state 变化，触发 AppInternalRenderer 重新计算当前路径对应的组件 Key。

```javascript
// 在 SDK 内部封装的 navigate 钩子
const privateScope = {
  navigate: path => dispatch({ type: 'NAVIGATE', payload: path })
}

// 在 DynamicRenderer 中响应 state.router.path
const currentPath = state.router?.path || 'home'
const RawPage = modules[currentPath]?.Component
```

### Dispatch 通信模型

dispatch 是应用与外部世界的唯一交互通道。

```javascript
  dispatch(pid, action) {
  //实际还是 UI 触发只是会区分给 kernel 还是 worker
  const p = this.processes.get(pid)
  const isSystem=this.isSystemApp(pid)
  if (!p) return
  if (action.type === 'KERNEL_CALL' && action.payload) {
    //区分系统和非系统 应用处理器
    isSystem ? this.#systemSwitch(p,action.payload) : this.#notSystemSwitch(p,action.payload)
    return
  }
  //非内核事件,转发给对应的 worker 进程
  p.worker.postMessage({ type: 'UI_ACTION', payload: action })
}

```

# 通信架构

## dispatch

```javascript

执行流程:
worker:存储逻辑和内存信息
UI:通过调用 dispatch 和对应 worker 的 action
worker:触发更新,执行对应的行为,更新 State,并发送消息
kernel:监听到 worker 消息,执行 app 的订阅更新 state

dispatch(pid, action) {
//实际还是 UI 触发只是会区分给 kernel 还是 worker
const p = this.processes.get(pid)
const isSystem=this.isSystemApp(pid)
if (!p) return
if (action.type === 'KERNEL_CALL' && action.payload) {
//区分系统和非系统 应用处理器
isSystem ? this.#systemSwitch(p,action.payload) : this.#notSystemSwitch(p,action.payload)
return
}
//非内核事件,转发给对应的 worker 进程
p.worker.postMessage({ type: 'UI_ACTION', payload: action })
}
```

## APP 的 state 更新

见 APP 注入 state

```javascript
subscribeApp(pid, cb) {
if (!this.subscribers.has(pid)) this.subscribers.set(pid, new Set())
this.subscribers.get(pid).add(cb)
const cached = this.stateCache.get(pid)
if (cached) cb({ type: 'STATE', payload: cached })
return () => this.subscribers.get(pid)?.delete(cb)
}

```

## 内核订阅

```javascript
this.eventBus=new EventTarget()
subscribeSystem(cb) {
  const handler = () => {
  // console.log('触发订阅', cb)
  cb()
  };
  this.eventBus.addEventListener('sys_change', handler)
  return () => {
  this.eventBus.removeEventListener('sys_change', handler)
  };
}
需要触发就执行:this.eventBus.dispatchEvent(new Event('sys_change'))
```

# 安全相关

## iframe 处理

**逻辑解析：**
SukinOS 并不简单地使用 Iframe 渲染，而是将其分为两种模式：

- **物理沙箱 (`IframeSandbox`)**：通过独立的 `iframe` 容器阻断 DOM 树的直接遍历。
- **幽灵沙箱 (`Ghost Sandbox`)**：仅作为 JS 执行上下文的单例 Iframe。它不显示 UI，仅负责执行那些需要“桥接”到宿主 UI 的逻辑。

**核心代码实现：**

```javascript
// 幽灵沙箱：通过 Object.defineProperty 封锁原生持久化 API
const getGhostSandbox = () => {
  if (ghostIframeInstance) return ghostIframeInstance
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  ghostIframeInstance = iframe.contentWindow

  const restrictApis = ['indexedDB', 'localStorage', 'sessionStorage']
  restrictApis.forEach(api => {
    Object.defineProperty(ghostIframeInstance, api, {
      get: () => {
        throw new Error(`拒绝直接访问原生 API: ${api}`)
      },
      configurable: false
    })
  })
  return ghostIframeInstance
}
```

## shadowDom 处理 & 样式隔离处理

系统通过 scopeCss 动态改写子应用上传的样式字符串。由于子应用挂载在 #proc-${pid} 容器下，所有的 CSS 选择器都会被强制增加该前缀，从而模拟 Shadow DOM 的封装特性，防止子应用修改宿主按钮颜色或布局。

```javascript
// 样式注入提供者：为 Iframe 内部创建独立的 Emotion 缓存
const IframeStyleProvider = memo(({ children, containerNode }) => {
  const [cache, setCache] = useState(null)
  useEffect(() => {
    if (!containerNode) return
    const myCache = createCache({
      key: 'iframe-mui',
      container: containerNode.ownerDocument.head, // 将样式注入到隔离的 head
      prepend: true
    })
    setCache(myCache)
  }, [containerNode])
  return <CacheProvider value={cache}>{children}</CacheProvider>
})
```

## localStorage,indexDb 等

这是 SukinOS 安全性的核心。不同应用可能使用相同的 Key（如 config），为了防止 A 应用覆盖 B 应用的数据，系统通过 Proxy 模式对 Storage 进行了 PID 命名空间化。

```javascript
- 基于 PID 的 Storage 代理
- 逻辑：自动在 key 前面增加 pid-${pid}_ 前缀

const createStorageProxy = (storage, pid) => {
  const prefix = `pid-${pid}\_`;
  return new Proxy(storage, {
  get(target, prop) {
  // 拦截 getItem，自动添加前缀
  if (prop === 'getItem') return (key) => target.getItem(prefix + key);
  // 拦截 setItem，强制添加前缀
  if (prop === 'setItem') return (key, value) => target.setItem(prefix + key, value);
  // 拦截 clear，只清理属于当前 PID 的 key
  if (prop === 'clear') return () => {
  Object.keys(target).forEach(k => k.startsWith(prefix) && target.removeItem(k));
  };
  // ... 绑定 target 上下文
  const value = Reflect.get(...arguments);
  return typeof value === 'function' ? value.bind(target) : value;
  }
  });
  };
```

## winodw 处理

系统构建了一个 \_safeGlobalProxy，并将其重新映射到 window、self 和 globalThis。
循环引用保护：当应用通过 window.window 或 self.globalThis 尝试获取原生对象时，Proxy 会递归返回 \_safeGlobalProxy，确保应用永远无法逃逸到真实的原生全局环境。
Document 隔离：所有对全局 document 的访问都会被重定向到上文提到的 \_safeDocumentProxy，从而确保 CDN 拦截逻辑在任何角落都生效。

```javascript
const _safeProxyHandler = {
  get(target, prop) {
    // 拦截自循环引用，防止逃逸
    if (prop === 'window' || prop === 'self' || prop === 'globalThis') {
      return _safeGlobalProxy
    }
    // 强制返回受控的 document 代理
    if (prop === 'document') {
      return _safeDocumentProxy
    }
    // ...
  }
}
```

## XHR 和 Fetch 处理

系统通过“作用域覆盖（Scope Shadowing）”技术，将全局 fetch 替换为 SDK 提供的受控版本。
优先策略：如果 AppSDK 中存在经过进程标记（注入了 PID Header）的 fetch，则优先使用。
透明感知：对于子应用开发者，调用的依然是 fetch(...)，但底层已自动完成了请求源的身份注入，实现了全链路的安全审计。

```javascript
// 在编译后的闭包作用域中强制遮蔽全局 fetch
const _safeFetch = (AppSDK && AppSDK.API && AppSDK.API.fetch)
? AppSDK.API.fetch
: globalThis.fetch;
--- 在沙箱块级作用域内部 ---
{
const fetch = _safeFetch; // 遮蔽原生的 fetch
// ... 执行 App 逻辑
}
```

为了彻底消除传统 AJAX 带来的安全盲点（由于 XHR 的 API 设计过于陈旧，难以通过 Proxy 完美无缝劫持），SukinOS 采取了 “激进阻断”策略。
定义清空：在沙箱块级作用域内，将 XMLHttpRequest 直接显式定义为 undefined。
强制转型：这迫使子应用开发者必须使用现代的、受系统监管的 fetch API，从而保证所有网络流量都经过内核的 Header 标记处理器。

```javascript
const XMLHttpRequest = undefined // 彻底切断 XHR 访问路径
```

## CDN 等外链处理 & SW 注册风险

**逻辑解析：**
系统不再被动等待资源加载，而是在 **DOM 节点创建阶段** 进行拦截。

- **白名单机制**：通过 `TRUSTED_CDN_WHITELIST` 配置准入域名。
- **createElement 劫持**：通过 `_safeDocumentProxy` 劫持 `document.createElement`。
- **属性 Setter 监控**：一旦应用尝试创建 `script` 或 `link` 标签，系统会利用 `Object.defineProperty` 劫持其 `src` 或 `href` 属性。
- **双重路径保护**：同时劫持原生 `setAttribute` 方法，防止开发者通过 `el.setAttribute('src', ...)` 绕过属性赋值检查。

**核心函数逻辑：**

```javascript
// 在沙箱前导码中定义的准入检查
const _isUrlAllowed = url => {
  if (!url) return true
  // 允许相对路径和内存 Blob 对象
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('blob:'))
    return true
  // 仅允许白名单内的 CDN 域名
  return _TRUSTED_CDN.some(domain => url.startsWith(domain))
}

// 拦截 document.createElement
if (tag === 'script' || tag === 'link') {
  // 劫持 src/href 的 setter
  Object.defineProperty(el, attr, {
    set: v => {
      if (_isUrlAllowed(v)) el.setAttribute(attr, v)
      else
        throw new Error(
          "Security Error: CDN URL '" + v + "' is not whitelisted."
        )
    }
  })
}
```
