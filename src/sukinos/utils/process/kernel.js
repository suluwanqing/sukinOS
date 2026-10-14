import IndexDb from './indexDb'
import {
  createSysDbConfig,
  createResDbConfig,
  createInstanceDbConfig,
  ENV_KEY_NAME,
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_META_INFO,
  ADMIN_APP_IDS,
  DEFAULT_USER_ID,
} from '@/sukinos/utils/config'
import CommHub from './commHub'
import {BabelLoader} from './babelLoader'
import {personalizationStore} from '@/sukinos/hooks/usePersonalization'
import {GUEST_INFO, checkIsGuest, setGuestFlag, clearGuestFlag} from '/utils/js/guest'

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
import permissionManageAPI from '@/apis/system/permissionManage'
import {PRESET_RESOURCES} from '@/sukinos/resources/preset_resources'

class Kernel {

  constructor() {
    this.storeDispatch = null // 命名与既有 dispatch 冲突，故不用同名私有字段

    this.sysDb = null // 用户应用注册表 (IndexedDB)，按用户延迟初始化
    this.resDb = null // 应用源资源：代码、元数据等 (IndexedDB)，按用户延迟初始化
    this.dirHandle = null // 用户授权的本地文件系统目录句柄
    this.instanceDb = null // 有状态实例库，按用户延迟初始化
    // RUNNING 与 HIBERNATED 的进程都登记在此：休眠不终止 Worker
    this.processes = new Map() // 存储: { pid -> { worker, url ,pid} }

    // 内存注册表是运行时的唯一真实数据源
    this.systemApps = new Map()
    this.userApps = new Map() // init 时由 sysDb 加载
    this.resourceIdToPid = new Map()
    this.pidToResourceId = new Map()

    this.installQueue = []
    this.isProcessingQueue = false

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

    this.resourceCache = {}
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
      sendToWorker: (pid, msg) => {
        const p = this.processes.get(pid)
        if (p && p.worker) {
          p.worker.postMessage(msg)
        }
      },
    })

    this.presetResourceIds = new Set() // 预设资源 ID：禁止写入与修改
    this.currentUser = null

    this.autoSaveTimers = new Map() // pid -> { stateTimerId, windowTimerId }
    this.lastSavedState = new Map() // pid -> 上次落盘的 state（脏检查）
    this.lastSavedWindow = new Map() // pid -> 上次落盘的窗口位置（脏检查）
    this._unsubPersonalization = null
  }
  isSystemApp(pid) {
    return this.flags.isSystemApp(pid)
  }

  // 每用户独立三库：SukinOS_Sys_{userId} / SukinOS_Res_{userId} / SUKIN_STATE_INSTANCE_{userId}
  async initDatabases(userId) {
    const uid = userId || DEFAULT_USER_ID

    // 用户切换：先关闭上一用户的连接，再开新库
    await this.sysDb?.closeDB()
    await this.resDb?.closeDB()
    await this.instanceDb?.closeDB()

    this.sysDb = new IndexDb(createSysDbConfig(uid))
    this.resDb = new IndexDb(createResDbConfig(uid))
    this.instanceDb = new IndexDb(createInstanceDbConfig(uid))
    await this.sysDb.openDB()
    await this.resDb.openDB()
    await this.instanceDb.openDB()
  }

  // 登出/切换用户时清理上一用户的数据：落盘、杀进程、清注册表、关 DB 连接
  async reset() {
    this.stopAllAutoSave()

    // 必须先强制落盘再终止进程，否则最后一次状态更新丢失
    this.lifecycle.forceSaveAllStates()

    for (const [pid] of this.processes) {
      this.internals.kill(pid)
    }
    this.processes.clear()

    this.systemApps.clear()
    this.userApps.clear()
    this.resourceIdToPid.clear()
    this.pidToResourceId.clear()
    this.resourceCache = {}
    this.presetResourceIds.clear()
    this.allowedSystemResIds = new Set()

    this.commHub.clearAll()

    this._unsubPersonalization?.()
    this._unsubPersonalization = null

    await this.sysDb?.closeDB()
    await this.resDb?.closeDB()
    await this.instanceDb?.closeDB()
    this.sysDb = null
    this.resDb = null
    this.instanceDb = null
    this.dirHandle = null
    this.currentUser = null
  }

  // 用户切换：reset → 建库 → 资源与注册表重建 → restoreSession，顺序不可颠倒
  async reinit(userId) {
    await this.reset()
    await this.initDatabases(userId)
    // 重新获取文件系统句柄（reset 中已置 null）
    this.dirHandle = await navigator.storage.getDirectory()
    // 确保 Babel 编译器已加载（Worker 代码生成依赖）
    await BabelLoader.load()
    // 准入集合必须先于 ensurePresets / initializeSystemApps 就绪，否则未授权资源会被注册
    await this.syncSystemAccess()
    await this.core.ensurePresets()
    await this.core.loadAllResources()
    await this.loadUserAppsFromDb()
    this.initializeSystemApps()
    await this.core.syncRegistryByRes()
    await this.core.syncRegistry()
    await this.restoreSession()
    this.currentUser = {id: userId}
    this.messaging.emitChange({type: 'APP_REGISTRY'})
  }

  setDispatch(dispatch) {
    this.flags.setDispatch(dispatch)
  }
  async init(info) {
    return this.core.init(info)
  }
  // 个人化配置改的是保存间隔，需立即重启所有运行中 app 的定时器
  subscribePersonalization() {
    if (this._unsubPersonalization) return
    this._unsubPersonalization = personalizationStore.subscribe(() => {
      for (const pid of this.processes.keys()) {
        this.startAutoSaveState(pid)
        this.startAutoSaveWindow(pid)
      }
    })
  }

  // 获取有效间隔：App 级 custom > 全局个人化默认
  getAutoSaveInterval(pid, type) {
    const app = this.registry.getApp(pid)
    if (!app) return 0
    const appVal = app[ENV_KEY_META_INFO]?.custom?.[type]
    if (appVal !== undefined && appVal > 0) return appVal
    const globalConfig = personalizationStore.get()
    return globalConfig?.[type] || 0
  }

  // 启动状态自动保存（setTimeout 链式，防漂移）
  startAutoSaveState(pid) {
    this.stopAutoSaveState(pid)
    const interval = this.getAutoSaveInterval(pid, 'autoSaveStateInterval')
    if (interval <= 0) return
    const metaInfo = this.registry.getApp(pid)?.[ENV_KEY_META_INFO]
    if (!(metaInfo?.saveState ?? metaInfo?.saveState)) return
    this.#scheduleNextStateSave(pid, interval)
  }

  #scheduleNextStateSave(pid, intervalSec) {
    const timerId = setTimeout(() => {
      this.autoSaveState(pid)
      const next = this.getAutoSaveInterval(pid, 'autoSaveStateInterval')
      if (next > 0) this.#scheduleNextStateSave(pid, next)
    }, intervalSec * 1000)
    const timers = this.autoSaveTimers.get(pid) || {}
    timers.stateTimerId = timerId
    this.autoSaveTimers.set(pid, timers)
  }

  startAutoSaveWindow(pid) {
    this.stopAutoSaveWindow(pid)
    const interval = this.getAutoSaveInterval(pid, 'autoSaveWindowInterval')
    if (interval <= 0) return
    this.#scheduleNextWindowSave(pid, interval)
  }

  #scheduleNextWindowSave(pid, intervalSec) {
    const timerId = setTimeout(() => {
      this.autoSaveWindow(pid)
      const next = this.getAutoSaveInterval(pid, 'autoSaveWindowInterval')
      if (next > 0) this.#scheduleNextWindowSave(pid, next)
    }, intervalSec * 1000)
    const timers = this.autoSaveTimers.get(pid) || {}
    timers.windowTimerId = timerId
    this.autoSaveTimers.set(pid, timers)
  }

  autoSaveState(pid) {
    const app = this.registry.getApp(pid)
    if (!app || app.isSystemApp) return
    const cached = this.commHub.getCachedState(pid)
    if (!cached) return
    const last = this.lastSavedState.get(pid)
    if (last && JSON.stringify(last) === JSON.stringify(cached)) return
    this.lastSavedState.set(pid, cached)
    if (!app.savedState) app.savedState = {app: null, window: null}
    app.savedState.app = cached
    this.sysDb.updateData(app[ENV_KEY_NAME], {savedState: app.savedState}).catch(() => {})
  }

  autoSaveWindow(pid) {
    const app = this.registry.getApp(pid)
    if (!app || app.isSystemApp) return
    const rect = app.savedState?.window
    if (!rect) return
    const last = this.lastSavedWindow.get(pid)
    if (last && last.x === rect.x && last.y === rect.y && last.w === rect.w && last.h === rect.h)
      return
    this.lastSavedWindow.set(pid, {...rect})
    this.sysDb.updateData(app[ENV_KEY_NAME], {savedState: app.savedState}).catch(() => {})
  }

  stopAutoSaveState(pid) {
    const timers = this.autoSaveTimers.get(pid)
    if (timers?.stateTimerId) {
      clearTimeout(timers.stateTimerId)
      timers.stateTimerId = null
    }
  }
  stopAutoSaveWindow(pid) {
    const timers = this.autoSaveTimers.get(pid)
    if (timers?.windowTimerId) {
      clearTimeout(timers.windowTimerId)
      timers.windowTimerId = null
    }
  }
  stopAllAutoSave() {
    for (const [pid, timers] of this.autoSaveTimers) {
      if (timers.stateTimerId) clearTimeout(timers.stateTimerId)
      if (timers.windowTimerId) clearTimeout(timers.windowTimerId)
    }
    this.autoSaveTimers.clear()
    this.lastSavedState.clear()
    this.lastSavedWindow.clear()
  }

  // #私有成员无法被 generateApp.js 直接访问，这里抛出同名代理
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

  // 系统应用只存在于内存注册表，不落 sysDb
  updateSystemAppInfo(pid, info) {
    this.registry.updateSystemAppInfo(pid, info)
  }

  async loadUserAppsFromDb() {
    return this.registry.loadUserAppsFromDb()
  }

  initializeSystemApps() {
    this.registry.initializeSystemApps()
  }

  #initializeSystemApps() {
    this.registry.initializeSystemApps()
  }
  async #inspectZombieFile(fileHandle) {
    return this.internals.inspectZombieFile(fileHandle)
  }

  #updateSystemAppInfo(pid, info) {
    this.registry.updateSystemAppInfo(pid, info)
  }
  #updateUserAppInfo(pid, info) {
    this.registry.updateUserAppInfo(pid, info)
  }

  async #loadUserAppsFromDb() {
    return this.registry.loadUserAppsFromDb()
  }

  #getPidByResourceId(resourceId) {
    return this.registry.getPidByResourceId(resourceId)
  }
  #getResourceIdByPid(pid) {
    return this.registry.getResourceIdByPid(pid)
  }

  // 串行处理安装/注册任务，避免并发写注册表
  async #processInstallQueue() {
    return this.internals.processInstallQueue()
  }

  #kill(pid) {
    this.internals.kill(pid)
  }
  #getApp(pid) {
    return this.registry.getApp(pid)
  }
  async #uploadCloud(data) {
    return this.internals.uploadCloud(data)
  }

  #emitChange(info) {
    this.messaging.emitChange(info)
  }
  #notify(pid, type, data) {
    this.messaging.notify(pid, type, data)
  }

  async #handleMsg(pid, msg) {
    await this.messaging.handleMsg(pid, msg)
  }

  #systemSwitch(p, payload) {
    this.messaging.systemSwitch(p, payload)
  }

  // custom 属运行时个性化配置，写在 sysDb 的注册表实例上比写在资源库合理
  async updateResourceCustom(data) {
    return this.settings.updateResourceCustom(data)
  }

  #notSystemSwitch(p, payload) {
    this.messaging.notSystemSwitch(payload)
  }

  #getProcessApp(pid) {
    return this.internals.getProcessApp(pid)
  }


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
    // custom 由安装时注入，系统 App 会置字段拒绝注入，因此这里还要跳过版本更新等情况
    return this.registry.getBlockEdApps()
  }
  getTypeApps(appType) {
    return this.registry.getTypeApps(appType)
  }
  async getApps() {
    return this.registry.getApps()
  }
  getResource(resourceId) {
    return this.resourceAccess.getResource(resourceId)
  }

  async ensurePresets() {
    return this.core.ensurePresets()
  }

  async loadAllResources() {
    return this.core.loadAllResources()
  }

  async syncResourcesToFiles() {
    return this.core.syncResourcesToFiles()
  }
  // id 唯一、name 即应用名，允许同一应用多次安装
  async writeAppFile(res) {
    return this.core.writeAppFile(res)
  }
  // 上传时不分配 pid：pid 由注册表同步给出，先建 Worker 再经注册表更新资源
  async uploadResource(params) {
    return this.core.uploadResource(params)
  }

  // 以 indexDb 注册表为准对齐 文件系统/内存/数据库：清理僵尸文件(有文件无注册)与孤儿记录(有注册无文件)，只删句柄不删数据
  // 默认本地优先，不做版本与服务校验
  async syncRegistry() {
    return this.core.syncRegistry()
  }
  // 反向：以资源库为源补齐注册表
  async syncRegistryByRes() {
    return this.core.syncRegistryByRes()
  }
  async updateApp(params) {
    return this.core.updateApp(params)
  }

  async installApp(params) {
    return this.core.installApp(params)
  }

  async appIntereact({process, interactInfo}) {
    return this.messaging.appIntereact(process, interactInfo)
  }
  async getInstanceDb() {
    return this.instance.getInstanceDb()
  }

  // 冷启动与休眠恢复都走这一个入口；interactInfo 对应 App 侧 reducer(state, action)，state 由内核注入、action 来自交互
  async startProcess({pid, resourceId, interactInfo}) {
    return this.lifecycle.startProcess({pid, resourceId, interactInfo})
  }

  async saveWindowState(pid, windowRect) {
    return this.lifecycle.saveWindowState(pid, windowRect)
  }

  // 只改内存：由拖拽结束的 mouseup 触发，实际落盘交给 autoSaveWindow 的脏检查，避免拖动期间高频写盘
  updateWindowRect(pid, rect) {
    const app = this.registry.getApp(pid)
    if (!app || app.isSystemApp) return
    if (!app.savedState) app.savedState = {app: null, window: null}
    app.savedState = {...app.savedState, window: rect}
  }

  // 强制所有运行中应用落盘，供 beforeunload 这类退出时机调用
  forceSaveAllStates() {
    this.lifecycle.forceSaveAllStates()
  }

  // 只把状态标记为 HIBERNATED，不终止 Worker：进程留在后台保持“热”
  async hibernate(pid) {
    return this.lifecycle.hibernate(pid)
  }

  async clearAppSavedState(pid) {
    return this.lifecycle.clearAppSavedState(pid)
  }

  // 无视配置直接清空状态并杀进程，用于用户主动重置
  async forceResetApp(pid) {
    return this.lifecycle.forceResetApp(pid)
  }

  // 与 hibernate 的区别：彻底终止 Worker，并按配置决定是否清除已保存状态
  async forceKillProcess(pid) {
    return this.lifecycle.forceKillProcess(pid)
  }
  async reStartApp({pid}) {
    return this.lifecycle.reStartApp({pid})
  }
  async forceReStartApp({pid}) {
    return this.lifecycle.forceReStartApp({pid})
  }

  // 仅删除非系统内置 App
  async deleteApp(params) {
    return this.core.deleteApp(params)
  }

  async restoreSession() {
    return this.lifecycle.restoreSession()
  }

  async evokeApp({pid, from, interactInfo}) {
    return this.lifecycle.evokeApp({pid, from, interactInfo})
  }

  // 事件流：UI dispatch → worker 执行并更新 state → kernel 收到消息后通知订阅者
  dispatch(pid, action) {
    // 仍是 UI 触发，只是要分流给 kernel 还是 worker
    return this.messaging.dispatch(pid, action)
  }

  subscribeApp(pid, cb) {
    return this.messaging.subscribeApp(pid, cb)
  }

  subscribeSystem(cb) {
    return this.messaging.subscribeSystem(cb)
  }

  subscribe(topic, cb) {
    return this.messaging.subscribe(topic, cb)
  }

  publish(topic, payload) {
    return this.messaging.publish(topic, payload)
  }

  getCachedState(pid) {
    return this.cache.getCachedState(pid)
  }

  clearCachedState(pid) {
    this.cache.clearCachedState(pid)
  }

  initializeSystemApps() {
    this.registry.initializeSystemApps()
  }

  // 提前同步当前用户可访问的系统 APP → 准入集合 allowedSystemResIds；未授权资源不写 resDb、不进内存、不注册，缩小暴露面
  //  - 游客：跳过后端检查，但移除 ADMIN_APP_IDS（前端硬性规则：禁止非 root 获取），其余系统资源可见
  //  - 非游客：仅保留后端明确 allowed=true 的系统资源（root 始终可见）
  //  - 后端请求失败：清空集合（安全优先，不展示不可控的应用）
  async syncSystemAccess() {
    const allSystemResIds = new Set(
      PRESET_RESOURCES.map(p => p?.[ENV_KEY_RESOURCE_ID]).filter(Boolean)
    )
    if (checkIsGuest()) {
      this.allowedSystemResIds = new Set(
        [...allSystemResIds].filter(id => !ADMIN_APP_IDS.includes(id))
      )
      this.#syncSystemAppsFromAllowed()
      return
    }
    try {
      const res = await permissionManageAPI.getAvailableSystemApps()
      if (res.code !== 200 || !res.data) {
        // 出错或空数据一律清空：不放行不可控的应用
        this.allowedSystemResIds = new Set()
        this.#syncSystemAppsFromAllowed()
        return
      }
      const allowedSet = new Set()
      ;(res.data || []).forEach(item => {
        if (item.allowed === true) {
          allowedSet.add(item.app_id || item.appId)
        }
      })
      this.allowedSystemResIds = allowedSet
      this.#syncSystemAppsFromAllowed()
    } catch (e) {
      console.warn('[内核] 系统APP权限同步失败，清空系统资源列表:', e)
      this.allowedSystemResIds = new Set()
      this.#syncSystemAppsFromAllowed()
    }
  }

  // 按 allowedSystemResIds 增删已注册的系统 APP（pid = resourceId）：供系统管理页改权限后实时同步
  // 初始化时 systemApps 尚为空，此处为空操作
  #syncSystemAppsFromAllowed() {
    const allowed = this.allowedSystemResIds || new Set()
    for (const [pid, app] of this.systemApps) {
      const resourceId = app[ENV_KEY_RESOURCE_ID]
      if (!resourceId || !allowed.has(resourceId)) {
        this.systemApps.delete(pid)
        this.pidToResourceId.delete(pid)
        this.presetResourceIds.delete(resourceId)
        if (resourceId) this.resourceIdToPid.delete(resourceId)
      }
    }
    for (const preset of PRESET_RESOURCES) {
      const resourceId = preset?.[ENV_KEY_RESOURCE_ID]
      if (!resourceId || !allowed.has(resourceId)) continue
      if (this.systemApps.has(resourceId)) continue
      this.registry.initializeSystemApp(preset)
    }
  }

  updateUserAppInfo(pid, info) {
    this.registry.updateUserAppInfo(pid, info)
  }

  async updateResourceCustom(data) {
    return this.settings.updateResourceCustom(data)
  }

  // 登录/登出由 reinit(userId) 与 reset() 承担，内核不再提供 login/logout

}

export default new Kernel()
