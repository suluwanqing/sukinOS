import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_META_INFO,
} from '@/sukinos/utils/config'
import {PRESET_RESOURCES} from '@/sukinos/resources/preset_resources'

export class Registry {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  initializeSystemApps() {
    // 仅当前用户有权访问的系统资源 ID（由 syncSystemAccess 提前获取）
    const allowed = this.#kernel.allowedSystemResIds || new Set()
    for (const preset of PRESET_RESOURCES) {
      const presetResId = preset?.[ENV_KEY_RESOURCE_ID]
      // 仅注册当前用户有权访问的系统资源为系统 APP(pid = resourceId)。
      // root 始终可见,普通用户被后端放权后同样可见,无权访问的系统资源不注册。
      if (!allowed.has(presetResId)) continue
      this.initializeSystemApp(preset)
    }
  }

  // 注册单个系统预置资源为系统 APP（pid = resourceId）
  // 供 initializeSystemApps 批量注册，以及 syncSystemAccess 权限变更后的实时同步复用
  initializeSystemApp(preset) {
    const presetResId = preset?.[ENV_KEY_RESOURCE_ID]
    if (!presetResId) return
    this.#kernel.presetResourceIds.add(presetResId)
    const pid = presetResId
    const appName = preset?.[ENV_KEY_NAME]
    // 获取从 sysDb 加载的覆盖记录
    const dbOverride = this.#kernel.userApps.get(pid)
    let finalMeta = preset?.[ENV_KEY_META_INFO]
    // 系统应用刷新后，默认状态永远是 INSTALLED，savedState 永远是 null
    let status = 'INSTALLED'
    let savedState = null
    if (dbOverride) {
      // 仅合并 metaInfo 中的 custom 部分
      finalMeta = {
        ...preset?.[ENV_KEY_META_INFO],
        custom: {
          ...(preset?.[ENV_KEY_META_INFO]?.custom || {}),
          ...(dbOverride?.[ENV_KEY_META_INFO]?.custom || {}),
        },
      }
      // 配了开机自启时状态仍留 INSTALLED，由 restoreSession 按 finalMeta.custom.autoStart 拉起
      this.#kernel.userApps.delete(pid)
    }
    this.#kernel.systemApps.set(pid, {
      pid,
      [ENV_KEY_NAME]: appName,
      [ENV_KEY_RESOURCE_ID]: presetResId,
      savedState: savedState,
      status: status,
      isSystemApp: true,
      [ENV_KEY_META_INFO]: finalMeta,
    })
    this.#kernel.pidToResourceId.set(pid, presetResId)
    this.#kernel.resourceIdToPid.set(presetResId, pid)
  }

  //更新系统的sys信息,注意系统只有内存有注册表

  updateSystemAppInfo(pid, info) {
    this.#kernel.systemApps.set(pid, info)
  }

  updateUserAppInfo(pid, info) {
    this.#kernel.userApps.set(pid, info)
  }

  async loadUserAppsFromDb() {
    if (!this.#kernel.sysDb.isOpen()) await this.#kernel.sysDb.openDB()
    const allUserApps = await this.#kernel.sysDb.getAllData()
    allUserApps.forEach(app => {
      this.#kernel.userApps.set(app.pid, app)
      this.#kernel.resourceIdToPid.set(app?.[ENV_KEY_RESOURCE_ID], app.pid)
      this.#kernel.pidToResourceId.set(app.pid, app?.[ENV_KEY_RESOURCE_ID])
    })
  }
  //为了兼容无法直接获取pid的地方
  getPidByResourceId(resourceId) {
    return this.#kernel.resourceIdToPid.get(resourceId)
  }

  getResourceIdByPid(pid) {
    return this.#kernel.pidToResourceId.get(pid)
  }

  getApp(pid) {
    return this.#kernel.systemApps.get(pid) || this.#kernel.userApps.get(pid)
  }

  getRunningApps() {
    const allApps = [...this.#kernel.systemApps.values(), ...this.#kernel.userApps.values()]
    return allApps.filter(app => app.status === 'RUNNING')
  }

  getHibernatedApps() {
    const allApps = [...this.#kernel.systemApps.values(), ...this.#kernel.userApps.values()]
    return allApps.filter(app => app.status === 'HIBERNATED')
  }

  getInstalledApps() {
    return [...this.#kernel.userApps.values()]
  }

  getBlockEdApps() {
    const allApps = [...this.#kernel.systemApps.values(), ...this.#kernel.userApps.values()]
    return allApps.filter(app => app?.[ENV_KEY_META_INFO]?.custom?.blockEd)
  }

  getTypeApps(appType) {
    const allApps = [...this.#kernel.systemApps.values(), ...this.#kernel.userApps.values()]
    return allApps.filter(app => app?.[ENV_KEY_META_INFO]?.appType === appType)
  }

  async getApps() {
    const allApps = [...this.#kernel.systemApps.values(), ...this.#kernel.userApps.values()]
    return allApps.map(a => ({...a, isRunning: this.#kernel.processes.has(a.pid)}))
  }
}

export function initializeSystemApps(kernel) {
  kernel.registry.initializeSystemApps()
}

export function updateSystemAppInfo(kernel, pid, info) {
  kernel.registry.updateSystemAppInfo(pid, info)
}
export function updateUserAppInfo(kernel, pid, info) {
  kernel.registry.updateUserAppInfo(pid, info)
}
//从indexDb获取用户的注册表=>内存注册表。
export async function loadUserAppsFromDb(kernel) {
  return kernel.registry.loadUserAppsFromDb()
}
export function getPidByResourceId(kernel, resourceId) {
  return kernel.registry.getPidByResourceId(resourceId)
}

export function getResourceIdByPid(kernel, pid) {
  return kernel.registry.getResourceIdByPid(pid)
}

export function getApp(kernel, pid) {
  return kernel.registry.getApp(pid)
}

export function getRunningApps(kernel) {
  return kernel.registry.getRunningApps()
}

export function getHibernatedApps(kernel) {
  return kernel.registry.getHibernatedApps()
}

export function getInstalledApps(kernel) {
  return kernel.registry.getInstalledApps()
}
// custom 是用户个人习惯：安装时注入，但系统 App 会设置某些字段不允许被注入
export function getBlockEdApps(kernel) {
  return kernel.registry.getBlockEdApps()
}

export function getTypeApps(kernel, appType) {
  return kernel.registry.getTypeApps(appType)
}

export async function getApps(kernel) {
  return kernel.registry.getApps()
}
