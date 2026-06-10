import IndexDb from './indexDb'
import {DB_SYS, DB_RES, DB_STATE_INSTANCE, ENV_KEY_NAME} from '@/sukinos/utils/config'
import CommHub from './commHub'

// 子模块
import {Cache} from './kernelParts/cache'
import {Core} from './kernelParts/core'
import {Flags} from './kernelParts/flags'
import {Instance} from './kernelParts/instance'
import {Internals} from './kernelParts/internals'
import {Lifecycle} from './kernelParts/lifecycle'
import {Messaging} from './kernelParts/messaging'
import {Registry} from './kernelParts/registry'
import {ResourceAccess} from './kernelParts/resourceAccess'
import {Settings} from './kernelParts/settings'

class Kernel {
  // --- 队列管理属性 ---
  // #installQueue = []; // 安装任务队列
  // #isProcessingQueue = false; // 队列执行锁

  constructor() {
    //---stroeDispatch---方便对仓库的操作
    this.storeDispatch = null //注意因为我们的命名上已经有一个dispatch,避免同名文题,直接这样处理。

    // --- 持久化存储 ---
    this.sysDb = new IndexDb(DB_SYS) // 负责存储用户应用的注册表信息 (IndexedDB)[app.name为主键]
    this.resDb = new IndexDb(DB_RES) // 负责存储所有应用的源资源，如代码、元数据 等 (IndexedDB)[app.id为主键]
    this.dirHandle = null // 用户授权的本地文件系统目录句柄
    this.instanceDb = new IndexDb(DB_STATE_INSTANCE) //管理有状态
    // --- 运行时状态管理核心 ---
    // 此 Map 存储所有已启动的 Worker 进程实例。
    // 无论是 'RUNNING' (活动) 还是 'HIBERNATED' (休眠) 状态的应用，只要它的进程在运行，就会在这里有记录。
    this.processes = new Map() // 存储: { pid -> { worker, url ,pid} }

    // 应用的内存注册表，作为运行时的唯一真实数据源，保证了高性能和状态一致性。
    this.systemApps = new Map() // 存储系统应用的元数据
    this.userApps = new Map() // 存储用户应用的元数据，在init时从sysDb加载
    this.resourceIdToPid = new Map()
    this.pidToResourceId = new Map()

    // --- 队列管理属性 ---
    this.installQueue = [] // 安装任务队列
    this.isProcessingQueue = false // 队列执行锁

    // ─── 统一子模块 ───
    this.cache = new Cache(this)
    this.core = new Core(this)
    this.flags = new Flags(this)
    this.instance = new Instance(this)
    this.internals = new Internals(this)
    this.lifecycle = new Lifecycle(this)
    this.messaging = new Messaging(this)
    this.registry = new Registry(this)
    this.resourceAccess = new ResourceAccess(this)
    this.settings = new Settings(this)

    // --- 缓存与事件通信 ---
    // this.subscribers = new Map() // UI组件订阅应用状态变化的集合
    // this.stateCache = new Map() // 缓存来自应用Worker的最新UI状态，用于新订阅者立即获取
    this.resourceCache = {} // 所有应用资源的缓存 (代码逻辑、内容等)
    // this.eventBus = new EventTarget() // 用于系统级事件的发布/订阅
    this.commHub = new CommHub({
      onSaveState: async (pid, payload) => {
        const app = this.#getApp(pid)
        if (app) {
          if (!app.savedState) app.savedState = {app: null, window: null}
          app.savedState.app = payload
          if (!app.isSystemApp) {
            await this.sysDb.updateData(app?.[ENV_KEY_NAME], {savedState: app.savedState})
          }
        }
      },
      // 提供向目标 Worker 发送消息的消息通道（用于从系统推送主题消息给 App）
      sendToWorker: (pid, msg) => {
        const p = this.processes.get(pid)
        if (p && p.worker) {
          p.worker.postMessage(msg)
        }
      }
    })

    // --- 预设与会话 ---
    this.presetResourceIds = new Set() // 预设资源的ID集合，用于特殊处理 (如禁止写入,和修改,实际应该更多处理,如版本控制等,字符标胶)
    this.currentUser = null // 当前登录的用户信息
  }
  // 检查一个PID是否属于系统应用
  isSystemApp(pid) {
    return this.flags.isSystemApp(pid)
  }
  //存入仓库操作帧
  setDispatch(dispatch) {
    this.flags.setDispatch(dispatch)
  }
  // 内核初始化函数
  async init(info) {
    return this.core.init(info)
  }
  /*================================================提供给外部依赖调用的公开代理================================*/
  // 因为带有 # 的私有属性无法在 generateApp.js 中直接调用，所以这里抛出同名的代理函数
  enqueueInstallTask(task) {
    this.internals.enqueueInstallTask(task)
  }
  updateUserAppInfo(pid, info) {
    this.registry.updateUserAppInfo(pid, info)
  }
  emitChange(info) {
    this.messaging.emitChange(info)
  }
  inspectZombieFile(fileHandle) {
    return this.internals.inspectZombieFile(fileHandle)
  }
  kill(pid) {
    this.internals.kill(pid)
  }
  getPidByResourceId(resId) {
    return this.registry.getPidByResourceId(resId)
  }
  getApp(pid) {
    return this.registry.getApp(pid)
  }
  getResourceIdByPid(pid) {
    return this.registry.getResourceIdByPid(pid)
  }
  uploadCloud(data) {
    return this.internals.uploadCloud(data)
  }

  //更新系统的sys信息,注意系统只有内存有注册表
  updateSystemAppInfo(pid, info) {
    this.registry.updateSystemAppInfo(pid, info)
  }

  //从indexDb获取用户的注册表=>内存注册表
  async loadUserAppsFromDb() {
    return this.registry.loadUserAppsFromDb()
  }

  // 初始化系统的注册表
  initializeSystemApps() {
    this.registry.initializeSystemApps()
  }

  /*================================================内部私有函数==============================================*/
  // 初始化系统应用数据到=>内存注册表
  #initializeSystemApps() {
    this.registry.initializeSystemApps()
  }
  // 僵尸文件检查逻辑
  async #inspectZombieFile(fileHandle) {
    return this.internals.inspectZombieFile(fileHandle)
  }

  //更新系统的sys信息,注意系统只有内存有注册表
  #updateSystemAppInfo(pid, info) {
    this.registry.updateSystemAppInfo(pid, info)
  }
  //更新用户app信息
  #updateUserAppInfo(pid, info) {
    this.registry.updateUserAppInfo(pid, info)
  }

  //从indexDb获取用户的注册表=>内存注册表。
  async #loadUserAppsFromDb() {
    return this.registry.loadUserAppsFromDb()
  }

  //为了兼容无法直接获取pid的地方
  #getPidByResourceId(resourceId) {
    return this.registry.getPidByResourceId(resourceId)
  }
  #getResourceIdByPid(pid) {
    return this.registry.getResourceIdByPid(pid)
  }

  /**
   * 队列执行器：顺序处理安装/注册任务
   */
  async #processInstallQueue() {
    return this.internals.processInstallQueue()
  }

  #kill(pid) {
    this.internals.kill(pid)
  }
  #getApp(pid) {
    return this.registry.getApp(pid)
  }
  //云端上传App
  async #uploadCloud(data) {
    return this.internals.uploadCloud(data)
  }

  #emitChange(info) {
    //暂时仅仅处理变化
    this.messaging.emitChange(info)
  }
  #notify(pid, type, data) {
    this.messaging.notify(pid, type, data)
  }

  // --- 接收来自Worker消息处理[目前只有特性消息处理器] ---
  async #handleMsg(pid, msg) {
    await this.messaging.handleMsg(pid, msg)
  }

  #systemSwitch(p, payload) {
    this.messaging.systemSwitch(p, payload)
  }

  //更新resource的custom配置
  //修改 sysDb [注册表实例]更为合理，因为 custom 属于应用运行时的个性化配置
  async updateResourceCustom(data) {
    return this.settings.updateResourceCustom(data)
  }

  #notSystemSwitch(p, payload) {
    this.messaging.notSystemSwitch(payload)
  }

  #getProcessApp(pid) {
    //先暂时统一,避免后续需要新的写入比较
    return this.internals.getProcessApp(pid)
  }

  /*================================================公共 API (供UI层调用)=================================*/

  /**
   * 执行安装/注册行为的公共函数 (通过队列处理避免阻塞和冲突)
   */
  async executeInstallation(params) {
    return this.core.executeInstallation(params)
  }

  getRunningApps() {
    return this.registry.getRunningApps()
  }
  getHibernatedApps() {
    return this.registry.getHibernatedApps()
  }
  getInstalledApps() {
    return this.registry.getInstalledApps()
  }
  getBlockEdApps() {
    //custom是用户个人习惯,在安装的时候进行注入但是系统App会设置某些字段不允许被注入
    //这里考虑版本更新的跳过等等
    return this.registry.getBlockEdApps()
  }
  getTypeApps(appType) {
    return this.registry.getTypeApps(appType)
  }
  async getApps() {
    return this.registry.getApps()
  }
  // 获取资源,因为都是加载到内存里的
  getResource(resourceId) {
    return this.resourceAccess.getResource(resourceId)
  }

  //处理预先资源的启动
  async ensurePresets() {
    return this.core.ensurePresets()
  }

  //加载资源到内存
  async loadAllResources() {
    return this.core.loadAllResources()
  }

  // --- 文件系统同步 ---
  async syncResourcesToFiles() {
    //将从注册表indexDb读取的用户资源写入/同步至本 地,可以在这里做版本验证
    return this.core.syncResourcesToFiles()
  }
  //注意认为id是唯一的,name就是app的名字,允许多安装
  async writeAppFile(res) {
    //写入app状态信息到本地
    return this.core.writeAppFile(res)
  }
  //资源[app]上传,注意并没有分配pid,pid分配依赖注册表同步[这里的核心是优先创建worker，通过注册表更新资源]
  async uploadResource(params) {
    return this.core.uploadResource(params)
  }

  /**
   * 通过indexDb的注册表[此时还没有检测本地apps]:去管理本地文件系统的资源和indexDb的资源
   * 这是一个核心维护函数，确保文件系统、内存和数据库三者之间的数据一致性。
   * 它处理 "僵尸文件" (物理文件存在但无注册记录) 和 "孤儿记录" (注册记录存在但无物理文件),他只负责文件句柄的删除
   * 这里实际应该做版本和服务校验,放置本地端被修改,默认采用本地模式。
   */
  async syncRegistry() {
    return this.core.syncRegistry()
  }
  // 通过资源IndexDb去注册
  async syncRegistryByRes() {
    return this.core.syncRegistryByRes()
  }
  //更新App//更新App
  async updateApp(params) {
    return this.core.updateApp(params)
  }

  //安装App这里后续实际可以考虑把所有整合简约一下
  async installApp(params) {
    return this.core.installApp(params)
  }

  //App间交互
  async appIntereact({process, interactInfo}) {
    //这里为了后续方便优化提取出来
    return this.messaging.appIntereact(process, interactInfo)
  }
  //返回instanceDb
  async getInstanceDb() {
    return this.instance.getInstanceDb()
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
  async startProcess({pid, resourceId, interactInfo}) {
    return this.lifecycle.startProcess({pid, resourceId, interactInfo})
  }

  //存储这个关于,窗口状态,后续可以考虑多模式处理,是冷启动还是热。主要方案1.适用display全部热启动。方案二:外壳全部display,内层冷启动
  async saveWindowState(pid, windowRect) {
    return this.lifecycle.saveWindowState(pid, windowRect)
  }

  /**
   * 强制所有正在运行的应用保存其内部状态。
   * 这个接口主要用于页面关闭前（例如在 beforeunload 事件中调用），
   * 以确保所有应用的最新状态都被持久化，从而实现完美的会话恢复。
   */
  forceSaveAllStates() {
    this.lifecycle.forceSaveAllStates()
  }

  /**
   * 休眠一个应用。
   * 此操作只改变应用的状态标记为 'HIBERNATED'，不会终止Worker进程。
   * Worker会继续在后台运行，保持其内部状态是“热”的。
   */
  async hibernate(pid) {
    return this.lifecycle.hibernate(pid)
  }

  /**
   * 强制清除应用的持久化运行状态
   */
  async clearAppSavedState(pid) {
    return this.lifecycle.clearAppSavedState(pid)
  }

  /**
   * 强制完全重置一个应用，无视配置直接清空状态并杀死进程
   * 用于用户主动发起的重置操作
   */
  async forceResetApp(pid) {
    return this.lifecycle.forceResetApp(pid)
  }

  /**
   * 强制关闭一个应用 (与hibernate不同)。
   * 此操作会彻底终止Worker进程，根据配置决定是否清除已保存状态。
   * @param {string|number} pid - 应用进程ID
   */
  async forceKillProcess(pid) {
    return this.lifecycle.forceKillProcess(pid)
  }
  async reStartApp({pid}) {
    return this.lifecycle.reStartApp({pid})
  }
  async forceReStartApp({pid}) {
    return this.lifecycle.forceReStartApp({pid})
  }

  //删除非系统内置App
  async deleteApp(params) {
    return this.core.deleteApp(params)
  }

  // --- 系统恢复与进程管理 ---
  async restoreSession() {
    return this.lifecycle.restoreSession()
  }

  //拉起/唤起App
  async evokeApp({pid, from, interactInfo}) {
    return this.lifecycle.evokeApp({pid, from, interactInfo})
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
    return this.messaging.dispatch(pid, action)
  }

  //订阅App行为
  subscribeApp(pid, cb) {
    return this.messaging.subscribeApp(pid, cb)
  }

  //订阅系统行为
  subscribeSystem(cb) {
    return this.messaging.subscribeSystem(cb)
  }

  // 代理订阅特定主题消息方法[kernel,app都可订阅]
  subscribe(topic, cb) {
    return this.messaging.subscribe(topic, cb)
  }

  // 代理发布特定主题消息方法[kernel,app都可发布]
  publish(topic, payload) {
    return this.messaging.publish(topic, payload)
  }

  getCachedState(pid) {
    return this.cache.getCachedState(pid)
  }

  clearCachedState(pid) {
    this.cache.clearCachedState(pid)
  }

  // 初始化系统应用数据到=>内存注册表
  initializeSystemApps() {
    this.registry.initializeSystemApps()
  }

  //更新用户app信息
  updateUserAppInfo(pid, info) {
    this.registry.updateUserAppInfo(pid, info)
  }

  //更新resource of custom配置
  //修改sysDb [注册表实例]更为合理，因为 custom 属于应用运行时的个性化配置
  async updateResourceCustom(data) {
    return this.settings.updateResourceCustom(data)
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
