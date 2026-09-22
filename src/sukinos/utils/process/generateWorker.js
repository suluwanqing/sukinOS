import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_LOGIC_PRECOMPILED,
  ENV_KEY_CONTENT,
  ENV_KEY_CONTENT_PRECOMPILED,
  ENV_KEY_META_INFO,
} from '@/sukinos/utils/config'
import {
  getWorkerSandboxPreamble,
  createStorageProxy,
  createIndexedDBProxy,
  createSecureFetch,
} from '@/sukinos/utils/security'
import {
  RUNNER_SANDBOX_PRIVILEGES,
  getRunnerWorkerDispatcher,
  getRunnerMessageRouter,
  getWorkerLogicModuleRuntime,
} from './workerDrive'

/**
 * 内部辅助：生成唯一且复杂的区块标记位
 */
const getMarkers = key => ({
  start: `/* <<<SUKIN_OS_${key}_BLOCK_START_V2>>> */`,
  end: `/* <<<SUKIN_OS_${key}_BLOCK_END_V2>>> */`,
})

/**
 * 内部辅助：精准截取标记位之间的内容
 * 不使用正则表达式，直接通过字符串索引查找，性能最优且最安全
 */
const extractByMarkers = (source, key) => {
  const {start, end} = getMarkers(key)
  const sIdx = source.indexOf(start)
  const eIdx = source.indexOf(end)
  if (sIdx !== -1 && eIdx !== -1) {
    return source.substring(sIdx + start.length, eIdx).trim()
  }
  return null
}

/**
 * 用户未提供 logic 时的兜底逻辑（恒等 reducer）。
 * parseWorkerCode 通过比对 USER_LOGIC 块内容是否等于该常量来判断"无用户逻辑"。
 */
const FALLBACK_LOGIC = `const initialState = {}; function reducer(s) { return s; }`

/**
 * 生成 Worker 代码
 */
export const generateWorker = args => {
  const resId = args?.[ENV_KEY_RESOURCE_ID]
  const name = args?.[ENV_KEY_NAME]
  const isBundle = args?.[ENV_KEY_IS_BUNDLE]
  const userLogicCode = args?.[ENV_KEY_LOGIC]
  const precompiledLogic = args?.[ENV_KEY_LOGIC_PRECOMPILED]
  const content = args?.[ENV_KEY_CONTENT]
  const precompiledContent = args?.[ENV_KEY_CONTENT_PRECOMPILED]
  const metaInfo = args?.[ENV_KEY_META_INFO]

  // 执行态优先取预编译产物（import 已转成注入的 require）；未预编译的存量应用与系统 APP 落回原文。
  // 两种写法的 initialState / reducer / init 都是本块作用域的顶层绑定，内核按名字取用不受影响。
  const safeLogic = precompiledLogic || userLogicCode || FALLBACK_LOGIC
  // 原文单独存一份供反解（更新面板编辑器、写回本地盘）。以 JSON 字符串落地而不是裸代码：
  // 主块里的 import 在 classic worker 里本身就是语法错误，裸写会把整份 worker 带崩。
  const logicSource = userLogicCode && userLogicCode !== safeLogic ? userLogicCode : null

  // 逻辑模块运行时始终挂载：不调用 require 时它是惰性的，
  // 而按需注入会让"忘了把模块写进入口约定"变成 worker 静默死机
  const logicModuleRuntime = getWorkerLogicModuleRuntime(metaInfo?.entries?.logicMain || 'logic')

  // 将 SDK 中的代理逻辑函数源码提取出来 (包含 fetch)
  const storageProxySource = createStorageProxy.toString()
  const indexedDBProxySource = createIndexedDBProxy.toString()
  const secureFetchSource = createSecureFetch.toString()

  // 精细标记位，用于物理隔离数据块
  const mSys = getMarkers('SYS_CONFIG')
  const mMeta = getMarkers('APP_METAINFO')
  const mComp = getMarkers('ORIGIN_COMPONENT')
  const mPrecompiled = getMarkers('PRECOMPILED_COMPONENT')
  const mLogic = getMarkers('USER_LOGIC')
  const mLogicSource = getMarkers('LOGIC_SOURCE')

  const sysConfigObj = {
    [ENV_KEY_RESOURCE_ID]: resId,
    [ENV_KEY_NAME]: name,
    [ENV_KEY_IS_BUNDLE]: isBundle,
  }

  return `
// 调用 security 模块提供的 Preamble 接口
${getWorkerSandboxPreamble(resId, storageProxySource, indexedDBProxySource, secureFetchSource)}

/* --- 进入 Worker 沙箱块级作用域 --- */
{
  const window = _safeGlobalProxy;
  const self = _safeGlobalProxy;
  const globalThis = _safeGlobalProxy;

${RUNNER_SANDBOX_PRIVILEGES}

  /* 系统配置核心块 */
  const SYS_CONFIG = ${mSys.start}${JSON.stringify(sysConfigObj)}${mSys.end};

  /* 应用元数据块 */
  const APP_METAINFO = ${mMeta.start}${JSON.stringify(metaInfo)}${mMeta.end};

${getRunnerWorkerDispatcher(ENV_KEY_IS_BUNDLE)}

${getRunnerMessageRouter(ENV_KEY_IS_BUNDLE)}

  // 注入原始组件资源块
  const ORIGIN_COMPONENT = ${mComp.start}${JSON.stringify(content)}${mComp.end};

  // 注入预编译组件资源块（双份存储：原始 JSX + 预编译 JS）
  const PRECOMPILED_COMPONENT = ${mPrecompiled.start}${JSON.stringify(precompiledContent ?? null)}${mPrecompiled.end};

  Object.freeze(SYS_CONFIG);
  Object.freeze(broadcast);
  Object.freeze(save);
  Object.freeze(ORIGIN_COMPONENT);
  Object.freeze(PRECOMPILED_COMPONENT);
  Object.freeze(dispatch);

${logicModuleRuntime}
  /* 用户逻辑逻辑块 */
  ${mLogic.start}
  ${safeLogic}
  ${mLogic.end}
${logicSource ? `
  // 主逻辑块原始源码（不执行，仅供 parseWorkerCode 反解回编辑器/本地盘）
  const __LOGIC_SOURCE = ${mLogicSource.start}${JSON.stringify(logicSource)}${mLogicSource.end};` : ''}
}
`
}

/**
 * 从生成的 Worker 代码中反解析出用户逻辑和配置
 */
export const parseWorkerCode = workerCode => {
  const result = {
    [ENV_KEY_RESOURCE_ID]: null,
    [ENV_KEY_NAME]: null,
    [ENV_KEY_IS_BUNDLE]: false,
    [ENV_KEY_LOGIC]: null,
    [ENV_KEY_LOGIC_PRECOMPILED]: null,
    initialState: null,
    [ENV_KEY_CONTENT]: null,
    [ENV_KEY_CONTENT_PRECOMPILED]: null,
    hasReducer: false,
    hasInitFunction: false,
    originalCode: workerCode,
    [ENV_KEY_META_INFO]: null,
  }

  if (!workerCode) return result

  try {
    /* 解析 SYS_CONFIG  */
    const sysRaw = extractByMarkers(workerCode, 'SYS_CONFIG')
    if (sysRaw) {
      const sysConfig = JSON.parse(sysRaw)
      result[ENV_KEY_RESOURCE_ID] = sysConfig[ENV_KEY_RESOURCE_ID]
      result[ENV_KEY_NAME] = sysConfig[ENV_KEY_NAME]
      result[ENV_KEY_IS_BUNDLE] = Boolean(sysConfig[ENV_KEY_IS_BUNDLE])
    }

    /* 解析 APP_METAINFO  */
    const metaRaw = extractByMarkers(workerCode, 'APP_METAINFO')
    if (metaRaw) {
      result[ENV_KEY_META_INFO] = JSON.parse(metaRaw)
    }

    /* 解析 ORIGIN_COMPONENT  */
    const componentRaw = extractByMarkers(workerCode, 'ORIGIN_COMPONENT')
    if (componentRaw) {
      result[ENV_KEY_CONTENT] = JSON.parse(componentRaw)
    }

    /* 解析 PRECOMPILED_COMPONENT（预编译 JS 产物，可能为 null） */
    const precompiledRaw = extractByMarkers(workerCode, 'PRECOMPILED_COMPONENT')
    if (precompiledRaw) {
      const parsed = JSON.parse(precompiledRaw)
      if (parsed != null) {
        result[ENV_KEY_CONTENT_PRECOMPILED] = parsed
      }
    }

    /* 提取用户逻辑代码（内容等于兜底串则视为无用户逻辑） */
    // USER_LOGIC 是执行块（可能是预编译产物），LOGIC_SOURCE 是原始源码块（可能不存在）。
    // initialState / hasReducer / hasInitFunction 一律从执行块判定，因为它才是 worker 真正跑的那份；
    // ENV_KEY_LOGIC 优先回填原文，保证「worker.js → 资源 → 再生成 worker」不丢源码也不二次编译。
    const executedLogic = extractByMarkers(workerCode, 'USER_LOGIC')
    const rawLogicSource = extractByMarkers(workerCode, 'LOGIC_SOURCE')
    const logicSource = rawLogicSource ? JSON.parse(rawLogicSource) : null
    const userLogicCode = executedLogic && executedLogic !== FALLBACK_LOGIC ? executedLogic : null
    if (userLogicCode) {
      result[ENV_KEY_LOGIC] = logicSource || userLogicCode
      if (logicSource) result[ENV_KEY_LOGIC_PRECOMPILED] = userLogicCode

      // 提取内部的 initialState 对象（预编译产物里 const 会被转成 var）
      const initialStateMatch = userLogicCode.match(/(?:const|var|let)\s+initialState\s*=\s*([^;]+)(;?)/s)
      if (initialStateMatch) {
        try {
          // 尝试使用 Function 还原对象
          result.initialState = new Function(`return ${initialStateMatch[1]}`)()
        } catch (e) {
          result.initialState = initialStateMatch[1].trim()
        }
      }

      // 检测核心函数是否存在
      result.hasReducer = /function\s+reducer|const\s+reducer\s*=/.test(userLogicCode)
      result.hasInitFunction = /function\s+init|const\s+init\s*=/.test(userLogicCode)
    }

    // 设置消息处理器状态识别 (保留新版的严谨校验增强)
    result.messageHandlers = {
      INIT: workerCode.includes("case 'INIT'") || workerCode.includes("case'INIT'"),
      RESTORE: workerCode.includes("case 'RESTORE'") || workerCode.includes("case'RESTORE'"),
      UI_ACTION: workerCode.includes("case 'UI_ACTION'") || workerCode.includes("case'UI_ACTION'"),
    }
  } catch (error) {
    console.error('反解析 Worker 代码失败 (V2 模式):', error)
    result.parseError = error.message
  }

  return result
}
