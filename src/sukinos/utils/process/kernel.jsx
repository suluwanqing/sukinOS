import IndexDb from './indexDb'
import { BabelLoader } from './babelLoader'
import { DB_SYS, DB_RES,DB_STATE_INSTANCE,DB_INSTANCE_ID} from '@/sukinos/utils/config'
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_META_INFO,
  ADMIN_APP_IDS
} from '@/sukinos/utils/config'
import { PRESET_RESOURCES } from '@/sukinos/resources/preset_resources'
import { generateWorker} from './generateWorker'
import { alert } from "@/component/alert/layout"
import {
  extInspectZombieFile, extUploadCloud, extExecuteInstallation, extSyncResourcesToFiles,
  extWriteAppFile, extUploadResource, extSyncRegistry,
  extUpdateApp,extDeleteApp,extSyncRegistryByRes
} from "./generateApp"

class Kernel {
  // --- 队列管理属性 ---
  #installQueue = []; // 安装任务队列
  #isProcessingQueue = false; // 队列执行锁

  constructor() {
    //---stroeDispatch---方便对仓库的操作
    this.storeDispatch = null//注意因为我们的命名上已经有一个dispatch,避免同名文题,直接这样处理。

    // --- 持久化存储 ---
    this.sysDb = new IndexDb(DB_SYS) // 负责存储用户应用的注册表信息 (IndexedDB)[app.name为主键]
    this.resDb = new IndexDb(DB_RES)// 负责存储所有应用的源资源，如代码、元数据等 (IndexedDB)[app.id为主键]
    this.dirHandle = null// 用户授权的本地文件系统目录句柄
    this.instanceDb = new IndexDb(DB_STATE_INSTANCE) //管理有状态
    // --- 运行时状态管理核心 ---
    // 此 Map 存储所有已启动的 Worker 进程实例。
    // 无论是 'RUNNING' (活动) 还是 'HIBERNATED' (休眠) 状态的应用，只要它的进程在运行，就会在这里有记录。
    this.processes = new Map() // 存储: { pid -> { worker, url ,pid} }

    // 应用的内存注册表，作为运行时的唯一真实数据源，保证了高性能和状态一致性。
    this.systemApps = new Map() // 存储系统应用的元数据
    this.userApps = new Map()   // 存储用户应用的元数据，在init时从sysDb加载
    this.resourceIdToPid = new Map()
    this.pidToResourceId = new Map()

    // --- 缓存与事件通信 ---
    this.subscribers = new Map() // UI组件订阅应用状态变化的集合
    this.stateCache = new Map() // 缓存来自应用Worker的最新UI状态，用于新订阅者立即获取
    this.resourceCache = {} // 所有应用资源的缓存 (代码逻辑、内容等)
    this.eventBus = new EventTarget() // 用于系统级事件的发布/订阅

    // --- 预设与会话 ---
    this.presetResourceIds = new Set() // 预设资源的ID集合，用于特殊处理 (如禁止写入,和修改,实际应该更多处理,如版本控制等,字符标胶)
    this.currentUser = null // 当前登录的用户信息
  }
  // 检查一个PID是否属于系统应用
  isSystemApp(pid) {
    return this.systemApps.has(pid)
  }
  //存入仓库操作帧
  setDispatch(dispatch) {
    this.storeDispatch = dispatch
  }
  // 内核初始化函数
  async init(info) {
    const {user,config } = info
    const { isPrivate}=config
    //立即保存用户信息，以便后续 generateApp 逻辑能访问权限状态
    this.currentUser = user
    try {
      this.dirHandle = isPrivate ? await navigator.storage.getDirectory() : await window.showDirectoryPicker({ mode: 'readwrite', id: 'sukin-os' })
    } catch (e) {
      alert.warning('用户取消打开！')
      return false
    }

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
  }
  /*================================================提供给外部依赖调用的公开代理================================*/
  // 因为带有 # 的私有属性无法在 generateApp.js 中直接调用，所以这里抛出同名的代理函数
  enqueueInstallTask(task) {
    this.#installQueue.push(task);
    this.#processInstallQueue();
  }
  updateUserAppInfo(pid, info) {
    this.#updateUserAppInfo(pid, info);
  }
  emitChange(info) {
    this.#emitChange(info);
  }
  inspectZombieFile(fileHandle) {
    return this.#inspectZombieFile(fileHandle);
  }
  kill(pid) {
    this.#kill(pid);
  }
  getPidByResourceId(resId) {
    return this.#getPidByResourceId(resId);
  }
  getApp(pid) {
    return this.#getApp(pid);
  }
  getResourceIdByPid(pid) {
    return this.#getResourceIdByPid(pid);
  }
  uploadCloud(data) {
    return this.#uploadCloud(data);
  }

  /*================================================内部私有函数==============================================*/
  // 初始化系统应用数据到=>内存注册表
  #initializeSystemApps() {
    for (const preset of PRESET_RESOURCES) {
      const presetResId = preset?.[ENV_KEY_RESOURCE_ID];
      // 跳过 ADMIN_APP_IDS 中的应用

      if (ADMIN_APP_IDS.includes(presetResId) && !this.currentUser?.root) {
        continue;
      }

      // 通过,就注册为系统资源
      this.presetResourceIds.add(presetResId);
      // 直接拿系统预设
      const pid =presetResId
      const appName = preset?.[ENV_KEY_NAME];

      // 获取从 sysDb 加载的覆盖记录
      const dbOverride = this.userApps.get(pid);
      // 默认使用预设配置
      let finalMeta = preset?.[ENV_KEY_META_INFO];
      // 系统应用刷新后，默认状态永远是 INSTALLED，savedState 永远是 null
      let status = 'INSTALLED';
      let savedState = null;
      if (dbOverride) {
        // 仅合并 metaInfo 中的 custom 部分
        finalMeta = {
          ...preset?.[ENV_KEY_META_INFO],
          custom: {
            ...(preset?.[ENV_KEY_META_INFO]?.custom || {}),
            ...(dbOverride?.[ENV_KEY_META_INFO]?.custom || {})
          }
        };
        // 如果该应用在 custom 里配置了开机自启，
        // 我们保持它的状态为 INSTALLED，后续 restoreSession 会根据 finalMeta.custom.autoStart 启动它
        // 从 userApps 临时区清理
        this.userApps.delete(pid);
        // console.log(`[内核] 系统应用 ${appName} 已应用自定义图标/配置。`);
      }

      // 注入内存注册表
      this.#updateSystemAppInfo(pid, {
        pid,
        [ENV_KEY_NAME]: appName,
        [ENV_KEY_RESOURCE_ID]: presetResId,
        savedState: savedState, // 强制为 null
        status: status,         // 强制为 INSTALLED
        isSystemApp: true,
        [ENV_KEY_META_INFO]: finalMeta
      });
      this.pidToResourceId.set(pid, presetResId);
      this.resourceIdToPid.set(presetResId, pid);
    }
  }
  // 僵尸文件检查逻辑
  async #inspectZombieFile(fileHandle) {
    return extInspectZombieFile(this, fileHandle);
  }

  //更新系统的sys信息,注意系统只有内存有注册表
  #updateSystemAppInfo(pid, info) {
    this.systemApps.set(pid, info)
  }
  //更新用户app信息
  #updateUserAppInfo(pid, info) {
    this.userApps.set(pid, info)
  }

  //从indexDb获取用户的注册表=>内存注册表。
  async #loadUserAppsFromDb() {
    if (!this.sysDb.isOpen()) await this.sysDb.openDB()
    const allUserApps = await this.sysDb.getAllData()
    allUserApps.forEach(app => {
      this.#updateUserAppInfo(app.pid, app);
      this.resourceIdToPid.set(app?.[ENV_KEY_RESOURCE_ID], app.pid) //处理关于直接用resourceId启动的兼容
      this.pidToResourceId.set(app.pid, app?.[ENV_KEY_RESOURCE_ID])
    })
  }

  //为了兼容无法直接获取pid的地方
  #getPidByResourceId(resourceId) {
    return this.resourceIdToPid.get(resourceId)
  }
  #getResourceIdByPid(pid) {
    return this.pidToResourceId.get(pid)
  }

  /**
   * 队列执行器：顺序处理安装/注册任务
   */
  async #processInstallQueue() {
    if (this.#isProcessingQueue || this.#installQueue.length === 0) return;
    this.#isProcessingQueue = true;
    while (this.#installQueue.length > 0) {
      const task = this.#installQueue.shift();
      try {
        await task();
      } catch (err) {
        console.error("[内核队列] 执行任务失败:", err);
      }
    }
    this.#isProcessingQueue = false;
  }

  #kill(pid) {
    const p = this.processes.get(pid)
    if (p) { p.worker.terminate(); URL.revokeObjectURL(p.url); this.processes.delete(pid); }
  }
  #getApp(pid) {
    return this.systemApps.get(pid) || this.userApps.get(pid)
  }
  //云端上传App
  async #uploadCloud(data) {
    return extUploadCloud(this, data);
  }

  #emitChange(info) {
    //暂时仅仅处理变化
    this.eventBus.dispatchEvent(new Event('sys_change'))
  }
  #notify(pid, type, data) {
    this.subscribers.get(pid)?.forEach(cb => cb({ type, payload: data }))
  }

  // --- 接收来自Worker消息处理[目前只有特性消息处理器] ---
  async #handleMsg(pid, msg) {
    if (msg.type === 'STATE_UPDATE') {
      this.stateCache.set(pid, msg.payload)
      this.#notify(pid, 'STATE', msg.payload)
    } else if (msg.type === 'SAVE_STATE') {
      const app = this.#getApp(pid)
      if (app) {
        if (!app.savedState) app.savedState = { app: null, window: null }
        app.savedState.app = msg.payload
        if (!app.isSystemApp) {
          await this.sysDb.updateData(app?.[ENV_KEY_NAME], { savedState: app.savedState })
        }
      }
    }
  }

  #systemSwitch(p, payload) {
    const { method, args } =payload
    switch (method) {
      case 'UPLOAD_RESOURCE': {
        //这里是旧架构原因这里保持
        this.uploadResource(args)
          .then(() => p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'MSG', payload: '应用安装成功！' } }))
          .catch(e => p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'MSG', payload: `错误: ${e.message}` } }))
        break
      }
      // case 'LOGIN': {
      //    if (this.login(args.userId, args.userName)) {
      //     p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'USER_UPDATE', payload: this.currentUser } })
      //   }
      //   break
      // }
      // case 'LOGOUT': {
      //   this.logout();
      //   p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'USER_UPDATE', payload: null } })
      //   break
      // }
      default: {
        alert.warning('未找到对应处理器!')
        break
       }
    }
  }

  //更新resource的custom配置
  //修改 sysDb [注册表实例]更为合理，因为 custom 属于应用运行时的个性化配置
async updateResourceCustom(data) {
    const { resourceId, custom } = data;
    const pid = this.#getPidByResourceId(resourceId);
    if (!pid) {
      // console.error(`[内核] 未找到资源 ID ${resourceId} 对应的 PID`);
      return;
    }
    const app = this.#getApp(pid);
    if (!app) return;
    //构建全新的 metaInfo (确保引用变化，触发 UI 刷新)
    const oldMeta = app[ENV_KEY_META_INFO] || {};
    const newMetaInfo = {
      ...oldMeta,
      custom: {
        ...(oldMeta.custom || {}),
        ...custom
      }
    };
    // 构建更新后的应用对象
    const updatedApp = {
      ...app,
      [ENV_KEY_META_INFO]: newMetaInfo
    };
    // 同步到内存状态机
    if (app.isSystemApp) {
      this.systemApps.set(pid, updatedApp);
    } else {
      this.userApps.set(pid, updatedApp);
    }


    // 无论是否系统应用，都要存入注册表，以便刷新后恢复 custom
    // 我们使用 putData 确保如果记录不存在则创建，存在则更新
    await this.sysDb.putData(updatedApp);

    // console.log(`[内核] ${app[ENV_KEY_NAME]} 配置已持久化至注册表`);
  //所以不再更新到res即可因为系统APP我们也处理一下
  /*
      // 同步更新资源缓存和 resDb,这个是可选的因为安装后app都是走sys除非版本更新但是没必要,可以从sys拿信息
     const updatedResource = {
       ...resource,
       [ENV_KEY_META_INFO]: newMetaInfo
     };
    this.resourceCache[resourceId] = updatedResource;
    await this.resDb.putData(updatedResource);
    if (newMetaInfo?.syncLocal) {
        await this.writeAppFile(updatedResource);
    }
  */
    // 发出全局变更通知
    this.emitChange();

    return updatedApp;
  }

  #notSystemSwitch(p,payload) {
    const { method, args } =payload
    switch (method) {
        default: {
          alert.warning('未找到对应处理器!')
          break
       }
    }
  }

  #getProcessApp(pid) {
    return this.processes.get(pid)
    //先暂时统一,避免后续需要新的写入比较
  }

  /*================================================公共 API (供UI层调用)=================================*/

  /**
   * 执行安装/注册行为的公共函数 (通过队列处理避免阻塞和冲突)
   */
  async executeInstallation(params) {
    return extExecuteInstallation(this, params);
  }

  getRunningApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()]
    return allApps.filter(app => app.status === 'RUNNING')
  }
  getHibernatedApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()]
    return allApps.filter(app => app.status === 'HIBERNATED')
  }
  getInstalledApps() {
    const allApps =[...this.userApps.values()];
    return allApps
  }
  getBlockEdApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()]
    return allApps.filter(app => app?.[ENV_KEY_META_INFO]?.custom?.blockEd)
    //custom是用户个人习惯,在安装的时候进行注入但是系统App会设置某些字段不允许被注入
    //这里考虑版本更新的跳过等等
  }
  getTypeApps(appType) {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()]
    return allApps.filter(app => app?.[ENV_KEY_META_INFO]?.appType === appType)
  }
  async getApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()]
    return allApps.map(a => ({ ...a, isRunning: this.processes.has(a.pid) }))
  }
  // 获取资源,因为都是加载到内存里的
  getResource(resourceId) { return this.resourceCache[resourceId] }

  //处理预先资源的启动
  async ensurePresets() {
    //处理系统资源
    if (!this.resDb.isOpen()) await this.resDb.openDB()
    for (const preset of PRESET_RESOURCES) {
      const presetResId = preset?.[ENV_KEY_RESOURCE_ID];
      if (ADMIN_APP_IDS.includes(presetResId) && !this.currentUser?.root) {
        continue

      }
      await this.resDb.putData(preset)
    }
    //---处理instance
    if (!this.instanceDb.isOpen()) {
      await this.instanceDb.openDB()
      await this.instanceDb.clearAll() //清除所有旧的状态
    }
    //更新系统句柄
    await this.instanceDb.putData({ id: DB_INSTANCE_ID, dirHandle: this.dirHandle })
  }

  //加载资源到内存
  async loadAllResources() {
    if (!this.resDb.isOpen()) await this.resDb.openDB()
    const all = await this.resDb.getAllData()
    this.resourceCache = {}
    all.forEach(res => this.resourceCache[res?.[ENV_KEY_RESOURCE_ID]] = res)
  }

  // --- 文件系统同步 ---
  async syncResourcesToFiles() { //将从注册表indexDb读取的用户资源写入/同步至本地,可以在这里做版本验证
    return extSyncResourcesToFiles(this);
  }
  //注意认为id是唯一的,name就是app的名字,允许多安装
  async writeAppFile(res) {
    //写入app状态信息到本地
    return extWriteAppFile(this, res);
  }
  //资源[app]上传,注意并没有分配pid,pid分配依赖注册表同步[这里的核心是优先创建worker，通过注册表更新资源]
  async uploadResource(params) {
    return extUploadResource(this, params);
  }

  /**
   * 通过indexDb的注册表[此时还没有检测本地apps]:去管理本地文件系统的资源和indexDb的资源
   * 这是一个核心维护函数，确保文件系统、内存和数据库三者之间的数据一致性。
   * 它处理 "僵尸文件" (物理文件存在但无注册记录) 和 "孤儿记录" (注册记录存在但无物理文件),他只负责文件句柄的删除
   * 这里实际应该做版本和服务校验,放置本地端被修改,默认采用本地模式。
   */
  async syncRegistry() {
    return extSyncRegistry(this);
  }
  // 通过资源IndexDb去注册
  async syncRegistryByRes() {
    return extSyncRegistryByRes(this)
  }
  //更新App//更新App
  async updateApp(params) {
    return extUpdateApp(this, params);
  }

  //安装App这里后续实际可以考虑把所有整合简约一下
  async installApp(params) {
    const {worker,version}=params
    return this.executeInstallation({ mode: 'INSTALL_APP', data: { worker, version } });
  }


  //App间交互
  async appIntereact({ process, interactInfo }) {//这里为了后续方便优化提取出来
    process.postMessage({ type: "APP_INTERACT", payload: interactInfo })
  }
  //返回instanceDb
  async getInstanceDb() {
    return this.instanceDb
  }

  /**
   * 启动一个应用进程
   * 这是一个核心的调度方法，它能处理冷启动和从休眠状态恢复两种情况。
   * interactInfo应该是一个对象对应用户的reducer开发处理
   function reducer(state[自动注入], action[App交互传输的interactInfo]) {
      switch(action.type) {
        case 'INCREMENT':
          return { ...state, count: state.count + 1 };
        default:
          return state;
      }
    }`;
  **/
  async startProcess({ pid, resourceId, interactInfo }) {
    let truthPid = pid
    let truthResourceId=resourceId
    if (!truthPid) {
      //那么这里实际是resourceId,这里为了兼容,处理一下不再过多修改
      truthPid = this.#getPidByResourceId(resourceId)
    }
    if (!truthResourceId) {
      truthResourceId=this.#getResourceIdByPid(truthPid)
    }
    const app = this.#getApp(truthPid)
    if (!app) {
      alert.warning(`[内核] 尝试启动一个不存在的应用，pid: ${truthPid}`)
    }
    //无论何种情况，都先准备好将要返回的窗口几何信息。
    // 这保证了API的调用者总能获得预期的返回值。
    const resource = this.getResource(truthResourceId)
    //进程已在运行 (Worker实例已存在)
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
        // 无论之前是 HIBERNATED 还是 RUNNING，都通知UI并返回窗口状态
        this.#notify(truthPid, 'STATE', this.stateCache.get(truthPid))
        return {
          isStart: true
        }
      }
      catch (error) {
        return {
          isStart: false
        }
      }
    }

    // 进程未运行 (冷启动)
    try {
      let workerCode
      if (app?.isSystemApp) {
        // 系统资源一定是不在文件映射中
        if (!resource) throw new Error(`系统资源 '${app?.[ENV_KEY_NAME]}' 未找到!`)
        workerCode = generateWorker(resource)
      } else {
        // 原有的架构是非系统都将进入到本地中。新引入了:本地同步可选机制。
        // 兼容处理,处理没有进行本地同步的APP,这个时候认为是进入到了资源缓存中
        // 先检查 app 和 app.handle 是否存在
        if (app && app.handle) {
          if ((await app.handle.queryPermission({ mode: 'read' })) !== 'granted') {
            await app.handle.requestPermission({ mode: 'read' });
            const file = await app.handle.getFile()
            workerCode = await file.text()
          } else {
            workerCode = generateWorker(resource)
          }
        } else {
          workerCode = generateWorker(resource)
        }
    }
      const url = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }))
      const worker = new Worker(url, { name: truthPid })
      this.processes.set(truthPid, { worker, url })
      worker.onmessage = e => this.#handleMsg(truthPid, e.data)
      // 发送初始化或恢复状态的消息
      const stateToRestore = app.savedState?.app
      worker.postMessage({ type: stateToRestore ? 'RESTORE' : 'INIT', payload: stateToRestore })
      if (interactInfo) {
        this.appIntereact({ process: worker, interactInfo })
      }
      // 更新内存和DB中的状态为 'RUNNING'
      app.status = 'RUNNING'
      if (!app.isSystemApp) {
        await this.sysDb.updateData(app?.[ENV_KEY_NAME], { status: 'RUNNING' })
      }
      this.#emitChange()
      return {
        isStart:true
      }
    } catch (e) {
      // console.log(e)
      alert.warning(`[内核] 启动应用 ${app?.[ENV_KEY_NAME]} (pid: ${truthPid}) 失败:`, e)
      this.#kill(truthPid) // 启动失败时清理进程
      return {
        isStart:false
      }
    }
  }


  //存储这个关于,窗口状态,后续可以考虑多模式处理,是冷启动还是热。主要方案1.适用display全部热启动。方案二:外壳全部display,内层冷启动
  async saveWindowState(pid, windowRect) {
    const app = this.#getApp(pid)
    if (!app) return
    if (!app.savedState) app.savedState = { app: null, window: null }
    app.savedState.window = windowRect
    if (!app.isSystemApp) {
      await this.sysDb.updateData(app?.[ENV_KEY_NAME], { savedState: app.savedState })
    }
  }

  /**
   * 强制所有正在运行的应用保存其内部状态。
   * 这个接口主要用于页面关闭前（例如在 beforeunload 事件中调用），
   * 以确保所有应用的最新状态都被持久化，从而实现完美的会话恢复。
   */
  forceSaveAllStates() {
    // alert.success('[内核] 正在强制保存所有应用状态...')
    for (const pid of this.processes.keys()) {
      const p = this.processes.get(pid)
      if (p && p.worker) {
        // 向每个 worker 发送保存状态的指令。
        // 这是一个“即发即忘”的操作，因为 beforeunload 事件的执行时间有限，我们不等待回复。
        p.worker.postMessage({ type: 'SAVE_STATE' })
      }
    }
    // alert.success('[内核] 已向所有活动进程发送保存状态指令。')
  }

  /**
   * 休眠一个应用。
   * 此操作只改变应用的状态标记为 'HIBERNATED'，不会终止Worker进程。
   * Worker会继续在后台运行，保持其内部状态是“热”的。
   */
  async hibernate(pid) {
    const app = this.#getApp(pid)
    if (app && app.status === 'RUNNING') {
      // 更新内存状态
      app.status = 'HIBERNATED'
      // 如果是用户应用，立即同步到数据库
      if (!app.isSystemApp) {
        // 写入 status 的同时，写入 savedState
        // 这里的 app.savedState 应该是最新的，因为 #handleMsg 里的 STATE_UPDATE 一直在实时更新它
        await this.sysDb.updateData(app?.[ENV_KEY_NAME], {
          status: 'HIBERNATED',
          savedState: app.savedState
        });
      } else {
        //也更新状态,因为我们新增了display模式
        this.#updateSystemAppInfo(pid, { ...this.systemApps.get(pid), status: 'HIBERNATED' })
      }
      // alert.success(`[内核] 应用 ${app.name} 已休眠并保存进度。`)
      this.#emitChange('休眠')
    }
  }


/**
 * 强制清除应用的持久化运行状态
 */
async clearAppSavedState(pid) {
  const app = this.#getApp(pid)
  if (app) {
    app.savedState = null // 强制清除内存中的状态
    const appName = app[ENV_KEY_NAME] || '未知应用'

    // 数据库更新（非系统应用）
    if (!app.isSystemApp) {
      await this.sysDb.updateData(appName, { savedState: null })
    }
    // console.log(`[内核] 应用 ${appName} (pid: ${pid}) 的持久化状态已被清空。`)
    this.#emitChange()
  }
}

/**
 * 强制完全重置一个应用，无视配置直接清空状态并杀死进程
 * 用于用户主动发起的重置操作
 */
async forceResetApp(pid) {
  // 终止进程
  this.#kill(pid)
  // 清理缓存
  this.stateCache.delete(pid)
  // 获取应用信息
  const app = this.#getApp(pid)
  if (app) {
    const appName = app[ENV_KEY_NAME] || '未知应用'
    // 更新应用状态为已安装
    app.status = 'INSTALLED'

    if (!app.isSystemApp) {
      await this.sysDb.updateData(appName, { status: 'INSTALLED' })
    }

    // 无视配置文件，强制清空状态
    await this.clearAppSavedState(pid)
    console.log(`[内核] 应用 ${appName} (pid: ${pid}) 已被彻底重置并强制清空了所有状态。`)
  }
  // 通知状态变更
  this.#emitChange()
}

/**
 * 强制关闭一个应用 (与hibernate不同)。
 * 此操作会彻底终止Worker进程，根据配置决定是否清除已保存状态。
 * @param {string|number} pid - 应用进程ID
 */
async forceKillProcess(pid) {
  // 终止进程
  this.#kill(pid)
  // 清理缓存
  this.stateCache.delete(pid)
  // 获取应用信息
  const app = this.#getApp(pid)
  if (app) {
    const appName = app[ENV_KEY_NAME] || '未知应用'
    // 更新应用状态
    app.status = 'INSTALLED'

    if (!app.isSystemApp) {
      await this.sysDb.updateData(appName, { status: 'INSTALLED' })
    }

    // 检查是否需要自动清除保存的状态
    const shouldClearState = !app?.[ENV_KEY_META_INFO]?.saveState
    if (shouldClearState) {
      await this.clearAppSavedState(pid)
    }

    console.log(`[内核] 应用 ${appName} (pid: ${pid}) 已被强制关闭，状态已重置。`)
  }
  // 通知状态变更
  this.#emitChange()
}
  async reStartApp({ pid}) {
    this.#kill(pid)
    const result=this.startProcess({pid})
    this.#emitChange()
    return result
  }
  async forceReStartApp({ pid }) {
    this.#kill(pid)
    this.stateCache.delete(pid)
    const app = this.#getApp(pid)
    if (app) {
      app.status = 'INSTALLED'
      if (!app.isSystemApp) {
        await this.sysDb.updateData(app?.[ENV_KEY_NAME], { status: 'INSTALLED' })
      }

      if (!app?.[ENV_KEY_META_INFO]?.saveState) {
        await this.clearAppSavedState(pid)
      }
      console.log(`[内核] 应用 ${app?.[ENV_KEY_NAME]} (pid: ${pid}) 已被强制关闭，状态已重置。`)
    }
    const result = this.startProcess({ pid })
    this.#emitChange()
    return result
  }

  //删除非系统内置App
  async deleteApp(params) {
    return extDeleteApp(this, params);
  }

  // --- 系统恢复与进程管理 ---
 async restoreSession() {
    try {
      const allApps = [...this.systemApps.values(), ...this.userApps.values()]
      const appsToRestore = allApps.filter(a =>
        a.status === 'RUNNING' ||
        a.status === 'HIBERNATED' ||
        a?.[ENV_KEY_META_INFO]?.custom?.autoStart === true
      );
      // 由于这个system也介入了自动启动这里不再单独处理
      for (const app of appsToRestore) {
         //加入开机自启的选项
        // new Promise.all([])
        // 异步启动，不阻塞主流程
        this.startProcess({ pid: app.pid });
      }
    }
    catch (err) {
      console.error("[内核] 会话恢复失败:", err);
    }
  }

  //拉起/唤起App
  async evokeApp({ pid, from, interactInfo }) {
    const tragetApp = await this.#getApp(pid)
    if (!tragetApp) { alert.failure('唤起失败!App未注册或已删除!') }
    const p = await this.#getProcessApp(pid)
    const newInteractInfo={...interactInfo, from} //注入from[App]信息
    if (p) {
      this.appIntereact({ process: p.worker, interactInfo: newInteractInfo })
    } else {
      this.startProcess({ pid, interactInfo: newInteractInfo })
    }
  }

  /*======================================事件分发与订阅====================================*/
  /*
    执行流程:
        worker:存储逻辑和内存信息
        UI:通过调用dispatch和对应worker的action
        worker:触发更新,执行对应的行为,更新State,并发送消息
        kernel:监听到worker消息,执行app的订阅更新state
  */
  dispatch(pid, action) {
    //实际还是UI触发只是会区分给kernel还是worker
    const p = this.processes.get(pid)
    const isSystem=this.isSystemApp(pid)
    if (!p) return
    if (action.type === 'KERNEL_CALL' && action.payload) {
      //区分系统和非系统 应用处理器
       isSystem ? this.#systemSwitch(p,action.payload)  :  this.#notSystemSwitch(p,action.payload)
       return
    }
    //非内核事件,转发给对应的worker进程
    p.worker.postMessage({ type: 'UI_ACTION', payload: action })
  }

  //订阅App行为
  subscribeApp(pid, cb) {
    if (!this.subscribers.has(pid)) this.subscribers.set(pid, new Set())
    this.subscribers.get(pid).add(cb)
    const cached = this.stateCache.get(pid)
    if (cached) cb({ type: 'STATE', payload: cached })
    return () => this.subscribers.get(pid)?.delete(cb)
  }

  //订阅系统行为
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

    /*============================================系统App可用Api[逻辑层]========================================*/
  // login(userId, userName) {
  //   if (!userId || !userName) return false
  //   this.currentUser = { id: userId, name: userName }
  //   alert.success(`[内核] 用户 ${userName} (ID: ${userId}) 已登录。`)
  //   this.#emitChange()
  //   return true
  // }

  // logout() {
  //   alert.success(`[内核] 用户 ${this.currentUser?.name} 已登出。`)
  //   this.currentUser = null
  //   this.#emitChange()
  // }
}

export default new Kernel()
