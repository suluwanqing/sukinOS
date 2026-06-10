import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_META_INFO,
  ADMIN_APP_IDS,
} from '@/sukinos/utils/config'
import {PRESET_RESOURCES} from '@/sukinos/resources/preset_resources'

export class Registry {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  initializeSystemApps() {
    for (const preset of PRESET_RESOURCES) {
      const presetResId = preset?.[ENV_KEY_RESOURCE_ID]
      // 跳过 ADMIN_APP_IDS 中的应用
      if (ADMIN_APP_IDS.includes(presetResId) && !this.#kernel.currentUser?.root) {
        continue
      }
      // 通过,就注册为系统资源
      this.#kernel.presetResourceIds.add(presetResId)
      // 直接拿系统预设
      const pid = presetResId
      const appName = preset?.[ENV_KEY_NAME]
      // 获取从 sysDb 加载的覆盖记录
      const dbOverride = this.#kernel.userApps.get(pid)
      // 默认使用预设配置
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
        // 如果该应用在 custom 里配置了开机自启，
        // 我们保持它的状态为 INSTALLED，后续 restoreSession 会根据 finalMeta.custom.autoStart 启动它
        // 从 userApps 临时区清理
        this.#kernel.userApps.delete(pid)
      }
      // 注入内存注册表
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
    //custom is 用户个人习惯,在安装的时候进行注入但是系统App会设置某些字段不允许被注入
    //这里考虑版本更新的跳过等等
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

// ─── 代理导出函数 ──────────────────────

export function initializeSystemApps(kernel) {
  kernel.registry.initializeSystemApps()
}

export function updateSystemAppInfo(kernel, pid, info) {
  kernel.registry.updateSystemAppInfo(pid, info)
}
//更新用户app信息
export function updateUserAppInfo(kernel, pid, info) {
  kernel.registry.updateUserAppInfo(pid, info)
}
//从indexDb获取用户的注册表=>内存注册表。
export async function loadUserAppsFromDb(kernel) {
  return kernel.registry.loadUserAppsFromDb()
}
//为了兼容无法直接获取pid的地方
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
  //custom是用户个人习惯,在安装的时候进行注入但是系统App会设置某些字段不允许被注入
  //这里考虑版本更新的跳过等等
export function getBlockEdApps(kernel) {
  return kernel.registry.getBlockEdApps()
}

export function getTypeApps(kernel, appType) {
  return kernel.registry.getTypeApps(appType)
}

export async function getApps(kernel) {
  return kernel.registry.getApps()
}
