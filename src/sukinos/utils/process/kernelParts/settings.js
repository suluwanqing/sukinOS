import {ENV_KEY_META_INFO} from '@/sukinos/utils/config'

//更新resource的custom配置
//修改 sysDb [注册表实例]更为合理，因为 custom 属于应用运行时的个性化配置

export class Settings {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  async updateResourceCustom(data) {
    const {resourceId, custom} = data
    const pid = this.#kernel.getPidByResourceId(resourceId)
    if (!pid) {
      // console.error(`[内核] 未找到资源 ID ${resourceId} 对应的 PID`);
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
    // 构建更新后的应用对象
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
    // 无论是否系统应用，都要存入注册表，以便刷新后恢复 custom
    // 我们使用 putData 确保如果记录不存在则创建，存在则更新
    await this.#kernel.sysDb.putData(updatedApp)
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
    this.#kernel.emitChange({type: 'APP_META', pid, resourceId, meta: newMetaInfo})
    return updatedApp
  }
}

// ─── 代理导出函数 ──────────────────────

export async function updateResourceCustom(kernel, data) {
  return kernel.settings.updateResourceCustom(data)
}
