import { SUKIN_EXT ,SUKIN_PRE,TRUTH_ALL_APP} from '@/sukinos/utils/config'
import {PRESET_RESOURCES} from '@/sukinos/resources/preset_resources'
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_LOGIC_PRECOMPILED,
  ENV_KEY_CONTENT,
  ENV_KEY_CONTENT_PRECOMPILED,
  ENV_KEY_META_INFO
} from '@/sukinos/utils/config'
import { clearAppSandboxData } from '@/sukinos/utils/process/kernelParts/lifecycle'
import { generateWorker, parseWorkerCode } from './generateWorker'
import { compileSource, detectSourceFormat, isCodeKey, isHtmlKey, resolveAppEntries } from './sourceMapper'
import { alert } from "@/component/alert/layout"
import { sukinOs as sukinApi } from "@/apis/main"
import generateShortSeed from '/utils/js/rootSeed'
import {clearSandboxStorageByPid} from '@/sukinos/utils/security'
export async function extRegisterAppSys(kernel, appSys) {
  kernel.updateUserAppInfo(appSys.pid, appSys);
  kernel.resourceIdToPid.set(appSys?.[ENV_KEY_RESOURCE_ID], appSys.pid);
  kernel.pidToResourceId.set(appSys.pid, appSys?.[ENV_KEY_RESOURCE_ID]);
  await kernel.sysDb.putData(appSys);
}

export async function extInspectZombieFile(kernel, fileHandle) {
  const result = {
    isValidZombie: false,
    shouldRemove: false,
    appSys: null
  }
  try {
    const file = await fileHandle.getFile()
    const text = await file.text()
    const cleanName = fileHandle.name.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '')
    const match = text.match(/const\s+SYS_CONFIG\s*=\s*({[\s\S]*?})\s*;?\s*\n/);
    if (!match || !match[1]) {
      result.shouldRemove = true
      console.warn(`[内核] 发现僵尸文件 ${fileHandle.name}，无法解析资源ID`)
      return result
    }

    // SYS_CONFIG 里的键是环境变量常量名，只能用 Function 求值才能还原出来
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

    const existingResource = kernel.getResource(resourceId)
    if (existingResource && !kernel.presetResourceIds.has(resourceId)) {
      result.isValidZombie = true
      result.appSys = {
        pid: crypto.randomUUID(),
        [ENV_KEY_RESOURCE_ID]: resourceId,
        [ENV_KEY_NAME]: cleanName,
        handle: fileHandle,
        savedState: null,
        status: 'INSTALLED',
        [ENV_KEY_META_INFO]: { ...existingResource?.[ENV_KEY_META_INFO], [ENV_KEY_NAME]: existingResource?.[ENV_KEY_NAME] }
      }
      return result
    }

    if (TRUTH_ALL_APP) {
      // 扫到了 worker 但资源未注册：按 TRUTH_ALL_APP 的口径自动注册
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
      result.shouldRemove = true
      console.warn(`[内核] 发现无效文件 ${fileHandle.name}，资源ID: ${resourceId}`)
    }
  } catch (e) {
    console.error(`[内核] 检查文件 ${fileHandle.name} 时失败:`, e)
    result.shouldRemove = true
  }

  return result
}

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

export async function extUpdateCloud(kernel, data) {
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
    if (uploadInfo?.isPrivate !== undefined) formData.append('isPrivate', uploadInfo.isPrivate);
    formData.append('metaInfo', JSON.stringify(resource?.[ENV_KEY_META_INFO]))
    const response = await sukinApi.app.updateApp({url:storePath?.updateUrl,formData})
    if (response.code === 200) {
      return response.data
    } else {
      alert.failure(response.message)
    }
  } catch (error) {
    console.error('网络请求错误:', error)
  }
}

/**
 * 预编译资源内容（双份存储）：原始源码编成 JS 产物存进 ENV_KEY_CONTENT_PRECOMPILED，
 * 主逻辑块单独进 ENV_KEY_LOGIC_PRECOMPILED。幂等：已有产物则跳过。
 * 失败只告警并记进 metaInfo.precompileIssues，保留原文供运行时 Babel 兜底。newRes 原地修改。
 */
async function precompileResourceContent(newRes, kernel) {
  const resourceId = newRes?.[ENV_KEY_RESOURCE_ID]
  const content = newRes?.[ENV_KEY_CONTENT]
  // 系统 APP 走运行时 Babel，不预编译
  if (kernel?.presetResourceIds?.has(resourceId)) return
  // 文档包载荷是原文，再 Babel 一遍没意义，还会把已压缩的 chunk 记进 precompileIssues
  if (isHtmlKey(resolveAppEntries(newRes?.[ENV_KEY_META_INFO]).view)) return

  const failedKeys = []
  const compileOne = async (code, key) => {
    // 只有代码档需要预编译：CSS 走 createCssModule、HTML 走子文档合成，文本档不是代码
    if (!isCodeKey(key, code)) return null
    try {
      return await compileSource(code, { filename: key })
    } catch (e) {
      failedKeys.push(key)
      console.warn(`[预编译] 资源 ${resourceId} 模块 ${key} 编译失败，降级为运行时 Babel 编译:`, e?.message)
      return null
    }
  }

  const recordIssues = () => {
    // 以本轮结果为准：全通过就擦掉云端带来的上一版失败戳，否则会一直传播给后续用户并误导报错指认
    const meta = newRes[ENV_KEY_META_INFO]
    if (!failedKeys.length) {
      delete meta.precompileIssues
      return
    }
    meta.precompileIssues = { reason: 'failed', keys: failedKeys }
  }

  // 一轮都没尝试编译（产物齐全）时不动 precompileIssues，免得无声擦掉别处留下的失败指认
  let attempted = false

  if (newRes?.[ENV_KEY_CONTENT_PRECOMPILED] == null && content != null) {
    attempted = true
    if (typeof content === 'string') {
      const compiled = await compileOne(content, 'main.jsx')
      if (compiled != null) {
        newRes[ENV_KEY_CONTENT_PRECOMPILED] = compiled
      }
    } else if (content && typeof content === 'object') {
      const compiledMap = {}
      let anySuccess = false
      for (const [key, code] of Object.entries(content)) {
        if (typeof code !== 'string') continue
        const compiled = await compileOne(code, key)
        if (compiled != null) {
          compiledMap[key] = compiled
          anySuccess = true
        }
      }
      if (anySuccess) {
        newRes[ENV_KEY_CONTENT_PRECOMPILED] = compiledMap
      }
    }
  }

  // 主逻辑块：产物供 worker 执行，原文留在 ENV_KEY_LOGIC 供编辑器与反解；未预编译的应用保持原文注入
  const logicCode = newRes?.[ENV_KEY_LOGIC]
  if (typeof logicCode === 'string' && logicCode && newRes?.[ENV_KEY_LOGIC_PRECOMPILED] == null) {
    attempted = true
    const logicMainKey = newRes[ENV_KEY_META_INFO]?.entries?.logicMain || 'logic'
    const compiledLogic = await compileOne(logicCode, `${logicMainKey}.jsx`)
    if (compiledLogic != null) {
      newRes[ENV_KEY_LOGIC_PRECOMPILED] = compiledLogic
    }
  }

  if (attempted) recordIssues()
}

// 安装核心：不走 executeInstallation 排队，避免自己排自己的队造成嵌套死锁
export async function extInstallResource(kernel, args) {
  const name = args?.[ENV_KEY_NAME] || args?.name;
  const resourceId = args?.[ENV_KEY_RESOURCE_ID] || args?.resourceId;
  const version = args?.version || 0.1;
  const isBundle = args?.[ENV_KEY_IS_BUNDLE] || args?.isBundle;
  const content = args?.[ENV_KEY_CONTENT] || args?.content;
  const logic = args?.[ENV_KEY_LOGIC] || args?.logic;
  const metaInfo = args?.[ENV_KEY_META_INFO] || args?.metaInfo || {};

  const truthResourceId = resourceId || `app-${metaInfo?.authorId || 'local'}-${generateShortSeed()}`;

  const newRes = {
    [ENV_KEY_RESOURCE_ID]: truthResourceId,
    [ENV_KEY_NAME]: name,
    [ENV_KEY_IS_BUNDLE]: isBundle,
    [ENV_KEY_CONTENT]: content,
    [ENV_KEY_LOGIC]: logic,
    [ENV_KEY_META_INFO]: {
      ...metaInfo,
      createdAt: metaInfo.createdAt || new Date().toISOString(), // 云端资源带服务器时间，只有本地装才现算
      initialSize: {
        w: Math.max(500, metaInfo?.initialSize?.w || 500), h: Math.max(400, metaInfo?.initialSize?.h || 400),
      },
      [ENV_KEY_NAME]: name,
      version: version
    }
  };
  await precompileResourceContent(newRes, kernel)
  await kernel.resDb.putData(newRes)
  kernel.resourceCache[truthResourceId] = newRes;

  let appSys;
  const existingPid = kernel.getPidByResourceId(truthResourceId);
  if (existingPid && kernel.userApps.has(existingPid)) {
    // 更新场景：合并元数据而不是覆盖，保留用户自定义配置
    appSys = kernel.userApps.get(existingPid);
    const currentAppMeta = appSys[ENV_KEY_META_INFO] || {};
    const newResourceMeta = newRes[ENV_KEY_META_INFO] || {};

    // 先铺开旧配置再覆盖新资源元属性（如新 version），custom 里用户侧胜出
    appSys[ENV_KEY_META_INFO] = {
      ...currentAppMeta,
      ...newResourceMeta,
      custom: {
        ...(newResourceMeta.custom || {}),
        ...(currentAppMeta.custom || {})
      }
    };
    appSys[ENV_KEY_NAME] = name;
  } else {
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
    await kernel.writeAppFile({ ...newRes, [ENV_KEY_CONTENT]: content })
    // 回关联本地句柄，装完即可直接访问文件
    try {
      const fileName = `${SUKIN_PRE}${name}${SUKIN_EXT}`
      appSys.handle = await kernel.dirHandle.getFileHandle(fileName)
    } catch (e) {
      console.warn(`[内核] 获取本地文件句柄失败: ${name}`)
    }
  }

  await extRegisterAppSys(kernel, appSys);
  return truthResourceId
}

// 安装/注册统一入队，避免并发写注册表
export async function extExecuteInstallation(kernel, params) {
  return new Promise((resolve, reject) => {
    kernel.enqueueInstallTask(async () => {
      try {
        const { mode, data } = params;
        if (mode === 'ZOMBIE_REGISTER') {
          await extRegisterAppSys(kernel, data);
        } else if (mode === 'INSTALL_APP') {
          // 不套内层 try：错误由外层统一 reject
          const resource = parseWorkerCode(data.worker);
          await extInstallResource(kernel, { ...resource, version: data.version });
        }
        kernel.emitChange({ type: 'APP_REGISTRY' });
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  });
}

export async function extSyncResourcesToFiles(kernel) {
  if (!kernel.dirHandle) return
  for (const res of Object.values(kernel.resourceCache)) {
    if (!kernel.presetResourceIds.has(res?.[ENV_KEY_RESOURCE_ID]) &&
      res[ENV_KEY_META_INFO]?.syncLocal || false) {
      // 只有开了 syncLocal 才写盘；不影响扫描侧照常安装本地 app
      const fileName = `${SUKIN_PRE}${res?.[ENV_KEY_NAME]}${SUKIN_EXT}`
      try { await kernel.dirHandle.getFileHandle(fileName) }
      catch (e) { await kernel.writeAppFile(res) }
    }
  }
}

export async function extWriteAppFile(kernel, res) {
  if (kernel.presetResourceIds.has(res?.[ENV_KEY_RESOURCE_ID])) return
  const fileName = `${SUKIN_PRE}${res?.[ENV_KEY_NAME]}${SUKIN_EXT}`
  const handle = await kernel.dirHandle.getFileHandle(fileName, { create: true })
  const writable = await handle.createWritable()
  const code = generateWorker(res)
  await writable.write(code)
  await writable.close()
}

export async function extUploadResource(kernel, args) {
  const metaInfo = args?.[ENV_KEY_META_INFO] || args?.metaInfo || {};
  const sysOptions = args?.sysOptions || {};
  const shouldUpload = sysOptions.shouldUpload || false;

  if (!import.meta.env.DEV && !metaInfo?.authorId) {
    const errorMsg = '操作失败：请先登录！'
    alert.warning(errorMsg)
    return Promise.reject(new Error(errorMsg))
  }

  const truthResourceId = await extInstallResource(kernel, args);

  kernel.emitChange({ type: 'APP_REGISTRY' })
  if (shouldUpload) {
    // 上云不 await：不阻塞安装返回
    const newRes = kernel.resourceCache[truthResourceId];
    kernel.uploadCloud({ resource: newRes, sysOptions })
  }
  return truthResourceId
}

// 按本地文件系统对齐 SYS 注册表：只管注册行为，不动资源库
export async function extSyncRegistry(kernel) {
  if (!kernel.dirHandle) return
  try {
    if (!kernel.sysDb.isOpen()) await kernel.sysDb.openDB()

    const physicalFiles = new Set() // 存处理后的 cleanName，后面的比对都以它为准
    const filesToRemove = []
    const appsToRegister = []

    for await (const entry of kernel.dirHandle.values()) {
      if (entry.kind === 'file' && entry.name.endsWith(SUKIN_EXT)) {
        const cleanName = entry.name.replace(SUKIN_EXT, '').replace(SUKIN_PRE, '');
        physicalFiles.add(cleanName);

        const isRegistered = Array.from(kernel.userApps.values())
          .some(app => app?.[ENV_KEY_NAME] === cleanName)

        if (isRegistered) {
          const appEntry = Array.from(kernel.userApps.entries())
            .find(([, app]) => app?.[ENV_KEY_NAME] === cleanName)
          if (appEntry) {
            const [, appSys] = appEntry
            appSys.handle = entry
          }
        } else {
          const inspectionResult = await kernel.inspectZombieFile(entry)
          if (inspectionResult.isValidZombie && inspectionResult.appSys) {
            appsToRegister.push(inspectionResult.appSys)
          } else if (inspectionResult.shouldRemove) {
            filesToRemove.push(entry)
          }
        }
      }
    }

    // 入队注册、不在此 await：与队列互等会成死锁
    for (const appSys of appsToRegister) {
      kernel.executeInstallation({ mode: 'ZOMBIE_REGISTER', data: appSys });
    }

    for (const app of kernel.userApps.values()) {
      const currentAppName = app?.[ENV_KEY_NAME];
      // 孤儿 = 物理目录里已无对应 cleanName 的记录
      if (!physicalFiles.has(currentAppName)) {
        kernel.kill(app.pid)
        // 故意不删 sysDb 记录：不同步本地的应用靠 indexDb 注册，删了就丢注册态
        app.handle = null
      }
    }
    if (filesToRemove.length > 0) {
      for (const fileHandle of filesToRemove) {
        try {
          await fileHandle.remove()
          console.info(`[内核] 已删除无效文件: ${fileHandle.name}`)
        } catch (deleteError) {
          console.error(`[内核错误] 删除文件 ${fileHandle.name} 时失败:`, deleteError)
        }
      }
    }
  } catch (e) {
    console.error("[内核] syncRegistry 过程中发生错误:", e)
  }
}

/** 以资源库(Res)为准对齐注册表(Sys)：补注册缺记录的资源，清掉无资源对应的孤儿注册表 */
export async function extSyncRegistryByRes(kernel) {
  try {
    if (!kernel.sysDb.isOpen()) await kernel.sysDb.openDB();
    if (!kernel.resDb.isOpen()) await kernel.resDb.openDB();

    const appsToRegister = [];
    const validResIds = new Set();
    // 系统资源永不注册为用户 APP，避免生成随机 pid 的"幽灵"系统 APP
    const presetResIds = new Set(PRESET_RESOURCES.map(p => p?.[ENV_KEY_RESOURCE_ID]));
    for (const res of Object.values(kernel.resourceCache)) {
      const resId = res?.[ENV_KEY_RESOURCE_ID];
      const appName = res?.[ENV_KEY_NAME];
      if (!resId || !appName) continue;
      validResIds.add(resId);
      if (kernel.presetResourceIds.has(resId)) continue;
      // 系统预置资源一律跳过，并清掉历史遗留的随机 pid 记录，保证系统 APP 只有唯一 pid(= resourceId)
      if (presetResIds.has(resId)) {
        const ghostPid = kernel.getPidByResourceId(resId);
        if (ghostPid && kernel.userApps.has(ghostPid)) {
          const ghostApp = kernel.userApps.get(ghostPid);
          kernel.kill(ghostPid);
          kernel.clearCachedState(ghostPid);
          kernel.userApps.delete(ghostPid);
          kernel.pidToResourceId.delete(ghostPid);
          kernel.resourceIdToPid.delete(resId);
          await kernel.sysDb.deleteData(ghostApp?.[ENV_KEY_NAME] || appName);
        }
        continue;
      }
      const existingPid = kernel.getPidByResourceId(resId);
      const isRegistered = existingPid && kernel.userApps.has(existingPid);
      if (!isRegistered) {
        const appSys = {
          pid: crypto.randomUUID(),
          [ENV_KEY_RESOURCE_ID]: resId,
          [ENV_KEY_NAME]: appName,
          handle: null,
          savedState: null,
          status: 'INSTALLED',
          [ENV_KEY_META_INFO]: res?.[ENV_KEY_META_INFO] || {}
        };
        // 配了 syncLocal 才去关联本地句柄
        if (appSys[ENV_KEY_META_INFO]?.syncLocal && kernel.dirHandle) {
          const fileName = `${SUKIN_PRE}${appName}${SUKIN_EXT}`;
          try {
            appSys.handle = await kernel.dirHandle.getFileHandle(fileName);
          } catch (e) {
            // 本地缺文件就顺手写一份，再取句柄
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
        const appInfo = kernel.userApps.get(existingPid);
        if (appInfo) {
          const resourceMeta = res[ENV_KEY_META_INFO] || {};
          const currentAppMeta = appInfo[ENV_KEY_META_INFO] || {};

          // 先铺开旧配置，再用最新资源的元属性覆盖，避免版本号无法同步
          const finalMeta = {
            ...currentAppMeta,
            ...resourceMeta,
            custom: {
              ...(resourceMeta.custom || {}),
              ...(currentAppMeta.custom || {})
            }
          };

          appInfo[ENV_KEY_META_INFO] = finalMeta;
          // 不 await：落库不阻塞本轮同步
          kernel.sysDb.updateData(appName, { [ENV_KEY_META_INFO]: finalMeta });
        }
      }
    }
    // 复用队列安装机制；ZOMBIE_REGISTER 实际就是「直接写库 + 写缓存」，不只处理僵尸文件
    if (appsToRegister.length > 0) {
      console.info(`[内核] 根据资源库扫描，发现 ${appsToRegister.length} 个未注册应用，准备注册...`);
      for (const appSys of appsToRegister) {
        kernel.executeInstallation({ mode: 'ZOMBIE_REGISTER', data: appSys });
      }
    }
    // 孤儿注册表 = Sys 里有记录、Res 里已找不到资源
    const orphansToClean = [];
    for (const app of kernel.userApps.values()) {
      const currentResId = app?.[ENV_KEY_RESOURCE_ID];
      if (!validResIds.has(currentResId)) {
        orphansToClean.push(app);
      }
    }
    for (const orphan of orphansToClean) {
      kernel.kill(orphan.pid);
      kernel.clearCachedState(orphan.pid);
      kernel.userApps.delete(orphan.pid);
      kernel.resourceIdToPid.delete(orphan[ENV_KEY_RESOURCE_ID]);
      kernel.pidToResourceId.delete(orphan.pid);
      await kernel.sysDb.deleteData(orphan[ENV_KEY_NAME]);
    }
    if (appsToRegister.length > 0 || orphansToClean.length > 0) {
      kernel.emitChange({ type: 'APP_REGISTRY' });
    }
  } catch (e) {
    console.error("[内核] syncRegistryByRes 过程中发生错误:", e);
  }
}

export async function extUpdateApp(kernel, { worker, version }) {
  const resource = parseWorkerCode(worker)
  const cleanName = resource?.[ENV_KEY_NAME];
  const resId = resource?.[ENV_KEY_RESOURCE_ID];

  let pid = kernel.getPidByResourceId(resId);
  if (pid && kernel.processes.has(pid)) {
    kernel.kill(pid)
    console.info(`[内核] 更新前已终止运行中的应用: ${cleanName} (PID: ${pid})`)
  }

  await extInstallResource(kernel, { ...resource, version });

  console.info(`[内核] 应用已更新: ${cleanName} -> v${version}`)
  kernel.emitChange({ type: 'APP_REGISTRY' })
}


// 删除用户 App（系统预置资源不可删）
export async function extDeleteApp(kernel, { pid, resourceId }) {
  let truthPid
  if (!pid) {
    // 兼容：调用方只给 resourceId 时按它反查 pid
    truthPid = kernel.getPidByResourceId(resourceId)
  } else {
    truthPid = pid
    if (!resourceId) {
      resourceId = kernel.getResourceIdByPid(pid)
    }
  }
  if (!resourceId && truthPid) {
    const appCache = kernel.userApps.get(truthPid);
    resourceId = appCache?.[ENV_KEY_RESOURCE_ID];
  }
  try {
    if (resourceId && kernel.presetResourceIds.has(resourceId)) {
      alert.warning("系统预置资源不可删除")
      return
    }
    const app = await kernel.getApp(truthPid)
    clearAppSandboxData(app) // 清掉应用的 storage / indexDb 残留，避免占空间与后续冲突
    if (!app) {
      throw new Error("找不到应用实例");
    }
    const currentAppName = app?.[ENV_KEY_NAME];
    const sys = await kernel.sysDb.getData(currentAppName)
    if (sys && sys.handle) {
      const handle = sys.handle
      await handle.remove()
    }
    if (app.status !== "INSTALLED") {
      await kernel.forceKillProcess(truthPid)    // 先杀进程：它会更新状态并可能重新注册，顺序不能换
    }
    kernel.userApps.delete(truthPid)
    kernel.pidToResourceId.delete(truthPid)
    if (resourceId) {
      kernel.resourceIdToPid.delete(resourceId)
      await kernel.resDb.deleteData(resourceId)
      delete kernel.resourceCache[resourceId];
      clearSandboxStorageByPid(pid)
    }
    await kernel.sysDb.deleteData(currentAppName)
    kernel.emitChange({ type: 'APP_REGISTRY' })
  }
  catch (err) {
    console.log(err)
    alert.failure(`删除失败: ${err.message || "未知错误"}`)
  }
}
