import {ENV_KEY_META_INFO} from '@/sukinos/utils/config'

// custom 属于应用运行时的个性化配置，因此写回 sysDb [注册表实例] 比改 resource 更合理

export class Settings {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  async updateResourceCustom(data) {
    const {resourceId, custom} = data
    const pid = this.#kernel.getPidByResourceId(resourceId)
    if (!pid) {
      return
    }
    const app = this.#kernel.getApp(pid)
    if (!app) return
    //构建全新的 metaInfo (确保引用变化，触发 UI 刷新)
    const oldMeta = app[ENV_KEY_META_INFO] || {}
    const newMetaInfo = {
      ...oldMeta,
      custom: {
        ...(oldMeta.custom || {}),
        ...custom,
      },
    }
    const updatedApp = {
      ...app,
      [ENV_KEY_META_INFO]: newMetaInfo,
    }
    // 同步到内存状态机
    if (app.isSystemApp) {
      this.#kernel.systemApps.set(pid, updatedApp)
    } else {
      this.#kernel.userApps.set(pid, updatedApp)
    }
    // 无论是否系统应用都写回注册表：putData 无则建、有则更，刷新后靠它恢复 custom
    await this.#kernel.sysDb.putData(updatedApp)
    // 不再回写 res/resDb：安装后应用信息一律走 sys，系统 APP 的 custom 同样在此处理，回写属冗余
    this.#kernel.emitChange({type: 'APP_META', pid, resourceId, meta: newMetaInfo})
    return updatedApp
  }
}

export async function updateResourceCustom(kernel, data) {
  return kernel.settings.updateResourceCustom(data)
}
