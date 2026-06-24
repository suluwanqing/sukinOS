import {BabelLoader} from '../babelLoader'
import {alert} from '@/component/alert/layout'
import {PRESET_RESOURCES} from '@/sukinos/resources/preset_resources'
import {DB_INSTANCE_ID, ENV_KEY_RESOURCE_ID, ADMIN_APP_IDS} from '@/sukinos/utils/config'
import {
  extExecuteInstallation,
  extSyncResourcesToFiles,
  extWriteAppFile,
  extUploadResource,
  extSyncRegistry,
  extSyncRegistryByRes,
  extUpdateApp,
  extDeleteApp,
} from '../generateApp'
import {initDatabase} from '@/sukinos/utils/_db'

export class Core {
  #kernel

  constructor(kernel) {
    this.#kernel = kernel
  }

  async init(info) {
    const {user, config} = info
    const {isPrivate, useVirtualWorker} = config
    //立即保存用户信息，以便后续 generateApp 逻辑能访问权限状态
    this.#kernel.currentUser = user
    this.#kernel.useVirtualWorker = useVirtualWorker || false // 在内核实例上保存是否采用虚拟沙箱机制
    try {
      this.#kernel.dirHandle = isPrivate
        ? await navigator.storage.getDirectory()
        : await window.showDirectoryPicker({mode: 'readwrite', id: 'sukin-os'})
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
      await this.#kernel.loadUserAppsFromDb()

      // 初始化系统的注册表。
      this.#kernel.initializeSystemApps()

      // 从后端同步系统APP访问权限，移除当前用户无权访问的系统应用
      await this.#kernel.syncSystemAccess()

      // 通过资源(Res)构建/补全注册表(Sys)。
      // 此时内存中已有 userApps，此函数会安全地为那些“有资源但没注册”的应用生成新记录
      await this.#kernel.syncRegistryByRes()

      /*
        同步文件系统，确保物理文件、内存注册表和数据库三者状态一致
        但是现在这里不再是必须的了!必需的行为将会变为从资源res中读取应用资源,再 注入到sys中[因为这里,原来的架构是会删除这个的僵尸sys]
      */
      //:: await this.syncResourcesToFiles()  //将indexDb的数据资源写入indexDb [这里可以加密处理第一步确定资源不被修改]

      // 从资源文件[注意是文件不是注册表]里解析出资源Id，同时更新到注册表。
      // 这一步主要负责关联本地文件句柄 和处理僵尸文件
      await this.syncRegistry()
      //将app信息[实际是资源]同步到store,方便对appStore管理操作
      // [暂且保留，虽然有点没必要但是为了减少其他额外操作。]
      // 恢复上一次的会话状态
      await this.#kernel.restoreSession()
      alert.success('[内核] 初始化成功。')

      try {
        initDatabase()
          .then(() => {
            // alert.success('[内核] 数据库初始化成功')
          })
          .catch(err => {})
      } catch (err) {
      alert.failure('[内核] 数据库初始化失败:', err)
      }
      return true
    } catch (err) {
      alert.failure(err)
      return false
    }
  }

  async ensurePresets() {
    //处理系统资源
    if (!this.#kernel.resDb.isOpen()) await this.#kernel.resDb.openDB()
    for (const preset of PRESET_RESOURCES) {
      const presetResId = preset?.[ENV_KEY_RESOURCE_ID]
      if (ADMIN_APP_IDS.includes(presetResId) && !this.#kernel.currentUser?.root) {
        continue
      }
      await this.#kernel.resDb.putData(preset)
    }
    //---处理instance
    if (!this.#kernel.instanceDb.isOpen()) {
      await this.#kernel.instanceDb.openDB()
      await this.#kernel.instanceDb.clearAll() //清除所有旧的状态
    }
    //更新系统句柄
    await this.#kernel.instanceDb.putData({id: DB_INSTANCE_ID, dirHandle: this.#kernel.dirHandle})
  }

  //加载资源到内存
  async loadAllResources() {
    if (!this.#kernel.resDb.isOpen()) await this.#kernel.resDb.openDB()
    const all = await this.#kernel.resDb.getAllData()
    this.#kernel.resourceCache = {}
    all.forEach(res => (this.#kernel.resourceCache[res?.[ENV_KEY_RESOURCE_ID]] = res))
  }

  async executeInstallation(params) {
    return extExecuteInstallation(this.#kernel, params)
  }

  async syncResourcesToFiles() {
    // --- 文件系统同步 ---
    //将从注册表indexDb读取的用户资源写入/同步至本 地,可以在这里做版本验证
    return extSyncResourcesToFiles(this.#kernel)
  }

  async writeAppFile(res) {
    //注意认为id is 唯一的,name就是app的名字,允许多安装
    //写入app状态信息到本地
    return extWriteAppFile(this.#kernel, res)
  }

  async uploadResource(params) {
    //资源[app]上传,注意并没有分配pid,pid分配依赖注册表同步[这里的核心是优先创建worker，通过注册表更新资源]
    return extUploadResource(this.#kernel, params)
  }

  async syncRegistry() {
    /**
     * 通过indexDb的注册表[此时还没有检测本地apps]:去管理本地文件系统的资源 and indexDb的资源
     * 这是一个核心维护函数，确保文件系统、内存和数据库三者之间的数据一致性。
     * 它处理 "僵尸文件" (物理文件存在但无注册记录) 和 "孤儿记录" (注册记录存在但无物理文件),他只负责文件句柄的删除
     * 这里实际应该做版本和服务校验,放置本地端被修改,默认采用本地模式。
     */
    return extSyncRegistry(this.#kernel)
  }

  async syncRegistryByRes() {
    // 通过资源IndexDb去注册
    return extSyncRegistryByRes(this.#kernel)
  }

  async updateApp(params) {
    //更新App//更新App
    return extUpdateApp(this.#kernel, params)
  }

  async installApp(params) {
    //安装App这里后续实际可以考虑把所有整合简约一下
    const {worker, version} = params
    return this.#kernel.executeInstallation({mode: 'INSTALL_APP', data: {worker, version}})
  }

  async deleteApp(params) {
    //删除非系统内置App
    return extDeleteApp(this.#kernel, params)
  }
}

// ─── 代理导出函数 ──────────────────────

export async function init(kernel, info) {
  return kernel.core.init(info)
}

export async function ensurePresets(kernel) {
  return kernel.core.ensurePresets()
}

export async function loadAllResources(kernel) {
  return kernel.core.loadAllResources()
}

export async function executeInstallation(kernel, params) {
  return kernel.core.executeInstallation(params)
}

export async function syncResourcesToFiles(kernel) {
  // --- 文件系统同步 ---
  //将从注册表indexDb读取的用户资源写入/同步至本 地,可以在这里做版本验证
  return kernel.core.syncResourcesToFiles()
}

export async function writeAppFile(kernel, res) {
  //注意认为id是唯一的,name就是app的名字,允许多安装
  //写入app状态信息到本地
  return kernel.core.writeAppFile(res)
}

export async function uploadResource(kernel, params) {
  //资源[app]上传,注意并没有分配pid,pid分配依赖注册表同步[这里的核心是优先创建worker，通过注册表更新资源]

  return kernel.core.uploadResource(params)
}

export async function syncRegistry(kernel) {
  /**
   * 通过indexDb的注册表[此时还没有检测本地apps]:去管理本地文件系统的资源 and indexDb的资源
   * 这是一个核心维护函数，确保文件系统、内存和数据库三者之间的数据一致性。
   * 它处理 "僵尸文件" (物理文件存在但无注册记录) 和 "孤儿记录" (注册记录存在但无物理文件),他只负责文件句柄的删除
   * 这里实际应该做版本和服务校验,放置本地端被修改,默认采用本地模式。
   */

  return kernel.core.syncRegistry()
}

export async function syncRegistryByRes(kernel) {
  // 通过资源IndexDb去注册
  return kernel.core.syncRegistryByRes()
}

export async function updateApp(kernel, params) {
  //更新App
  return kernel.core.updateApp(params)
}

export async function installApp(kernel, params) {
  //安装App这里后续实际可以考虑把所有整合简约一下
  return kernel.core.installApp(params)
}

export async function deleteApp(kernel, params) {
  //删除非系统内置App
  return kernel.core.deleteApp(params)
}
