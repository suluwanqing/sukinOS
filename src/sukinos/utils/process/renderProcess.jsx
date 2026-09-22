import React, { useState, useEffect, memo, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { compileSourceAsync, scopeCss, createCssModule } from '@/sukinos/utils/process/renderWindow';
import {
  resolveModuleKey, compileSource, toModuleSources, buildLogicModuleGraph
} from '@/sukinos/utils/process/sourceMapper';
import { createSdkForInstance } from '@/sukinos/resources/sdk';

import { generateWorker } from './generateWorker';
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_LOGIC_PRECOMPILED,
  ENV_KEY_CONTENT,
  ENV_KEY_CONTENT_PRECOMPILED,
  ENV_KEY_META_INFO
} from '@/sukinos/utils/config';
import { clearSandboxStorageByPid } from '@/sukinos/utils/security'

// 这个组件暂时只用于预览这类。

/**
 * 每次启动/初始化时执行全局预览缓存和数据库垃圾清理，彻底防止历史沙箱数据残留
 */
const clearAllPreviewStorage = async () => {
  try {
    const keysToDel = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('pid-preView-') || key.includes('preView-'))) {
        keysToDel.push(key);
      }
    }
    keysToDel.forEach(k => localStorage.removeItem(k));
  } catch (e) {}

  try {
    const keysToDel = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('pid-preView-') || key.includes('preView-'))) {
        keysToDel.push(key);
      }
    }
    keysToDel.forEach(k => sessionStorage.removeItem(k));
  } catch (e) {}

  if (window.indexedDB && typeof window.indexedDB.databases === 'function') {
    try {
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) {
        if (db.name && (db.name.startsWith('pid-preView-') || db.name.includes('preView-'))) {
          window.indexedDB.deleteDatabase(db.name);
        }
      }
    } catch (e) {}
  }

  if (window.caches && typeof window.caches.keys === 'function') {
    try {
      const keys = await window.caches.keys();
      for (const key of keys) {
        if (key && (key.startsWith('pid-preView-') || key.includes('preView-'))) {
          await window.caches.delete(key);
        }
      }
    } catch (e) {}
  }
};

/**
 * 抹平 React 父组件无意义的重渲染带来的函数引用地址变化。
 * 使用 useLayoutEffect 确保在组件挂载和更新的同步阶段即获取最新闭包，避免竞态问题。
 * 强类型检查 `typeof ref.current === 'function'`，兼容 AppView 等未传递部分回调函数的场景
 */
function useEventCallback(fn) {
  const ref = useRef(fn);
  useLayoutEffect(() => {
    ref.current = fn;
  });
  return useCallback((...args) => {
    if (typeof ref.current === 'function') {
      return ref.current(...args);
    }
  }, []);
}

/**
 * 幽灵沙箱管理器 - 单例模式（与 DynamicRenderer 保持一致）
 * 仅作为 JS 执行上下文，不负责显示 UI。
 * 在单实例窗口上直接劫持并阻断 indexedDB、localStorage 等底层持久化 API。
 * 限制了 App 本身的 API 调用权限，但由于宿主注入的 SDK 钩子
 * 运行在宿主闭包上下文中，因此不受该限制影响，完美实现"特权通行"。
 */
let ghostIframeInstance = null;
const getGhostSandbox = () => {
  if (ghostIframeInstance) return ghostIframeInstance;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = 'kernel-ghost-sandbox';
  document.body.appendChild(iframe);
  ghostIframeInstance = iframe.contentWindow;

  // 拦截原生敏感 API，强迫 App 使用系统 SDK 钩子
  const restrictApis = ['indexedDB', 'localStorage', 'sessionStorage', 'openDatabase', 'caches'];
  restrictApis.forEach(api => {
    try {
      Object.defineProperty(ghostIframeInstance, api, {
        get: () => {
          throw new Error(`拒绝直接访问原生 API \`${api}\`。请使用 SDK 中提供的沙箱化版本：SDK.System.${api}`);
        },
        set: () => {
          throw new Error(`严禁篡改原生 API \`${api}\`。`);
        },
        configurable: false
      });
    } catch (e) {
      // 忽略已被原生锁定的情况
    }
  });
  return ghostIframeInstance;
};


/**
 * 结构化错误信息面板
 * renderWindow 返回的编译期 errorDetail（含 phase / loc / stack）
 * ErrorBoundary 捕获的运行期 error + componentStack
 */
const ErrorDetailPanel = ({ errorDetail, componentStack, title, moduleKey }) => {
  const [showStack, setShowStack] = useState(false);

  // 兼容两种入参格式
  const phase = errorDetail?.phase || 'runtime';
  const loc   = errorDetail?.loc   || '';
  const msg   = errorDetail?.message || (errorDetail instanceof Error ? errorDetail.message : String(errorDetail || '未知错误'));
  const stack = errorDetail?.stack  || (errorDetail instanceof Error ? errorDetail.stack : '') || '';

  const phaseLabel = {
    babel:   'Babel 转译',
    compile: '沙箱构建',
    runtime: '初始化运行',
    unknown: '未知阶段',
    validate:'输入校验',
  }[phase] || phase;

  const panelStyle = {
    padding: '14px 16px',
    color: '#cf1322',
    background: '#fff2f0',
    border: '1px solid #ffccc7',
    borderRadius: '6px',
    margin: '8px',
    fontSize: '13px',
    fontFamily: 'monospace',
    lineHeight: '1.6',
  };

  return (
    <div style={panelStyle}>

      <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px' }}>
        {title || `沙箱错误 [${moduleKey || '?'}]`}
      </div>


      <div style={{ marginBottom: '4px', color: '#820014' }}>
        <span>阶段：{phaseLabel}</span>
        {loc && <span style={{ marginLeft: '16px' }}>位置：{loc}</span>}
        {moduleKey && <span style={{ marginLeft: '16px' }}>模块：{moduleKey}</span>}
      </div>


      <div style={{
        background: '#fff0f0',
        border: '1px solid #ffa39e',
        borderRadius: '4px',
        padding: '8px 10px',
        marginBottom: '8px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
      }}>
        {msg}
      </div>


      {(stack || componentStack) && (
        <>
          <button
            onClick={() => setShowStack(v => !v)}
            style={{ background: 'none', border: 'none', color: '#cf1322', cursor: 'pointer', fontSize: '12px', padding: 0, marginBottom: '4px' }}
          >
            {showStack ? '▼ 隐藏调用栈' : '▶ 查看调用栈'}
          </button>
          {showStack && (
            <pre style={{
              background: '#fff2f0',
              border: '1px dashed #ffa39e',
              padding: '8px',
              borderRadius: '4px',
              fontSize: '11px',
              maxHeight: '200px',
              overflow: 'auto',
              color: '#a8071a',
              marginTop: '4px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}>
              {stack}
              {componentStack && (
                <>
                  {'\n\n--- React 组件树 ---\n'}
                  {componentStack}
                </>
              )}
            </pre>
          )}
        </>
      )}
    </div>
  );
};

/**
 * 组件判定：函数组件或含 render 方法的类组件。
 * 与 React 组件识别规则一致，用于入口模块（main/layout）的严格校验。
 * @param {*} v - 待判定值
 * @returns {boolean}
 */
const isComponent = (v) =>
  typeof v === 'function' ||
  (typeof v === 'object' && v !== null && typeof v.render === 'function');

/**
 * 入口模块组件解析：严格校验 default 导出为 React 组件。
 * - exports.default 存在且是组件 → 返回 { component, error: null }
 * - exports.default 存在但不是组件 → 返回 { component: null, error }
 * - exports.default 不存在 → 从具名导出中找第一个组件；找不到 → 返回 { component: null, error }
 * @param {object} exports - 模块执行后的导出对象
 * @returns {{ component: any, error: string|null }}
 */
const resolveComponent = (exports) => {
  // module.exports = 组件本体（手写 CommonJS 入口）同样是合法导出
  if (isComponent(exports)) return { component: exports, error: null };
  if (exports.default !== undefined) {
    if (isComponent(exports.default)) return { component: exports.default, error: null };
    return { component: null, error: '入口模块的 default 导出必须是 React 组件' };
  }
  const candidate = Object.values(exports).find(isComponent);
  if (candidate) return { component: candidate, error: null };
  return { component: null, error: '入口模块未导出 React 组件' };
};

/**
 * 运行期错误边界守卫
 * componentDidCatch 保存 React 组件树调用栈（componentStack）。
 * 错误展示改用结构化 ErrorDetailPanel，含阶段、位置、可展开调用栈。
 */
class PreviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      // 保存 React 组件树调用栈，便于在 UI 中展示
      componentStack: null,
      // 复制错误信息反馈
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    // componentStack 在此阶段不可用，由 componentDidCatch 补充
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 保存 React 组件树调用栈，供结构化错误面板展示
    this.setState({ componentStack: info?.componentStack || null });
    console.error('[PreviewErrorBoundary]', error, info);
  }

  // 复制结构化错误信息到剪贴板
  handleCopyError = () => {
    const { error, componentStack } = this.state;
    const errorDetail = error?.errorDetail || {
      phase: 'runtime',
      message: error?.message || String(error || '未知运行时错误'),
      stack: error?.stack || '',
      loc: '',
    };
    const text = [
      `[预览应用错误]`,
      `阶段: ${errorDetail.phase || 'runtime'}`,
      `位置: ${errorDetail.loc || '未知'}`,
      `消息: ${errorDetail.message}`,
      '',
      '--- 调用栈 ---',
      errorDetail.stack || '无',
      componentStack ? `\n--- React 组件树 ---\n${componentStack}` : '',
    ].join('\n');
    try {
      navigator.clipboard?.writeText(text).then(() => {
        this.setState({ copied: true });
        setTimeout(() => this.setState({ copied: false }), 2000);
      }).catch(() => {});
    } catch (e) {}
  };

  render() {
    if (this.state.hasError) {
      const { error, componentStack } = this.state;
      // 将运行时 Error 适配为 ErrorDetailPanel 所需的 errorDetail 格式
      const errorDetail = error?.errorDetail || {
        phase: 'runtime',
        message: error?.message || String(error || '未知运行时错误'),
        stack: error?.stack || '',
        loc: '',
      };

      return (
        <div style={{ padding: '10px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px', margin: '10px' }}>
          {/* 阶段标签 */}
          <span style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#ff4d4f', color: '#fff', fontSize: '12px', borderRadius: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
            RUNTIME ERROR
          </span>

          {/* 结构化错误详情面板，含可展开调用栈 */}
          <ErrorDetailPanel
            errorDetail={errorDetail}
            componentStack={componentStack}
            title="运行时崩溃"
          />

          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            <button
              style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '2px' }}
              onClick={() => this.setState({ hasError: false, error: null, componentStack: null })}
            >
              RECOVER
            </button>
            <button
              style={{ padding: '4px 12px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '2px' }}
              onClick={this.handleCopyError}
            >
              {this.state.copied ? '✓ 已复制' : '复制错误信息'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * RenderProcess 核心渲染组件
 *
 * 维护独立的 Logic Worker 执行环境
 * 动态编译视图源代码字符串并转换为 React 组件
 * 注入系统级别的 SDK (instanceSDK)
 * 管理 CSS 作用域隔离
 * 组装 Layout 与 PageComponent 并执行最终渲染
 */
const RenderProcess = ({
  localFiles,
  localLogicCode,
  localEntries,
  previewId,
  onStateChange,
  onLogAction,
  onCompileStart,
  onCompileEnd,
  onCompileError
}) => {
  const [previewState, setPreviewState] = useState({});
  const [modules, setModules] = useState(null);
  // 编译版本状态，用来强制触发 ErrorBoundary 的完全重建，清除 runtime 错误缓存状态
  const [compileVersion, setCompileVersion] = useState(0);

  const workerRef = useRef(null);
  const compileDbRef = useRef(null);

  const finalPid = useMemo(() => {
    if (!previewId) return '';
    return previewId.startsWith('preView-') ? previewId : `preView-${previewId}`;
  }, [previewId]);

  // 追踪上一次的 previewId，用于沙箱存储清理对比
  const prevPreviewIdRef = useRef(finalPid);

  //如果外部传了 undefined，这里的代理函数在被执行时也会静默略过
  const handleStateChange = useEventCallback(onStateChange);
  const handleLogAction = useEventCallback(onLogAction);
  const handleCompileStart = useEventCallback(onCompileStart);
  const handleCompileEnd = useEventCallback(onCompileEnd);
  const handleCompileError = useEventCallback(onCompileError);

  // --- 每次组件启动/初始化时执行全局预览缓存清理 ---
  useEffect(() => {
    clearAllPreviewStorage();
  }, []);

  // --- 监控 previewId 变化并清理沙箱缓存 ---
  useEffect(() => {
    if (prevPreviewIdRef.current !== finalPid) {
      clearSandboxStorageByPid(prevPreviewIdRef.current);
      prevPreviewIdRef.current = finalPid;
    }
  }, [finalPid]);

  // --- 建立系统通信桥梁 ---
  const sysDispatch = useCallback((action) => {
    // 模拟内核 Kernel.dispatch 行为：
    // UI 层调用的是 dispatch(action)，但底层发给 Worker 的消息类型必须是 UI_ACTION
    // 这样才能匹配 generateWorker 生成的 Worker 中的 switch(type) 逻辑
    workerRef.current?.postMessage({ type: 'UI_ACTION', payload: action });
    handleLogAction(action);
  }, [handleLogAction]);

  // --- 创建 SDK 实例 (特权通行证) ---
  const instanceSDK = useMemo(() => {
    // 这里对齐 DynamicRenderer，传入 sysDispatch 作为调度器
    return createSdkForInstance(sysDispatch, finalPid, false);
  }, [sysDispatch, finalPid]);

  const sysNavigate = useCallback((path) => {
    // 对齐 DynamicRenderer，通过 SDK 内部的 navigate 逻辑触发
    instanceSDK.API.navigate(path);
  }, [instanceSDK]);

  // 视图入口由资源固化的 entries 决定，缺省回落到历史 layout 约定
  const viewEntryKey = localEntries?.view || 'layout';
  const auxLogicKeys = useMemo(
    () => (Array.isArray(localEntries?.logicAux) ? localEntries.logicAux : []),
    [localEntries]
  );
  const logicMainKey = localEntries?.logicMain || null;

  // 提取 isBundle 的判定，避免完整的 localFiles 对象触发 Worker 异常销毁
  const isBundle = useMemo(() => {
    if (!localFiles) return false;
    return Object.keys(localFiles).some(k =>
      k === `${viewEntryKey}.jsx` || k === `${viewEntryKey}.js` || k === viewEntryKey
    );
  }, [localFiles, viewEntryKey]);

  // 交给 worker 的逻辑模块图：与生产同源（主逻辑 require 的目标同样入图），
  // 只在逻辑相关文件变化时重建，编辑页面不打断预览状态
  const logicModules = useMemo(
    () => buildLogicModuleGraph(
      toModuleSources(localFiles),
      { logicMain: logicMainKey, logicAux: auxLogicKeys },
      localLogicCode || ''
    ),
    [localFiles, logicMainKey, auxLogicKeys, localLogicCode]
  );
  const logicModulesRef = useRef(logicModules);
  logicModulesRef.current = logicModules;
  const logicModulesKey = useMemo(
    () => JSON.stringify([viewEntryKey, logicMainKey, auxLogicKeys, logicModules]),
    [viewEntryKey, logicMainKey, auxLogicKeys, logicModules]
  );

  // --- 驱动 Logic 运行 (Worker 状态机) ---
  useEffect(() => {
    let cancelled = false;
    let worker = null;
    let url = null;

    const boot = async () => {
      // 与生产对齐：辅逻辑模块先编译成 CJS 产物，worker 侧模块运行时按 require 取用
      const logicContent = {};
      const logicPrecompiled = {};
      for (const [key, code] of Object.entries(logicModulesRef.current)) {
        logicContent[key] = code;
        try {
          logicPrecompiled[key] = await compileSource(code, { filename: `${key}.jsx` });
        } catch (e) {
          console.warn(`[预览] 逻辑模块 ${key} 编译失败，worker 侧 require 将不可用:`, e?.message);
        }
      }
      // 主逻辑块同样预编译（安装期由 precompileResourceContent 做同样的事），
      // 这样 `import { x } from './store/y'` 在预览里就能用；失败只降级成原文注入
      let logicPrecompiledMain = null;
      if (localLogicCode) {
        try {
          logicPrecompiledMain = await compileSource(localLogicCode, { filename: `${logicMainKey || 'logic'}.jsx` });
        } catch (e) {
          console.warn('[预览] 主逻辑块编译失败，回退为原文注入:', e?.message);
        }
      }
      if (cancelled) return;

      if (workerRef.current) workerRef.current.terminate();

      // 兼容 generateWorker 的参数结构，保证预览环境 Worker 逻辑与生产 100% 对齐
      const workerArgs = {
        [ENV_KEY_RESOURCE_ID]: finalPid,
        [ENV_KEY_NAME]: 'Preview-App',
        [ENV_KEY_IS_BUNDLE]: isBundle,
        [ENV_KEY_LOGIC]: localLogicCode || null, // 无 logic 时由 generateWorker 内部兜底
        [ENV_KEY_LOGIC_PRECOMPILED]: logicPrecompiledMain,
        [ENV_KEY_CONTENT]: logicContent, // 只给逻辑模块，页面资源预览无需
        [ENV_KEY_CONTENT_PRECOMPILED]: logicPrecompiled,
        [ENV_KEY_META_INFO]: {
          isPreview: true,
          entries: { view: viewEntryKey, logicMain: logicMainKey, logicAux: auxLogicKeys }
        }
      };

      const code = generateWorker(workerArgs);
      const blob = new Blob([code], { type: 'application/javascript' });
      url = URL.createObjectURL(blob);
      worker = new Worker(url, { name: `Preview-${finalPid}` });

      worker.onmessage = (e) => {
        // 这里的 STATE_UPDATE 是 generateWorker 内部 broadcast 函数发送的
        if (e.data.type === 'STATE_UPDATE') {
          setPreviewState(e.data.payload);
          // 直接调用稳定且安全的代理函数
          handleStateChange(e.data.payload);
        }
      };
      worker.postMessage({ type: 'INIT' });
      workerRef.current = worker;
    };
    boot();

    return () => {
      cancelled = true;
      worker?.terminate();
      if (url) URL.revokeObjectURL(url);
    };
  }, [localLogicCode, finalPid, isBundle, logicModulesKey, viewEntryKey, logicMainKey, handleStateChange]);

  // --- 执行 View 编译 (源代码 -> React组件) ---
  useEffect(() => {
    if (!localFiles || Object.keys(localFiles).length === 0) return;
    if (compileDbRef.current) clearTimeout(compileDbRef.current);

    compileDbRef.current = setTimeout(async () => {
      handleCompileStart();
      // 编译开始前重置错误，避免旧错误消息残留误导开发者
      handleCompileError('');
      try {
        const sandboxWin = getGhostSandbox();
        const resultMap = {};
        // 收集本轮编译中所有模块的结构化错误，编译结束后统一通知外层
        const errorList = [];
        // 模块注册表：{ key: { factory, exports } }，供 require 解析相对路径导入
        const moduleRegistry = {};
        const moduleKeys = [];

        // 第一阶段：编译所有模块，构建 moduleRegistry（不执行）
        for (const [filename, code] of Object.entries(localFiles)) {
          // CSS 模块保留 .css 后缀作为唯一 key，避免与同名 JS 模块冲突
          const isCss = /\.css$/.test(filename);
          const moduleKey = isCss ? filename : filename.replace(/\.(jsx|js)$/, '');

          // CSS 不走 Babel，走专用 CSS 模块生成器；.jsx/.js 走 Babel 编译
          const res = isCss
            ? createCssModule(code, moduleKey)
            : await compileSourceAsync({ sourceCode: code, pid: finalPid, module: moduleKey });

          if (res.error) {
            // 优先使用 renderWindow 返回的结构化 errorDetail，兜底降级为字符串
            const detail = res.errorDetail || {
              phase: 'compile',
              message: res.error,
              stack: res.error,
              loc: ''
            };
            errorList.push({ key: moduleKey, errorDetail: detail });

            // 向外层透传结构化可读的错误摘要（保持原有字符串接口不变）
            handleCompileError(`[${moduleKey}] ${detail.message}${detail.loc ? `（${detail.loc}）` : ''}`);
            continue;
          }

          moduleRegistry[moduleKey] = { factory: res.factory, exports: null };
          moduleKeys.push(moduleKey);
        }

        // 第二阶段：执行所有模块，构建 resultMap
        for (const moduleKey of moduleKeys) {
          // 辅逻辑模块由 worker 侧模块运行时求值，UI 侧只编译不执行，避免副作用跑两遍
          if (auxLogicKeys.includes(moduleKey)) continue;
          const mod = moduleRegistry[moduleKey];
          // 嵌套 require 可能已经把这个模块求值完了（循环依赖里它是别人的一环），复用缓存而不是再跑一次副作用
          if (!mod.executed) {
            const exports = (mod.exports = {});
            try {
              // 使用幽灵沙箱环境执行工厂函数，注入 SDK 与完整模块上下文
              // module 实参用注册表里的 mod 本体，module.exports = xxx 才写得进去（与 worker 侧同语义）
              mod.factory.call(sandboxWin, mod, exports, instanceSDK, moduleRegistry, moduleKey, moduleKeys);
              mod.executed = true;
            } catch (evalError) {
              mod.exports = null; // 求值失败不留半成品，下一次执行重来
              // factory 执行阶段（初始化运行时）异常
              const detail = {
                phase: 'runtime',
                message: evalError.message,
                stack: evalError.stack || evalError.message,
                loc: ''
              };
              errorList.push({ key: moduleKey, errorDetail: detail });
              handleCompileError(`[${moduleKey}] 运行时异常：${detail.message}`);
              resultMap[moduleKey] = {
                Component: () => (
                  <ErrorDetailPanel
                    errorDetail={detail}
                    title={`初始化运行时异常 [${moduleKey}]`}
                    moduleKey={moduleKey}
                  />
                ),
                style: ''
              };
              continue;
            }
          }
          const exports = mod.exports || {};
          // 入口模块（内容入口 / 视图入口）严格校验导出为 React 组件，避免非组件被静默渲染导致 React 报错
          const isEntry = moduleKey === 'main' || moduleKey === viewEntryKey;
          if (isEntry) {
            const { component, error } = resolveComponent(exports);
            if (error) {
              const detail = {
                phase: 'validate',
                message: error,
                stack: error,
                loc: ''
              };
              errorList.push({ key: moduleKey, errorDetail: detail });
              handleCompileError(`[${moduleKey}] ${error}`);
              resultMap[moduleKey] = {
                Component: () => (
                  <ErrorDetailPanel
                    errorDetail={detail}
                    title={`入口模块导出校验失败 [${moduleKey}]`}
                    moduleKey={moduleKey}
                  />
                ),
                style: exports.style || ''
              };
            } else {
              resultMap[moduleKey] = { Component: component, style: exports.style || '' };
            }
          } else {
            resultMap[moduleKey] = { Component: exports.default || exports, style: exports.style || '' };
          }
        }

        setModules(resultMap);
        // 编译并更新模块成功后，递增版本号，迫使错误边界销毁并重建
        setCompileVersion(prev => prev + 1);
      } catch (e) {
        // 顶层未预期异常兜底
        handleCompileError(e.message);
      }
      handleCompileEnd();
    }, 400);

    // 卸载或重新执行时清理未完成的定时任务，防止内存泄漏和竞态
    return () => {
      if (compileDbRef.current) clearTimeout(compileDbRef.current);
    };
  }, [localFiles, instanceSDK, finalPid, auxLogicKeys, viewEntryKey, handleCompileStart, handleCompileEnd, handleCompileError]);

  // 声明式生成 CSS 字符串。
  // 放弃原生 document.getElementById()，直接在下方用 <style> 标签渲染，
  // 这样只要 file 同步更新了[传入的数据] modules，React 就会强制并实时地更新 CSS
  const scopedCssString = useMemo(() => {
    if (!modules) return '';
    const rawCss = Object.values(modules).map(m => m.style).filter(Boolean).join('\n');
    return scopeCss ? scopeCss(rawCss, finalPid) : rawCss;
  }, [modules, finalPid]);

  // --- 确定当前路由与组装 UI ---
  const currentPath = previewState.router?.path || 'home';

  const { RootComponent, ChildComponent } = useMemo(() => {
    if (!modules) return { RootComponent: null, ChildComponent: null };

    // 对齐 DynamicRenderer 行为，依据是否存在视图入口区分单文件/多文件模式
    const hasLayout = !!modules[viewEntryKey];

    if (!hasLayout) {
      // 单文件模式处理逻辑
      const Main = modules['main']?.Component;
      if (!Main) return {
        RootComponent: () => (
          <div style={{ padding: '20px', color: '#faad14', textAlign: 'center', fontSize: '14px' }}>
             {viewEntryKey} 组件丢失!
          </div>
        ),
        ChildComponent: null,
      };
      // 避免单文件模式下 PageComponent 去渲染引发 404
      return { RootComponent: Main, ChildComponent: () => <div /> };
    } else {
      // 多文件(Bundle)模式：存在视图入口，按布局+路由模式处理
      // 寻找布局组件
      const Layout = modules[viewEntryKey].Component;

      // 寻找当前路由对应的页面（嵌套路由解析，与 deskBook 对齐）
      const pageKey = resolveModuleKey(currentPath, Object.keys(modules));
      const Page = modules[pageKey]?.Component || (() => (
        <div style={{ padding: '20px', color: '#999', textAlign: 'center', fontSize: '14px' }}>
          404 — {currentPath}
        </div>
      ));

      return { RootComponent: Layout, ChildComponent: Page };
    }
  }, [modules, currentPath, viewEntryKey]);

  // 准备传递给组件的 CommonProps
  const commonProps = useMemo(() => ({
    // 此时的 state 结构已包含 generateWorker 注入的 config
    state: previewState,
    dispatch: sysDispatch,
    navigate: sysNavigate,
    pid: finalPid,
    fetch: instanceSDK.API.fetch,
    handleFocus: () => {},
    reStartApp: () => {},
    forceReStartApp: () => {}
  }), [previewState, sysDispatch, sysNavigate, finalPid, instanceSDK]);

  // 引用代理，确保渲染期间 PageComponent 指向最新编译结果
  const proxyLiveRef = useRef({ ChildComponent, commonProps });
  proxyLiveRef.current = { ChildComponent, commonProps };

  const StablePageComponent = useCallback((props) => {
    const { ChildComponent: Comp, commonProps: cp } = proxyLiveRef.current;
    return Comp ? <Comp {...cp} {...props} /> : null;
  }, []);

  if (!modules || !RootComponent) return null;

  return (
    <PreviewErrorBoundary key={compileVersion}>
      {/* 声明式注入样式标签，跟随组件同步渲染，完美解决文件同步时样式不更新问题 */}
      {scopedCssString && (
        <style dangerouslySetInnerHTML={{ __html: scopedCssString }} />
      )}
      {/*强制包裹带有匹配 ID 的 div，防止 scopeCss 转换后的 CSS 选择器失去锚点导致页面无样式白屏！ */}
      <div id={`proc-${finalPid}`} style={{ height: '100%' }}>
        <RootComponent {...commonProps} PageComponent={StablePageComponent} />
      </div>
    </PreviewErrorBoundary>
  );
};

export default memo(RenderProcess, (prevProps, nextProps) => {
  return prevProps.previewId === nextProps.previewId &&
         prevProps.localLogicCode === nextProps.localLogicCode &&
         prevProps.localFiles === nextProps.localFiles &&
         prevProps.localEntries === nextProps.localEntries;
});
