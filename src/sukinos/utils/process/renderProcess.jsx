import React, { useState, useEffect, memo, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { compileSourceAsync, scopeCss, createCssModule } from '@/sukinos/utils/process/renderWindow';
import {
  resolveModuleKey, compileSource, toModuleSources, buildLogicModuleGraph, isHtmlKey, isCompiledKey
} from '@/sukinos/utils/process/sourceMapper';
import HtmlAppFrame from '@/sukinos/utils/process/htmlAppFrame';
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
import { clearSandboxStorageByPid, RESTRICTED_STORAGE_APIS } from '@/sukinos/utils/security'

// 本组件目前只用于预览。

/** 启动时清一遍历史预览沙箱数据：localStorage / sessionStorage / indexedDB / caches */
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
 * 抹平父组件无意义重渲染带来的回调引用变化；useLayoutEffect 保证同步阶段就取到最新闭包。
 * `typeof ref.current === 'function'` 是为兼容 AppView 等未传全部回调的场景
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
 * 幽灵沙箱单例（与 DynamicRenderer 一致）：只作 JS 执行上下文，不显示 UI。
 * 劫持 indexedDB / localStorage 等原生 API 逼 App 走 SDK；宿主注入的 SDK 钩子跑在宿主闭包里不受限制 ——「特权通行」。
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
  RESTRICTED_STORAGE_APIS.forEach(api => {
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
 * 结构化错误面板：吃 renderWindow 的编译期 errorDetail（phase / loc / stack），
 * 也吃 ErrorBoundary 的运行期 error + componentStack
 */
const ErrorDetailPanel = ({ errorDetail, componentStack, title, moduleKey }) => {
  const [showStack, setShowStack] = useState(false);

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

/** 组件判定：函数组件或含 render 方法的类组件，与 React 的识别规则一致 */
const isComponent = (v) =>
  typeof v === 'function' ||
  (typeof v === 'object' && v !== null && typeof v.render === 'function');

/**
 * 入口模块组件解析：default 存在且是组件则取它；没有 default 退到第一个组件具名导出；
 * 都不满足返回可读 error（不抛，交给错误面板展示）
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

/** 运行期错误边界：componentDidCatch 补 componentStack，展示交给 ErrorDetailPanel */
class PreviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      copied: false
    };
  }

  static getDerivedStateFromError(error) {
    // componentStack 在此阶段不可用，由 componentDidCatch 补充
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ componentStack: info?.componentStack || null });
    console.error('[PreviewErrorBoundary]', error, info);
  }

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
      const errorDetail = error?.errorDetail || {
        phase: 'runtime',
        message: error?.message || String(error || '未知运行时错误'),
        stack: error?.stack || '',
        loc: '',
      };

      return (
        <div style={{ padding: '10px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px', margin: '10px' }}>
          <span style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#ff4d4f', color: '#fff', fontSize: '12px', borderRadius: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
            RUNTIME ERROR
          </span>

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
 * 预览渲染器：自建 Logic Worker 执行环境 + 把视图源码编成 React 组件 + 注入 instanceSDK
 * + CSS 作用域隔离，最后组装 Layout 与 PageComponent 渲染
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
  // 编译版本状态：+1 强制重建 ErrorBoundary，清掉 runtime 错误缓存
  const [compileVersion, setCompileVersion] = useState(0);

  const workerRef = useRef(null);
  const compileDbRef = useRef(null);

  const finalPid = useMemo(() => {
    if (!previewId) return '';
    return previewId.startsWith('preView-') ? previewId : `preView-${previewId}`;
  }, [previewId]);

  const prevPreviewIdRef = useRef(finalPid);

  // 回调可能没传：代理函数在执行时静默略过
  const handleStateChange = useEventCallback(onStateChange);
  const handleLogAction = useEventCallback(onLogAction);
  const handleCompileStart = useEventCallback(onCompileStart);
  const handleCompileEnd = useEventCallback(onCompileEnd);
  const handleCompileError = useEventCallback(onCompileError);

  useEffect(() => {
    clearAllPreviewStorage();
  }, []);

  useEffect(() => {
    if (prevPreviewIdRef.current !== finalPid) {
      clearSandboxStorageByPid(prevPreviewIdRef.current);
      prevPreviewIdRef.current = finalPid;
    }
  }, [finalPid]);

  const sysDispatch = useCallback((action) => {
    // 发给 Worker 的消息类型必须是 UI_ACTION，才对得上 generateWorker 里的 switch(type)
    workerRef.current?.postMessage({ type: 'UI_ACTION', payload: action });
    handleLogAction(action);
  }, [handleLogAction]);

  const instanceSDK = useMemo(() => {
    // 对齐 DynamicRenderer：以 sysDispatch 为调度器
    return createSdkForInstance(sysDispatch, finalPid, false);
  }, [sysDispatch, finalPid]);

  const sysNavigate = useCallback((path) => {
    instanceSDK.API.navigate(path);
  }, [instanceSDK]);

  // 视图入口由资源固化的 entries 决定，缺省回落到历史 layout 约定
  const viewEntryKey = localEntries?.view || 'layout';
  // 文档档入口不进编译管线：预览与运行时共用 HtmlAppFrame 那一份合成器
  const isDocumentApp = isHtmlKey(viewEntryKey);
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

  // 交给 worker 的逻辑模块图：与生产同源（主逻辑 require 的目标也入图），只在逻辑文件变化时重建
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
      // 主逻辑块也预编译，`import { x } from './store/y'` 在预览里才可用；失败只降级成原文注入
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

  useEffect(() => {
    if (!localFiles || Object.keys(localFiles).length === 0) return;
    if (isDocumentApp) {
      // 文档档没有组件可编译：清掉上一轮 modules 并把状态报回外层，避免停在「编译中」
      setModules(null);
      handleCompileEnd();
      return;
    }
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
          // 混装包里的文档档、资源档与数据文本档没有编译路径：送进 Babel 只会产出一条假编译错误
          if (!isCompiledKey(filename, code)) continue;
          // CSS 模块保留 .css 后缀作为唯一 key，避免与同名 JS 模块冲突
          const isCss = /\.css$/.test(filename);
          const moduleKey = isCss ? filename : filename.replace(/\.(jsx|js)$/, '');

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

            // 外层仍吃字符串摘要
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
          // 嵌套 require 可能已把它求值完（循环依赖里它是别人的一环）：复用缓存，别把副作用跑两遍
          if (!mod.executed) {
            const exports = (mod.exports = {});
            try {
              // module 实参传注册表里的 mod 本体，module.exports = xxx 才写得进去（与 worker 侧同语义）
              mod.factory.call(sandboxWin, mod, exports, instanceSDK, moduleRegistry, moduleKey, moduleKeys);
              mod.executed = true;
            } catch (evalError) {
              mod.exports = null; // 求值失败不留半成品，下一次执行重来
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
        setCompileVersion(prev => prev + 1);
      } catch (e) {
        handleCompileError(e.message);
      }
      handleCompileEnd();
    }, 400);

    return () => {
      if (compileDbRef.current) clearTimeout(compileDbRef.current);
    };
  }, [localFiles, instanceSDK, finalPid, auxLogicKeys, viewEntryKey, isDocumentApp, handleCompileStart, handleCompileEnd, handleCompileError]);

  // CSS 以声明式 <style> 随 modules 渲染，不再手动改 document：文件同步更新时样式实时跟着变
  const scopedCssString = useMemo(() => {
    if (!modules) return '';
    const rawCss = Object.values(modules).map(m => m.style).filter(Boolean).join('\n');
    return scopeCss ? scopeCss(rawCss, finalPid) : rawCss;
  }, [modules, finalPid]);

  const currentPath = previewState.router?.path || 'home';

  const { RootComponent, ChildComponent } = useMemo(() => {
    if (!modules) return { RootComponent: null, ChildComponent: null };

    // 对齐 DynamicRenderer：按是否存在视图入口区分单文件/多文件模式
    const hasLayout = !!modules[viewEntryKey];

    if (!hasLayout) {
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
      // 多文件(Bundle)模式：布局 + 路由
      const Layout = modules[viewEntryKey].Component;

      // 当前路由页面的嵌套解析，与 deskBook 对齐
      const pageKey = resolveModuleKey(currentPath, Object.keys(modules));
      const Page = modules[pageKey]?.Component || (() => (
        <div style={{ padding: '20px', color: '#999', textAlign: 'center', fontSize: '14px' }}>
          404 — {currentPath}
        </div>
      ));

      return { RootComponent: Layout, ChildComponent: Page };
    }
  }, [modules, currentPath, viewEntryKey]);

  const commonProps = useMemo(() => ({
    // state 结构已含 generateWorker 注入的 config
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

  // 文档档预览：与运行时窗口同一份合成结果，差异只在 pid 前缀
  if (isDocumentApp) {
    return (
      <PreviewErrorBoundary key={compileVersion}>
        <div id={`proc-${finalPid}`} style={{ height: '100%' }}>
          <HtmlAppFrame
            pid={finalPid}
            htmlKey={viewEntryKey}
            files={localFiles || {}}
            sdk={instanceSDK}
          />
        </div>
      </PreviewErrorBoundary>
    );
  }

  if (!modules || !RootComponent) return null;

  return (
    <PreviewErrorBoundary key={compileVersion}>
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
