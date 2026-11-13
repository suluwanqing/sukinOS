import { checkAppsUpdate } from '@/apis/sukinOs/app.jsx'
import { ENV_KEY_META_INFO, ENV_KEY_NAME, ENV_KEY_RESOURCE_ID } from '@/sukinos/utils/config'
import { setForcedUpdates } from '../forceUpdateGuard'

const AUTO_CHECK_INTERVAL = 30 * 60 * 1000
const MIN_RECHECK_ON_VISIBLE = 5 * 60 * 1000

// 统一维护"已安装应用有哪些更新"，商店与桌面提示都读这一份结果
export class Updates {
  #kernel
  #timer = null
  #inFlight = null
  #snapshot = { updates: [], checkedAt: 0 }
  #announced = new Map()
  #onVisible = null
  #generation = 0

  constructor(kernel) {
    this.#kernel = kernel
  }

  getSnapshot() {
    return this.#snapshot
  }

  getUpdate(resourceId) {
    const key = String(resourceId || '')
    return this.#snapshot.updates.find(item => String(item.resourceId) === key) || null
  }

  #installedList() {
    return (this.#kernel.getInstalledApps?.() || [])
      .filter(app => !app?.isSystemApp && app?.[ENV_KEY_RESOURCE_ID] && app?.[ENV_KEY_META_INFO]?.version)
      .map(app => ({
        resourceId: app[ENV_KEY_RESOURCE_ID],
        localVersion: String(app[ENV_KEY_META_INFO].version),
      }))
  }

  check() {
    if (this.#inFlight) return this.#inFlight
    const generation = this.#generation
    const pending = this.#run(generation).finally(() => {
      //stop 后旧请求收尾时不能清掉新一代的进行中引用
      if (this.#inFlight === pending) this.#inFlight = null
    })
    this.#inFlight = pending
    return pending
  }

  async #run(generation) {
    const installed = this.#installedList()
    if (!installed.length) {
      setForcedUpdates([])
      this.#snapshot = { updates: [], checkedAt: Date.now() }
      return this.#snapshot
    }

    try {
      const res = await checkAppsUpdate({
        installedList: installed,
        url: this.#kernel.storePath?.checkUpdatesUrl,
      })
      //用户切换后旧请求的结果不能写进新用户的状态
      if (generation !== this.#generation) return this.#snapshot
      if (res?.code !== 200) return this.#snapshot

      const localMap = new Map(installed.map(item => [String(item.resourceId), item.localVersion]))
      const updates = (res.data || []).map(item => ({
        ...item,
        localVersion: localMap.get(String(item.resourceId)) || '',
      }))
      setForcedUpdates(updates)
      this.#snapshot = { updates, checkedAt: Date.now() }
      this.#announce(updates)
      return this.#snapshot
    } catch (e) {
      console.warn('[内核] 检查应用更新失败:', e)
      return this.#snapshot
    }
  }

  // 同一资源同一版本只提示一次，避免定时检查反复打扰
  #announce(updates) {
    const freshForced = []
    const freshNormal = []
    for (const item of updates) {
      const resourceId = String(item?.resourceId || '')
      if (!resourceId) continue
      const signature = `${item.version || ''}:${item.forced ? '1' : '0'}`
      if (this.#announced.get(resourceId) === signature) continue
      this.#announced.set(resourceId, signature)
      if (item.forced) {
        freshForced.push(item)
      } else {
        freshNormal.push(item)
      }
    }

    for (const item of freshForced) {
      this.#kernel.emitChange({
        type: 'APP_FORCE_UPDATE',
        resourceId: item.resourceId,
        appName: item.appName || item?.[ENV_KEY_NAME] || '',
        version: item.version,
      })
    }

    if (freshNormal.length) {
      this.#kernel.emitChange({
        type: 'APP_UPDATE_AVAILABLE',
        updates: freshNormal.map(item => ({
          resourceId: item.resourceId,
          appName: item.appName || '',
          version: item.version,
          localVersion: item.localVersion,
        })),
      })
    }
  }

  start({ intervalMs = AUTO_CHECK_INTERVAL, skipInitial = false } = {}) {
    //只重绑定时器，保留去重表：重启监听不应让同一版本再提示一次
    this.#detach()
    this.#onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (Date.now() - this.#snapshot.checkedAt < MIN_RECHECK_ON_VISIBLE) return
      void this.check()
    }
    document.addEventListener('visibilitychange', this.#onVisible)
    this.#timer = setInterval(() => {
      void this.check()
    }, intervalMs)
    if (!skipInitial) void this.check()
  }

  #detach() {
    if (this.#timer) clearInterval(this.#timer)
    this.#timer = null
    if (this.#onVisible) document.removeEventListener('visibilitychange', this.#onVisible)
    this.#onVisible = null
  }

  stop({ clearSnapshot = false } = {}) {
    this.#generation += 1
    this.#detach()
    this.#inFlight = null
    this.#announced.clear()
    if (clearSnapshot) this.#snapshot = { updates: [], checkedAt: 0 }
  }
}
