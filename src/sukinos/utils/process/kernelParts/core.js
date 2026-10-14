import {BabelLoader} from '../babelLoader'
import {alert} from '@/component/alert/layout'
import {PRESET_RESOURCES} from '@/sukinos/resources/preset_resources'
import {DB_INSTANCE_ID, ENV_KEY_RESOURCE_ID} from '@/sukinos/utils/config'
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

    // 按用户初始化独立数据库（必须在任何 DB 操作之前）
    await this.#kernel.initDatabases(user?.id)
    try {
      this.#kernel.dirHandle = isPrivate
        ? await navigator.storage.getDirectory()
        : await window.showDirectoryPicker({mode: 'readwrite', id: 'sukin-os'})
    } catch (e) {
      alert.warning('用户取消打开！')
      return false
    }

    try {
      await BabelLoader.load()
      // 提前从后端同步系统 APP 访问权限，得到准入集合 allowedSystemResIds，供后续注册按准入制进行，减少无权资源的暴露
      await this.#kernel.syncSystemAccess()
      await this.ensurePresets()
      await this.loadAllResources()

      // 先从 sys 的 DB 加载用户应用到内存：必须先加载已有记录，才知道哪些资源已分配 PID，避免 syncRegistryByRes 重复创建/改 PID
      await this.#kernel.loadUserAppsFromDb()

      this.#kernel.initializeSystemApps()

      // 按资源(Res)补全注册表(Sys)：此时内存中已有 userApps，仅为「有资源但没注册」的应用生成新记录
      await this.#kernel.syncRegistryByRes()

      // syncResourcesToFiles 这步已停用：必需行为改为从资源 res 读取应用信息再注入 sys，不再在此同步文件系统（原架构会删除僵尸 sys）
      // 从资源文件（注意是文件而非注册表）解析资源 Id 并更新注册表：负责关联本地文件句柄与处理僵尸文件
      await this.syncRegistry()
      // 说明：把 app 信息[实际是资源]同步到 store 这一步「暂且保留」——虽略冗余，但为减少其他额外操作
      await this.#kernel.restoreSession()
      // 订阅个性化配置变更，实现全局 auto-save 间隔的响应式更新
      this.#kernel.subscribePersonalization()
      alert.success('[内核] 初始化成功。')

      try {
        initDatabase()
          .then(() => {
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
    if (!this.#kernel.resDb.isOpen()) await this.#kernel.resDb.openDB()
    // 仅当前用户有权访问的系统资源 ID（由 syncSystemAccess 提前获取）
    const allowed = this.#kernel.allowedSystemResIds || new Set()
    for (const preset of PRESET_RESOURCES) {
      const presetResId = preset?.[ENV_KEY_RESOURCE_ID]
      if (allowed.has(presetResId)) {
        await this.#kernel.resDb.putData(preset)
      } else {
        await this.#kernel.resDb.deleteData(presetResId)
      }
    }
    if (!this.#kernel.instanceDb.isOpen()) {
      await this.#kernel.instanceDb.openDB()
      await this.#kernel.instanceDb.clearAll()
    }
    await this.#kernel.instanceDb.putData({id: DB_INSTANCE_ID, dirHandle: this.#kernel.dirHandle})
  }

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
    // 将注册表 indexDb 中的用户资源写入/同步到本地文件
    return extSyncResourcesToFiles(this.#kernel)
  }

  async writeAppFile(res) {
    // 约定：id 唯一，name 即 app 名字，允许多装
    return extWriteAppFile(this.#kernel, res)
  }

  async uploadResource(params) {
    //资源[app]上传,注意并没有分配pid,pid分配依赖注册表同步[这里的核心是优先创建worker，通过注册表更新资源]
    return extUploadResource(this.#kernel, params)
  }

  async syncRegistry() {
    // 核心维护函数：以 indexDb 注册表[此时还没检测本地 apps]为准对齐本地文件与 res，保证文件系统/内存/数据库三者一致
    // 只负责删除文件句柄：处理"僵尸文件"(有文件无注册)与"孤儿记录"(有注册无文件)；未做版本与服务校验，默认以本地为准
    return extSyncRegistry(this.#kernel)
  }

  async syncRegistryByRes() {
    return extSyncRegistryByRes(this.#kernel)
  }

  async updateApp(params) {
    return extUpdateApp(this.#kernel, params)
  }

  async installApp(params) {
    const {worker, version} = params
    return this.#kernel.executeInstallation({mode: 'INSTALL_APP', data: {worker, version}})
  }

  async deleteApp(params) {
    //删除非系统内置App
    return extDeleteApp(this.#kernel, params)
  }
}

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
  return kernel.core.syncResourcesToFiles()
}

export async function writeAppFile(kernel, res) {
  return kernel.core.writeAppFile(res)
}

export async function uploadResource(kernel, params) {

  return kernel.core.uploadResource(params)
}

export async function syncRegistry(kernel) {

  return kernel.core.syncRegistry()
}

export async function syncRegistryByRes(kernel) {
  return kernel.core.syncRegistryByRes()
}

export async function updateApp(kernel, params) {
  return kernel.core.updateApp(params)
}

export async function installApp(kernel, params) {
  return kernel.core.installApp(params)
}

export async function deleteApp(kernel, params) {
  return kernel.core.deleteApp(params)
}
