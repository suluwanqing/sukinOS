import IndexDb from './indexDb';
import { BabelLoader } from './babelLoader';
import { DB_SYS, DB_RES, SUKIN_EXT ,SUKIN_PRE,TRUTH_ALL_APP} from '../config';
import { PRESET_RESOURCES } from '@/main/resources/preset_resources';
import { generateWorker,parseWorkerCode} from './generateWorker';
import { alert } from "@/component/alert/layout"
class Kernel {
  constructor() {
    // --- 持久化存储 ---
    this.sysDb = new IndexDb(DB_SYS); // 负责存储用户应用的注册表信息 (IndexedDB)[app.name为主键]
    this.resDb = new IndexDb(DB_RES); // 负责存储所有应用的源资源，如代码、元数据等 (IndexedDB)[app.id为主键]
    this.dirHandle = null; // 用户授权的本地文件系统目录句柄

    // --- 运行时状态管理核心 ---
    // 此 Map 存储所有已启动的 Worker 进程实例。
    // 无论是 'RUNNING' (活动) 还是 'HIBERNATED' (休眠) 状态的应用，只要它的进程在运行，就会在这里有记录。
    this.processes = new Map(); // 存储: { pid -> { worker, url } }

    // 应用的内存注册表，作为运行时的唯一真实数据源，保证了高性能和状态一致性。
    this.systemApps = new Map(); // 存储系统应用的元数据
    this.userApps = new Map();   // 存储用户应用的元数据，在init时从sysDb加载

    // --- 缓存与事件通信 ---
    this.subscribers = new Map(); // UI组件订阅应用状态变化的集合
    this.stateCache = new Map(); // 缓存来自应用Worker的最新UI状态，用于新订阅者立即获取
    this.resourceCache = {}; // 所有应用资源的缓存 (代码逻辑、内容等)
    this.eventBus = new EventTarget(); // 用于系统级事件的发布/订阅

    // --- 预设与会话 ---
    this.presetResourceIds = new Set(); // 预设资源的ID集合，用于特殊处理 (如禁止写入,和修改,实际应该更多处理,如版本控制等,字符标胶)
    this.currentUser = null; // 当前登录的用户信息
  }
  // 检查一个PID是否属于系统应用

  isSystemApp(pid) {
    return this.systemApps.has(pid);
  }
  // 内核初始化函数
  async init() {
    try {
      this.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'sukin-os' });
    } catch (e) {
      alert.warning('用户取消打开！')
      return false;
    }

    try {
      // 加载核心依赖和资源
      await BabelLoader.load();
      await this.ensurePresets();
      await this.loadAllResources();

      // 构建内存中的应用注册表
      this._initializeSystemApps();    //系统的注册表 直接注入pid
      await this._loadUserAppsFromDb(); // 从DB加载用户应用到内存  注入pid

      // 同步文件系统，确保物理文件、内存注册表和数据库三者状态一致
      await this.syncResourcesToFiles();  //将indexDb的数据资源写入indexDb [这里可以加密处理第一步确定资源不被修改]
      await this.syncRegistry(); //从资源文件里解析出资源Id，同时更新到注册表

      // 恢复上一次的会话状态
      await this.restoreSession();

      alert.success("[内核] 初始化成功。");
      return true
    } catch (err) {
      alert.failure(err)
      return false // 初始化过程中发生任何错误都视为失败
    }
  }
  /*================================================内部辅助函数[分布:分区大于辅助]==============================================*/
  // 初始化系统应用数据到=>内存注册表
  _initializeSystemApps() {
    for (const preset of PRESET_RESOURCES) {
      this.presetResourceIds.add(preset.id);
      const pid = `system-pid-${preset.id}`;
      if (this.systemApps.has(pid)) continue;
      this._updateSystemAppInfo(pid, {
        pid, name: `${preset.name}`, resourceId: preset.id,
        savedState: null, status: 'INSTALLED', isSystemApp: true,
        metaInfo: preset.metaInfo
      })
    }
  }
  // 僵尸文件检查逻辑
  async _inspectZombieFile(fileHandle) {
    const result = {
      isValidZombie: false,
      shouldRemove: false,
      appData: null
    };
    try {
      const file = await fileHandle.getFile();
      const text = await file.text();
      // 提取资源ID
      const match = text.match(/const SYS_CONFIG\s*=\s*\{[^}]*resourceId\s*:\s*'([^']+)'/);
      if (!match || !match[1]) {
        result.shouldRemove = true;
        console.warn(`[内核] 发现僵尸文件 ${fileHandle.name}，无法解析资源ID`);
        return result;
      }
      const resourceId = match[1];
      // 检查资源是否存在且非系统资源
      const existingResource = this.getResource(resourceId);
      if (existingResource && !this.presetResourceIds.has(resourceId)) {
        // 有效僵尸文件：资源存在但未注册
        result.isValidZombie = true;
        result.appData = {
          pid: crypto.randomUUID(),
          resourceId,
          name: fileHandle.name,
          handle: fileHandle,
          savedState: null,
          status: 'INSTALLED',
          metaInfo: { ...existingResource?.metaInfo, name: existingResource?.name }
        };
        return result;
      }

      if (TRUTH_ALL_APP) {
        //有效但是没有注册资源和app
        // 尝试自动注册
        const resourceInfo = parseWorkerCode(text);
        if (resourceInfo.resourceId && resourceInfo.name) {
          const newRes = {
            id: resourceInfo.resourceId,
            name: resourceInfo.name,
            isBundle: resourceInfo.isBundle,
            content: resourceInfo.content,
            logic: resourceInfo.logic,
            metaInfo: resourceInfo.metaInfo
          };
          await this.resDb.putData(newRes);
          this.resourceCache[resourceInfo.resourceId] = newRes;
          result.isValidZombie = true;
          result.appData = {
            pid: crypto.randomUUID(),
            resourceId: resourceInfo.resourceId,
            name: fileHandle.name,
            handle: fileHandle,
            savedState: null,
            status: 'INSTALLED',
            metaInfo: { ...resourceInfo?.metaInfo, name: existingResource?.name }
          };
          console.info(`[内核] 自动注册资源: ${resourceInfo.name}`);
          return result;
        }
      } else {
        // 需要删除的情况
        result.shouldRemove = true;
        console.warn(`[内核] 发现无效文件 ${fileHandle.name}，资源ID: ${resourceId}`);
      }
    } catch (e) {
      console.error(`[内核] 检查文件 ${fileHandle.name} 时失败:`, e);
      result.shouldRemove = true;
    }

    return result;
  }
  //更新系统的sys信息,注意系统只有内存有注册表
  _updateSystemAppInfo(pid, info) {
    this.systemApps.set(pid, info);
  }
  //更新用户app信息
  _updateUseAppInfo(pid, info) {
    this.userApps.set(pid, info)
  }

  //从indexDb获取用户的注册表=>内存注册表。
  async _loadUserAppsFromDb() {
    if (!this.sysDb.isOpen()) await this.sysDb.openDB();
    const allUserApps = await this.sysDb.getAllData();
    allUserApps.forEach(app => this._updateUseAppInfo(app.pid, app));
    // alert.success('[内核] 用户应用已加载到内存:', this.userApps.size, '个');
  }

  // 获取资源,因为都是加载到内存里的
  getResource(id) { return this.resourceCache[id]; }

  async ensurePresets() {
    if (!this.resDb.isOpen()) await this.resDb.openDB();
    for (const preset of PRESET_RESOURCES) await this.resDb.putData(preset);
  }

  //加载资源到内存
  async loadAllResources() {
    if (!this.resDb.isOpen()) await this.resDb.openDB();
    const all = await this.resDb.getAllData();
    this.resourceCache = {};
    all.forEach(res => this.resourceCache[res.id] = res);
  }

  // --- 文件系统同步 ---
  async syncResourcesToFiles() { //将从注册表indexDb读取的用户资源写入/同步至本地,可以在这里做版本验证
    if (!this.dirHandle) return;
    for (const res of Object.values(this.resourceCache)) {
      if (!this.presetResourceIds.has(res.id)) {
        const fileName = `${SUKIN_PRE}${res.name}${SUKIN_EXT}`;
        try { await this.dirHandle.getFileHandle(fileName); }
        catch (e) { await this.writeAppFile(res); }
      }
    }
  }
  //注意认为id是唯一的,name就是app的名字,允许多安装
  async writeAppFile(res) {
    if (this.presetResourceIds.has(res.id)) return;
    const fileName = `${SUKIN_PRE}${res.name}${SUKIN_EXT}`;
    const handle = await this.dirHandle.getFileHandle(fileName, { create: true });
    const writable = await handle.createWritable();
    const code = generateWorker(res.id, res.name, res.isBundle, res.logic, res.content, res.metaInfo);
    await writable.write(code);
    await writable.close();
  }
  //资源[app]上传,注意并没有分配pid,pid分配依赖注册表同步[这里的核心是优先创建worker，通过注册表更新资源]
  async uploadResource({ name, isBundle, content, logic, metaInfo = {} }) {
    if (!metaInfo.seed) {
      const errorMsg = "内部错误：缺少应用ID种子(seed)。";
      alert.failure(errorMsg);
      return Promise.reject(new Error(errorMsg));
    }
    const id = `app-${metaInfo.authorId}-${metaInfo.seed}`;
    const newRes = {
      id, name, isBundle, content, logic,
      metaInfo: {
        authorId: metaInfo.authorId, authorName: metaInfo.authorName,
        createdAt: new Date().toISOString(),
        icon: metaInfo.icon || null,
        initialSize: {
          w: Math.max(500, metaInfo.initialSize?.w || 500), h: Math.max(400, metaInfo.initialSize?.h || 400),
        },
        custom:metaInfo.custom  //用户行为习惯
      }
    };
    await this.resDb.putData(newRes);//存入到资源indexDb里
    this.resourceCache[id] = newRes;
    await this.writeAppFile({ ...newRes, content });
    await this.syncRegistry();
    this._emitChange();
    return id;
  }

  /**
   * 通过indexDb的注册表[此时还没有检测本地apps]:去管理本地文件系统的资源和indexDb的资源
   * 这是一个核心维护函数，确保文件系统、内存和数据库三者之间的数据一致性。
   * 它处理 "僵尸文件" (物理文件存在但无注册记录) 和 "孤儿记录" (注册记录存在但无物理文件)。
   * 这里实际应该做版本和服务校验,放置本地端被修改,默认采用本地模式。
   */
  async syncRegistry() {
    if (!this.dirHandle) return;
    try {
      if (!this.sysDb.isOpen()) await this.sysDb.openDB();

      const physicalFiles = new Set(); // 物理文件集合
      const filesToRemove = [];        // 待删除文件
      const appsToRegister = [];       // 待注册的僵尸应用

      // 扫描物理文件
      for await (const entry of this.dirHandle.values()) {
        if (entry.kind === 'file' && entry.name.endsWith(SUKIN_EXT)) {
          physicalFiles.add(entry.name);

          // 检查是否已注册
          const isRegistered = Array.from(this.userApps.values())
            .some(app => app.name === entry.name);

          if (isRegistered) {
            // 更新已注册应用的句柄
            const appEntry = Array.from(this.userApps.entries())
              .find(([, app]) => app.name === entry.name);
            if (appEntry) {
              const [, appData] = appEntry;
              appData.handle = entry;
            }
          } else {
            // 处理未注册文件（僵尸文件）
            const inspectionResult = await this._inspectZombieFile(entry);
            if (inspectionResult.isValidZombie && inspectionResult.appData) {
              appsToRegister.push(inspectionResult.appData);
            } else if (inspectionResult.shouldRemove) {
              filesToRemove.push(entry);
            }
          }
        }
      }

      // 注册有效的僵尸文件
      for (const appData of appsToRegister) {
        this._updateUseAppInfo(appData.pid, appData);
        await this.sysDb.putData(appData);
        console.info(`[内核] 已为文件 ${appData.name} 重新注册。`);//实际可能是初始化[因为我们架构是优先注册表之后依赖同步来注入sys]/僵尸
      }

      // 清理孤儿记录
      for (const app of this.userApps.values()) {
        if (!physicalFiles.has(app.name)) {
          console.warn(`[内核] 清理孤儿用户注册表记录: ${app.name}`);
          this._kill(app.pid);
          this.stateCache.delete(app.pid);
          this.userApps.delete(app.pid);
          await this.sysDb.deleteData(app.name);
        }
      }

      //  删除无效文件
      if (filesToRemove.length > 0) {
        console.info(`[内核] 开始清理 ${filesToRemove.length} 个无效文件...`);
        for (const fileHandle of filesToRemove) {
          try {
            await fileHandle.remove();
            console.info(`[内核] 已删除无效文件: ${fileHandle.name}`);
          } catch (deleteError) {
            console.error(`[内核错误] 删除文件 ${fileHandle.name} 时失败:`, deleteError);
          }
        }
      }

    } catch (e) {
      console.error("[内核] syncRegistry 过程中发生错误:", e);
    }
  }
  _kill(pid) {
    const p = this.processes.get(pid);
    if (p) { p.worker.terminate(); URL.revokeObjectURL(p.url); this.processes.delete(pid); }
  }
  _getApp(pid) {
    return this.systemApps.get(pid) || this.userApps.get(pid);
  }
  /*================================================公共 API (供UI层调用)=================================*/
  _getProcessApp(pid) {
    const processApps=this.processes.values()
    return processApps.filter(app=>app.pid===pid)[0]
  }
  getRunningApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()];
    return allApps.filter(app => app.status === 'RUNNING');
  }
  getHibernatedApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()];
    return allApps.filter(app => app.status === 'HIBERNATED');
  }
  getBlockEdApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()];
    return allApps.filter(app => app.metaInfo?.custom?.blockEd);
    //custom是用户个人习惯,在安装的时候进行注入但是系统App会设置某些字段不允许被注入
    //这里考虑版本更新的跳过等等
  }
  getTypeApps(appType) {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()];
    return allApps.filter(app => app.metaInfo.appType === appType);
  }
  async getApps() {
    const allApps = [...this.systemApps.values(), ...this.userApps.values()];
    return allApps.map(a => ({ ...a, isRunning: this.processes.has(a.pid) }));
  }
  async appIntereact({ process, interactInfo }) {//这里为了后续方便优化提取出来
    process.postMessage({type:"APP_INTERACT",payload:interactInfo})
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
  async startProcess({ pid, interactInfo }) {
    const app = this._getApp(pid);
    if (!app) {
      alert.warning(`[内核] 尝试启动一个不存在的应用，pid: ${pid}`);
    }
    //无论何种情况，都先准备好将要返回的窗口几何信息。
    // 这保证了API的调用者总能获得预期的返回值。
    const resource = this.getResource(app.resourceId);
    //进程已在运行 (Worker实例已存在)
    if (this.processes.has(pid)) {
      // 如果应用处于休眠状态，则唤醒它
      if (app.status === 'HIBERNATED') {
        app.status = 'RUNNING';
        if (!app.isSystemApp) {
          await this.sysDb.updateData(app.name, { status: 'RUNNING' });
        }
        if (interactInfo) {
          const p = await this._getProcessApp(pid)
          this.appIntereact({process:p,interactInfo })
        }
        // alert.success(`[内核] 应用 ${app.name} (pid: ${pid}) 已恢复运行。`);
        this._emitChange();
      }
      // 无论之前是 HIBERNATED 还是 RUNNING，都通知UI并返回窗口状态
      this._notify(pid, 'STATE', this.stateCache.get(pid));
    }

    // 进程未运行 (冷启动)
    try {
      let workerCode;
      if (app.isSystemApp) {
        if (!resource) throw new Error(`系统资源 '${app.name}' 未找到!`)
        workerCode = generateWorker(resource.id,
          resource.name,
          resource.isBundle,
          resource.logic,
          resource.content,
          resource.metaInfo
        );
      } else {
        if ((await app.handle.queryPermission({ mode: 'read' })) !== 'granted') await app.handle.requestPermission({ mode: 'read' });
        const file = await app.handle.getFile();
        workerCode = await file.text();
      }

      const url = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
      const worker = new Worker(url, { name: pid });
      worker.onmessage = e => this._handleMsg(pid, e.data);
      this.processes.set(pid, { worker, url });

      // 发送初始化或恢复状态的消息
      const stateToRestore = app.savedState?.app;
      worker.postMessage({ type: stateToRestore ? 'RESTORE' : 'INIT', payload: stateToRestore });
      if (interactInfo) {
            this.appIntereact({process:worker,interactInfo })
      }
      // if (this.currentUser) {
      //   worker.postMessage({ type: 'UI_ACTION', payload: { type: 'USER_UPDATE', payload: this.currentUser } });
      // }

      // 更新内存和DB中的状态为 'RUNNING'
      app.status = 'RUNNING';
      if (!app.isSystemApp) {
        await this.sysDb.updateData(app.name, { status: 'RUNNING' });
      }
      this._emitChange();

    } catch (e) {
      alert.warning(`[内核] 启动应用 ${app.name} (pid: ${pid}) 失败:`, e);
      this._kill(pid); // 启动失败时清理进程
    }
  }


  //存储这个关于,窗口状态,后续可以考虑多模式处理,是冷启动还是热。主要方案1.适用display全部热启动。方案二:外壳全部display,内层冷启动
  async saveWindowState(pid, windowRect) {
    const app = this._getApp(pid);
    if (!app) return;
    if (!app.savedState) app.savedState = { app: null, window: null };
    app.savedState.window = windowRect;
    if (!app.isSystemApp) {
      await this.sysDb.updateData(app.name, { savedState: app.savedState });
    }
  }

  /**
   * 强制所有正在运行的应用保存其内部状态。
   * 这个接口主要用于页面关闭前（例如在 beforeunload 事件中调用），
   * 以确保所有应用的最新状态都被持久化，从而实现完美的会话恢复。
   */
  forceSaveAllStates() {
    alert.success('[内核] 正在强制保存所有应用状态...');
    for (const pid of this.processes.keys()) {
      const p = this.processes.get(pid);
      if (p && p.worker) {
        // 向每个 worker 发送保存状态的指令。
        // 这是一个“即发即忘”的操作，因为 beforeunload 事件的执行时间有限，我们不等待回复。
        p.worker.postMessage({ type: 'SAVE_STATE' });
      }
    }
    // alert.success('[内核] 已向所有活动进程发送保存状态指令。');
  }

  /**
   * 休眠一个应用。
   * 此操作只改变应用的状态标记为 'HIBERNATED'，不会终止Worker进程。
   * Worker会继续在后台运行，保持其内部状态是“热”的。
   */
  async hibernate(pid) {
    const app = this._getApp(pid);
    if (app && app.status === 'RUNNING') {
      // 更新内存状态
      app.status = 'HIBERNATED';
      // 如果是用户应用，立即同步到数据库
      if (!app.isSystemApp) {
        // 写入 status 的同时，写入 savedState
        // 这里的 app.savedState 应该是最新的，因为 _handleMsg 里的 STATE_UPDATE 一直在实时更新它
        await this.sysDb.updateData(app.name, {
          status: 'HIBERNATED',
          savedState: app.savedState
        });
      } else {
        //也更新状态,因为我们新增了display模式
        this._updateSystemAppInfo(pid, { ...this.systemApps.get(pid), status: 'HIBERNATED' })
      }
      // alert.success(`[内核] 应用 ${app.name} 已休眠并保存进度。`);
      this._emitChange('休眠');
    }
  }


  /**
   * 强制关闭一个应用 (与hibernate不同)。
   * 此操作会彻底终止Worker进程，并清除所有已保存的状态，使应用恢复到初始安装状态。
   */
  async forceKillProcess(pid) {
    this._kill(pid);
    this.stateCache.delete(pid);
    const app = this._getApp(pid);
    if (app) {
      app.status = 'INSTALLED';
      app.savedState = null; //清除所有状态
      if (!app.isSystemApp) {
        await this.sysDb.updateData(app.name, { status: 'INSTALLED', savedState: null });
      }
      console.log(`[内核] 应用 ${app.name} (pid: ${pid}) 已被强制关闭，状态已重置。`);
    }
    this._emitChange();
  }

  //删除非系统内置App
  async deleteApp(pid, resourceId) {
    try {
      //因为我们的架构是在分配注册表的时候就注入这个pid
      if (this.presetResourceIds.has(resourceId)) {
        alert.warning("系统预置资源不可删除");
        return;
      }

      const app = await this._getApp(pid)
      const sys = await this.sysDb.getData(app.name)  //获取文件句柄
      const handle = sys.handle
      await handle.remove();  //删除本地文件
      if (app.status !== "INSTALLED") {
        await this.forceKillProcess(pid)    //先杀死App,注意,有状态更新,所以注意顺序,避免被重新注册
      }
      this.userApps.delete(pid)        //删除缓存注册表
      await this.sysDb.deleteData(app.name)    //删除应用注册表[indexDb]
      await this.resDb.deleteData(resourceId);    //删除资源[indexDb]
      delete this.resourceCache[resourceId];       //删除资源缓存
      this._emitChange();
    }
    catch (err) {
      console.log(err)
      alert.failure(`删除失败: ${err.toISOString}`)
    }
  }


  // --- 系统恢复与进程管理 ---
  async restoreSession() {
    try {
      const allApps = [...this.systemApps.values(), ...this.userApps.values()];
      const appsToRestore = allApps.filter(a => a.status === 'RUNNING' || a.status === 'HIBERNATED');

      // new Promise.all([])
      for (const app of appsToRestore) {
        await this.startProcess({pid:app.pid });
      }
    }
    catch (err) {
      alert.failure(err);
    }
  }
  /*=============================================App间交互==============================================*/

  //拉起/唤起App
  async evokeApp({ pid, from, interactInfo }) {
    const tragetApp = await this._getApp(pid)
    if (!tragetApp) { alert.failure('唤起失败!App未注册或已删除!') }
    const p = await this._getProcessApp(pid)
    const newInteractInfo={...interactInfo, from} //注入from[App]信息
    if (p) {
      this.appIntereact({ process: p, interactInfo: newInteractInfo })
    } else {
      this.startProcess({ pid, interactInfo: newInteractInfo })
    }
  }
  /*======================================事件分发与订阅====================================*/
  dispatch(pid, action) {
    const p = this.processes.get(pid);
    const isSystem=this.isSystemApp(pid)
    if (!p) return;
    if (action.type === 'KERNEL_CALL' && action.payload) {
       isSystem ? this._systemSwitch(p,action.payload)  :  this._notSystemSwitch(p,action.payload)
       return
    }
    //非内核事件,转发给对应的worker进程
    p.worker.postMessage({ type: 'UI_ACTION', payload: action });
  }

  //订阅App行为
  subscribeApp(pid, cb) {
    if (!this.subscribers.has(pid)) this.subscribers.set(pid, new Set());
    this.subscribers.get(pid).add(cb);
    const cached = this.stateCache.get(pid);
    if (cached) cb({ type: 'STATE', payload: cached });
    return () => this.subscribers.get(pid)?.delete(cb);
  }
  //订阅系统行为
  subscribeSystem(cb) {
    const handler = () => {
      // console.log('触发订阅', cb);
      cb();
    };
    this.eventBus.addEventListener('sys_change', handler);
    return () => {
      this.eventBus.removeEventListener('sys_change', handler);
    };
  }
  _emitChange(info) {this.eventBus.dispatchEvent(new Event('sys_change')); }
  _notify(pid, type, data) { this.subscribers.get(pid)?.forEach(cb => cb({ type, payload: data })); }

  // --- 接收来自Worker消息处理 ---
  async _handleMsg(pid, msg) {
    if (msg.type === 'STATE_UPDATE') {
      this.stateCache.set(pid, msg.payload);
      this._notify(pid, 'STATE', msg.payload);
    } else if (msg.type === 'SAVE_STATE') {
      const app = this._getApp(pid);
      if (app) {
        if (!app.savedState) app.savedState = { app: null, window: null };
        app.savedState.app = msg.payload;
        if (!app.isSystemApp) {
          await this.sysDb.updateData(app.name, { savedState: app.savedState });
        }
      }
    }
  }
  _systemSwitch(p,payload) {
    const { method, args } =payload;
    switch (method) {
      case 'UPLOAD_RESOURCE': {
        //这里是旧架构原因这里保持
        this.uploadResource({
          name: args.name,
          isBundle: args.isBundle,
          content: args.content,
          logic: args.logic,
          metaInfo: args.metaInfo
        })
          .then(() => p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'MSG', payload: '应用安装成功！' } }))
          .catch(e => p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'MSG', payload: `错误: ${e.message}` } }));
        break
      }
      // case 'LOGIN': {
      //    if (this.login(args.userId, args.userName)) {
      //     p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'USER_UPDATE', payload: this.currentUser } });
      //   }
      //   break
      // }
      // case 'LOGOUT': {
      //   this.logout();
      //   p.worker.postMessage({ type: 'UI_ACTION', payload: { type: 'USER_UPDATE', payload: null } });
      //   break
      // }
      default: {
        alert.warning('未找到对应处理器!')
        break
       }
    }
  }
  _notSystemSwitch(p,payload) {
    const { method, args } =payload;
    switch (method) {
        default: {
          alert.warning('未找到对应处理器!')
          break
       }
    }
  }

    /*============================================系统App可用Api[逻辑层]========================================*/
  // login(userId, userName) {
  //   if (!userId || !userName) return false;
  //   this.currentUser = { id: userId, name: userName };
  //   alert.success(`[内核] 用户 ${userName} (ID: ${userId}) 已登录。`);
  //   this._emitChange();
  //   return true;
  // }

  // logout() {
  //   alert.success(`[内核] 用户 ${this.currentUser?.name} 已登出。`);
  //   this.currentUser = null;
  //   this._emitChange();
  // }
}
export default new Kernel();
