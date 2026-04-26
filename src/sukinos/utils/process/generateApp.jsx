import { SUKIN_EXT ,SUKIN_PRE,TRUTH_ALL_APP} from '@/sukinos/utils/config'
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
} from '@/sukinos/utils/config'
import { generateWorker, parseWorkerCode } from './generateWorker'
import { alert } from "@/component/alert/layout"
import { sukinOs as sukinApi } from "@/apis/main"
import generateShortSeed from '/utils/js/rootSeed'
import {clearSandboxStorageByPid} from '@/sukinos/utils/security'
// 基础应用注册写入逻辑SYS
export async function extRegisterAppSys(kernel, appSys) {
  kernel.updateUserAppInfo(appSys.pid, appSys);
  kernel.resourceIdToPid.set(appSys?.[ENV_KEY_RESOURCE_ID], appSys.pid);
  kernel.pidToResourceId.set(appSys.pid, appSys?.[ENV_KEY_RESOURCE_ID]);
  await kernel.sysDb.putData(appSys);
}

// 僵尸文件检查解析逻辑
export async function extInspectZombieFile(kernel, fileHandle) {
  const result = {
    isValidZombie: false,
    shouldRemove: false,
    appSys: null
  }
  try {
    const file = await fileHandle.getFile()
    const text = await file.text()
    // 提取纯净的应用名称（去除前缀和后缀）
    const cleanName = fileHandle.name.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '')
    // 提取资源ID
    const match = text.match(/const\s+SYS_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*\n/);
    if (!match || !match[1]) {
      result.shouldRemove = true
      console.warn(`[内核] 发现僵尸文件 ${fileHandle.name}，无法解析资源ID`)
      return result
    }

    // 为了获取被环境变量名包裹的资源ID，通过Function进行安全提取
    let resourceId = null;
    try {
      const tempConfig = new Function(`return ${match[1]}`)();
      resourceId = tempConfig?.[ENV_KEY_RESOURCE_ID];
    } catch(e) {
      console.warn('提取僵尸文件资源ID失败', e);
    }

    if (!resourceId) {
      result.shouldRemove = true;
      return result;
    }

    // 检查资源是否存在且非系统资源
    const existingResource = kernel.getResource(resourceId)
    if (existingResource && !kernel.presetResourceIds.has(resourceId)) {
      // 有效僵尸文件：资源存在但未注册
      result.isValidZombie = true
      result.appSys = {
        pid: crypto.randomUUID(),
        [ENV_KEY_RESOURCE_ID]: resourceId,
        [ENV_KEY_NAME]: cleanName, // 使用处理后的名称
        handle: fileHandle,
        savedState: null,
        status: 'INSTALLED',
        [ENV_KEY_META_INFO]: { ...existingResource?.[ENV_KEY_META_INFO], [ENV_KEY_NAME]: existingResource?.[ENV_KEY_NAME] }
      }
      return result
    }

    if (TRUTH_ALL_APP) {
      //有效但是没有注册资源和app
      // 尝试自动注册
      const resourceInfo = parseWorkerCode(text)
      const parsedResId = resourceInfo?.[ENV_KEY_RESOURCE_ID];
      const parsedName = resourceInfo?.[ENV_KEY_NAME];
      if (parsedResId && parsedName) {
        await kernel.resDb.putData(resourceInfo)
        kernel.resourceCache[parsedResId] = resourceInfo
        result.isValidZombie = true
        result.appSys = {
          pid: crypto.randomUUID(),
          [ENV_KEY_RESOURCE_ID]: parsedResId,
          [ENV_KEY_NAME]: cleanName,
          handle: fileHandle,
          savedState: null,
          status: 'INSTALLED',
          [ENV_KEY_META_INFO]: { ...resourceInfo?.[ENV_KEY_META_INFO], [ENV_KEY_NAME]: parsedName }
        }
        console.info(`[内核] 自动注册资源: ${parsedName}`)
        return result
      }
    } else {
      // 需要删除的情况
      result.shouldRemove = true
      console.warn(`[内核] 发现无效文件 ${fileHandle.name}，资源ID: ${resourceId}`)
    }
  } catch (e) {
    console.error(`[内核] 检查文件 ${fileHandle.name} 时失败:`, e)
    result.shouldRemove = true
  }

  return result
}

// 云端上传App逻辑 [解构基于新的 sysOptions]
export async function extUploadCloud(kernel, data) {
  const { resource, sysOptions } = data
  const { userInfo, storePath, uploadInfo } = sysOptions || {};
  try {
    const workerCode = generateWorker(resource)
    if (!workerCode) {
      console.error("Worker 代码为空")
      return
    }
    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const formData = new FormData()
    formData.append('file', blob, 'worker.js')
    formData.append('userId', userInfo?.id)
    formData.append('appName', resource?.[ENV_KEY_NAME])
    formData.append('resourceId', resource?.[ENV_KEY_RESOURCE_ID])
    if(uploadInfo?.isPrivate !== undefined) formData.append('isPrivate', uploadInfo.isPrivate);
    formData.append('metaInfo', JSON.stringify(resource?.[ENV_KEY_META_INFO]))
    const response = await sukinApi.app.uploadApp({url:storePath?.uploadUrl,formData})
    if (response.code === 200) {
      return response.data
    } else {
      alert.failure(response.message)
    }
  } catch (error) {
    console.error('网络请求错误:', error)
  }
}

// 核心安装资源函数 (抽离出的纯净安装核心，避免循环排队导致死锁死循环)
export async function extInstallResource(kernel, args) {
  const name = args?.[ENV_KEY_NAME] || args?.name;
  const resourceId = args?.[ENV_KEY_RESOURCE_ID] || args?.resourceId;
  const version = args?.version || 0.1;
  const isBundle = args?.[ENV_KEY_IS_BUNDLE] || args?.isBundle;
  const content = args?.[ENV_KEY_CONTENT] || args?.content;
  const logic = args?.[ENV_KEY_LOGIC] || args?.logic;
  const metaInfo = args?.[ENV_KEY_META_INFO] || args?.metaInfo || {};

  const truthResourceId = resourceId || `app-${metaInfo?.authorId || 'local'}-${generateShortSeed()}`;

  // 这里不再需要手动一一映射 metaInfo，直接用传递过来的 metaInfo (调用方已优化解构)
  const newRes = {
    [ENV_KEY_RESOURCE_ID]: truthResourceId,
    [ENV_KEY_NAME]: name,
    [ENV_KEY_IS_BUNDLE]: isBundle,
    [ENV_KEY_CONTENT]: content,
    [ENV_KEY_LOGIC]: logic,
    [ENV_KEY_META_INFO]: {
      ...metaInfo,
      createdAt: metaInfo.createdAt || new Date().toISOString(),//如果是本地就是用这个,如果是上传就会使用到服务器的时间
      initialSize: {
        w: Math.max(500, metaInfo?.initialSize?.w || 500), h: Math.max(400, metaInfo?.initialSize?.h || 400),
      },
      [ENV_KEY_NAME]: name,
      version: version
    }
  };
  await kernel.resDb.putData(newRes)//存入到资源indexDb里
  kernel.resourceCache[truthResourceId] = newRes;

  let appSys;
  const existingPid = kernel.getPidByResourceId(truthResourceId);
  if (existingPid && kernel.userApps.has(existingPid)) {
    // 如果应用已存在（更新场景），则合并元数据以保留用户自定义配置
    appSys = kernel.userApps.get(existingPid);
    const currentAppMeta = appSys[ENV_KEY_META_INFO] || {};
    const newResourceMeta = newRes[ENV_KEY_META_INFO] || {};

    // 合并元数据：以新资源为基础，应用用户的自定义设置（如图标），并深度合并 custom 对象
    appSys[ENV_KEY_META_INFO] = {
      ...newResourceMeta,
      ...currentAppMeta,
      custom: {
        ...(newResourceMeta.custom || {}),
        ...(currentAppMeta.custom || {})
      }
    };
    appSys[ENV_KEY_NAME] = name; // 确保名称同步更新
  } else {
    // 全新安装
    appSys = {
      pid: crypto.randomUUID(),
      [ENV_KEY_RESOURCE_ID]: truthResourceId,
      [ENV_KEY_NAME]: name,
      handle: null,
      savedState: null,
      status: 'INSTALLED',
      [ENV_KEY_META_INFO]: newRes[ENV_KEY_META_INFO]
    }
  }

  if (args?.syncLocal || false) {
    //如果允许写入本地同步,将会触发本地写入操作[包括后续状态管理]
    await kernel.writeAppFile({ ...newRes, [ENV_KEY_CONTENT]: content })
    // 尝试获取文件句柄并关联到 appSys 中，这样安装后可以直接访问本地文件
    try {
      const fileName = `${SUKIN_PRE}${name}${SUKIN_EXT}`
      appSys.handle = await kernel.dirHandle.getFileHandle(fileName)
    } catch (e) {
      console.warn(`[内核] 获取本地文件句柄失败: ${name}`)
    }
  }

  // 直接执行基础注册表写入（不在核心逻辑里走 executeInstallation 排队，避免嵌套死锁）
  await extRegisterAppSys(kernel, appSys);
  return truthResourceId
}

// 执行安装/注册行为 (通过队列处理避免阻塞和冲突)
export async function extExecuteInstallation(kernel, params) {
  return new Promise((resolve, reject) => {
    // 替换私有属性访问，改为公开方法代理
    kernel.enqueueInstallTask(async () => {
      try {
        const { mode, data } = params;
        if (mode === 'ZOMBIE_REGISTER') {
          // 真正的僵尸/扫描注册分配处理
          await extRegisterAppSys(kernel, data);
          // console.info(`[内核队列] 已完成僵尸应用注册: ${data?.[ENV_KEY_NAME]}`);
        } else if (mode === 'INSTALL_APP') {
          // 常规安装逻辑
          try {
            const resource = parseWorkerCode(data.worker);
            // 内部直接使用核心安装逻辑，避免再去排队引发任务卡死的互相等待
            await extInstallResource(kernel, { ...resource, version: data.version });
          }
          catch (err) {
            console.log(err)
          }
        }
        kernel.emitChange();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

// 将从注册表indexDb读取的用户资源写入/同步至本地
export async function extSyncResourcesToFiles(kernel) {
  if (!kernel.dirHandle) return
  for (const res of Object.values(kernel.resourceCache)) {
    if (!kernel.presetResourceIds.has(res?.[ENV_KEY_RESOURCE_ID]) &&
      res[ENV_KEY_META_INFO]?.syncLocal || false) {
      //如果允许同步本地才会执行,但是这并不会妨碍,扫描本地app的安装
      const fileName = `${SUKIN_PRE}${res?.[ENV_KEY_NAME]}${SUKIN_EXT}`
      try { await kernel.dirHandle.getFileHandle(fileName) }
      catch (e) { await kernel.writeAppFile(res) }
    }
  }
}

// 写入本地App文件
export async function extWriteAppFile(kernel, res) {
  if (kernel.presetResourceIds.has(res?.[ENV_KEY_RESOURCE_ID])) return
  const fileName = `${SUKIN_PRE}${res?.[ENV_KEY_NAME]}${SUKIN_EXT}`
  const handle = await kernel.dirHandle.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  const code = generateWorker(res)
  await writable.write(code)
  await writable.close()
}

// 资源[app]上传,更新资源缓存 [解构并基于 sysOptions 判定逻辑]
export async function extUploadResource(kernel, args) {
  const metaInfo = args?.[ENV_KEY_META_INFO] || args?.metaInfo || {};
  const sysOptions = args?.sysOptions || {};
  const shouldUpload = sysOptions.shouldUpload || false;

  if (!metaInfo?.authorId) { //简单处理
    const errorMsg = "操作失败：请先登录！"
    alert.warning(errorMsg)
    return Promise.reject(new Error(errorMsg))
  }

  // 调用独立抽离的核心安装逻辑
  const truthResourceId = await extInstallResource(kernel, args);

  // 通知内核状态变更
  kernel.emitChange()
  if (shouldUpload) {
    //上传服务器不等待 [传入提取的 sysOptions]
    const newRes = kernel.resourceCache[truthResourceId];
    kernel.uploadCloud({ resource: newRes, sysOptions })
  }
  return truthResourceId
}

// 同步管理本地文件系统的资源和indexDb的资源,但是这个是指SYS同步::注册行为
export async function extSyncRegistry(kernel) {
  if (!kernel.dirHandle) return
  try {
    if (!kernel.sysDb.isOpen()) await kernel.sysDb.openDB()

    const physicalFiles = new Set() // 物理文件集合(存储处理后的cleanName)
    const filesToRemove = []      // 待删除文件
    const appsToRegister = []     // 待注册的僵尸应用数据

    // 扫描物理文件
    for await (const entry of kernel.dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith(SUKIN_EXT)) {
        // 处理文件名，提取 cleanName 用于逻辑比对
        const cleanName = entry.name.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '');
        physicalFiles.add(cleanName);

        // 检查是否已注册 (比对处理后的名称)
        const isRegistered = Array.from(kernel.userApps.values())
          .some(app => app?.[ENV_KEY_NAME] === cleanName)

        if (isRegistered) {
          // 更新已注册应用的句柄
          const appEntry = Array.from(kernel.userApps.entries())
            .find(([, app]) => app?.[ENV_KEY_NAME] === cleanName)
          if (appEntry) {
            const [, appSys] = appEntry
            appSys.handle = entry
          }
        } else {
          // 处理未注册文件（僵尸文件）
          const inspectionResult = await kernel.inspectZombieFile(entry)
          if (inspectionResult.isValidZombie && inspectionResult.appSys) {
            appsToRegister.push(inspectionResult.appSys)
          } else if (inspectionResult.shouldRemove) {
            filesToRemove.push(entry)
          }
        }
      }
    }

    // 注册有效的僵尸文件 (使用队列异步处理,由于是入队不在此 await 所以安全无死锁)
    for (const appSys of appsToRegister) {
      kernel.executeInstallation({ mode: 'ZOMBIE_REGISTER', data: appSys });
    }

    // 清理孤儿记录
    for (const app of kernel.userApps.values()) {
      const currentAppName = app?.[ENV_KEY_NAME];
      // 比对处理后的名称，如果物理目录中不存在对应的 cleanName，则视为孤儿
      if (!physicalFiles.has(currentAppName)) {
        console.warn(`[内核] 清理孤儿用户注册表记录文件: ${currentAppName}`)
        kernel.kill(app.pid)
        // kernel.stateCache.delete(app.pid)
        // kernel.userApps.delete(app.pid)
        //这个不删除是因为,可能当前是不同步本地的通过indexDb已经注册了不能删除
        // await kernel.sysDb.deleteData(currentAppName)
        app.handle = null
      }
    }
    //  删除无效文件
    if (filesToRemove.length > 0) {
      console.info(`[内核] 开始清理 ${filesToRemove.length} 个无效文件...`)
      for (const fileHandle of filesToRemove) {
        try {
          await fileHandle.remove()
          console.info(`[内核] 已删除无效文件: ${fileHandle.name}`)
        } catch (deleteError) {
          console.error(`[内核错误] 删除文件 ${fileHandle.name} 时失败:`, deleteError)
        }
      }
    }
    // kernel.emitChange()
  } catch (e) {
    console.error("[内核] syncRegistry 过程中发生错误:", e)
  }
}

/**
 * 通过资源(Res)同步注册表(Sys)
 * 逻辑：遍历已加载到内存的 resourceCache，如果发现资源没有对应的 App 注册表记录，
 * 则自动为其生成注册表信息，并更新到缓存和 sysDb 中。同时清理掉没有资源对应的孤儿注册表。
 */
export async function extSyncRegistryByRes(kernel) {
  try {
    // 确保数据库已打开
    if (!kernel.sysDb.isOpen()) await kernel.sysDb.openDB();
    if (!kernel.resDb.isOpen()) await kernel.resDb.openDB();

    const appsToRegister = [];
    const validResIds = new Set(); // 记录当前所有有效的资源ID
    // 扫描资源库，寻找未注册的资源
    for (const res of Object.values(kernel.resourceCache)) {
      const resId = res?.[ENV_KEY_RESOURCE_ID];
      const appName = res?.[ENV_KEY_NAME];
      if (!resId || !appName) continue;
      validResIds.add(resId);
      // 跳过系统预置资源 (因为系统资源在 #initializeSystemApps 已经处理)
      if (kernel.presetResourceIds.has(resId)) continue;
      // 检查内存中是否已经有这个资源的注册信息
      const existingPid = kernel.getPidByResourceId(resId);
      const isRegistered = existingPid && kernel.userApps.has(existingPid);
      if (!isRegistered) {
        // 发现未注册的资源，准备构建 App 注册数据
        const appSys = {
          pid: crypto.randomUUID(),
          [ENV_KEY_RESOURCE_ID]: resId,
          [ENV_KEY_NAME]: appName,
          handle: null, // 默认无本地文件句柄
          savedState: null,
          status: 'INSTALLED',
          [ENV_KEY_META_INFO]: res?.[ENV_KEY_META_INFO] || {}
        };
        // 如果该资源配置了同步本地文件 (syncLocal)，尝试关联本地句柄
        if (appSys[ENV_KEY_META_INFO]?.syncLocal && kernel.dirHandle) {
          const fileName = `${SUKIN_PRE}${appName}${SUKIN_EXT}`;
          try {
            appSys.handle = await kernel.dirHandle.getFileHandle(fileName);
          } catch (e) {
            // 如果本地文件不存在，且配置了 syncLocal，可以选择顺手把资源写入本地
            console.info(`[内核] 资源 ${appName} 配置了 syncLocal，正在自动写入本地...`);
            await kernel.writeAppFile(res);
            try {
              appSys.handle = await kernel.dirHandle.getFileHandle(fileName);
            } catch (innerErr) {
              console.warn(`[内核] 自动写入本地文件失败: ${appName}`);
            }
          }
        }
        appsToRegister.push(appSys);
      } else {
        // 如果应用已注册，则合并元数据，而不是直接覆盖，以保留用户自定义设置
        const appInfo = kernel.userApps.get(existingPid);
        if (appInfo) {
          const resourceMeta = res[ENV_KEY_META_INFO] || {};
          const currentAppMeta = appInfo[ENV_KEY_META_INFO] || {};

          const finalMeta = {
            ...resourceMeta,
            ...currentAppMeta,
            custom: {
              ...(resourceMeta.custom || {}),
              ...(currentAppMeta.custom || {})
            }
          };

          // 将合并后的元数据更新到内存和数据库
          appInfo[ENV_KEY_META_INFO] = finalMeta;
          // 异步更新，不阻塞主流程
          kernel.sysDb.updateData(appName, { [ENV_KEY_META_INFO]: finalMeta });
        }
      }
    }
    // 批量注册发现的新资源 (复用底层的队列安装机制，安全可靠)
    if (appsToRegister.length > 0) {
      console.info(`[内核] 根据资源库扫描，发现 ${appsToRegister.length} 个未注册应用，准备注册...`);
      for (const appSys of appsToRegister) {
        // 使用 ZOMBIE_REGISTER 模式（它不仅处理僵尸文件，实际上就是标准的直接写库+写缓存行为）
        kernel.executeInstallation({ mode: 'ZOMBIE_REGISTER', data: appSys });
      }
    }
    // 清理孤儿注册表 (Sys 里面有记录，但是 Res 里面已经找不到资源了)
    const orphansToClean = [];
    for (const app of kernel.userApps.values()) {
      const currentResId = app?.[ENV_KEY_RESOURCE_ID];
      if (!validResIds.has(currentResId)) {
        orphansToClean.push(app);
      }
    }
    for (const orphan of orphansToClean) {
      console.warn(`[内核] 清理无底层资源的孤儿注册表记录: ${orphan?.[ENV_KEY_NAME]}`);
      // 杀死可能在运行的进程
      kernel.kill(orphan.pid);
      // 清除内存缓存
      kernel.stateCache.delete(orphan.pid);
      kernel.userApps.delete(orphan.pid);
      kernel.resourceIdToPid.delete(orphan[ENV_KEY_RESOURCE_ID]);
      kernel.pidToResourceId.delete(orphan.pid);
      // 删除数据库记录
      await kernel.sysDb.deleteData(orphan[ENV_KEY_NAME]);
    }
    if (appsToRegister.length > 0 || orphansToClean.length > 0) {
      kernel.emitChange();
    }
  } catch (e) {
    console.error("[内核] syncRegistryByRes 过程中发生错误:", e);
  }
}

// 更新App
export async function extUpdateApp(kernel, { worker, version }) {
  const resource = parseWorkerCode(worker)
  const cleanName = resource?.[ENV_KEY_NAME];
  const resId = resource?.[ENV_KEY_RESOURCE_ID];

  // 查询并终止正在运行的该应用
  let pid = kernel.getPidByResourceId(resId);
  if (pid && kernel.processes.has(pid)) {
    kernel.kill(pid)
    console.info(`[内核] 更新前已终止运行中的应用: ${cleanName} (PID: ${pid})`)
  }

  // 利用抽离出来的安装核心，直接完成 resDb 和 sysDb 的覆写更新，代码高度精简
  // extInstallResource 内部已包含保留用户配置的合并逻辑
  await extInstallResource(kernel, { ...resource, version });

  console.info(`[内核] 应用已更新: ${cleanName} -> v${version}`)
  kernel.emitChange()
}


// 删除非系统内置App
export async function extDeleteApp(kernel, { pid, resourceId }) {
  let truthPid
  if (!pid) {
    //那么这里实际是pid就是resurceId了,这里为了兼容,处理一下不再过多修改
    truthPid = kernel.getPidByResourceId(resourceId)
  } else {
    truthPid = pid
    // 如果调用方没传 resourceId，则通过 pid 获取
    if (!resourceId) {
      resourceId = kernel.getResourceIdByPid(pid)
    }
  }
  //如果还是没拿到 resourceId，从已安装的应用缓存中查找
  if (!resourceId && truthPid) {
    const appCache = kernel.userApps.get(truthPid);
    resourceId = appCache?.[ENV_KEY_RESOURCE_ID];
  }
  try {
    //因为我们的架构是在分配注册表的时候就注入这个pid
    // 增加判断防止 resourceId 为空时进入 has 判断
    if (resourceId && kernel.presetResourceIds.has(resourceId)) {
      alert.warning("系统预置资源不可删除")
      return
    }
    const app = await kernel.getApp(truthPid)
    if (!app) {
      throw new Error("找不到应用实例");
    }
    const currentAppName = app?.[ENV_KEY_NAME];
    const sys = await kernel.sysDb.getData(currentAppName)  //获取文件句柄
    if (sys && sys.handle) {
      const handle = sys.handle
      await handle.remove()  //删除本地文件
    }
    if (app.status !== "INSTALLED") {
      await kernel.forceKillProcess(truthPid)    //先杀死App,注意,有状态更新,所以注意顺序,避免被重新注册
    }
    kernel.userApps.delete(truthPid)        //删除缓存注册表
    kernel.pidToResourceId.delete(truthPid) //删除辅助转义表
    if (resourceId) {
      kernel.resourceIdToPid.delete(resourceId) //删除辅助转义表
      await kernel.resDb.deleteData(resourceId)    //删除资源[indexDb]
      delete kernel.resourceCache[resourceId];      //删除资源缓存
      clearSandboxStorageByPid(pid) //删除indexDb,和storage
    }
    await kernel.sysDb.deleteData(currentAppName)    //删除应用注册表[indexDb]
    kernel.emitChange()
  }
  catch (err) {
    console.log(err)
    alert.failure(`删除失败: ${err.message || "未知错误"}`)
  }
}
