import React, { useState, useEffect, memo, useRef, useCallback, useMemo } from 'react';
import { compileSourceAsync, scopeCss } from '@/sukinos/utils/process/renderWindow';
import { createSdkForInstance } from '@/sukinos/resources/sdk';
import {
  getWorkerSandboxPreamble, createStorageProxy, createIndexedDBProxy,
  createSecureFetch
} from '@/sukinos/utils/security';

// 这个组件暂时只用于预览这类。

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
 * 生成预检 Worker 脚本字符串
 */
const generatePreviewWorker = (fullLogicCode, pid) => {
  const storageProxySource = createStorageProxy.toString();
  const indexedDBProxySource = createIndexedDBProxy.toString();
  const secureFetchSource = createSecureFetch.toString();
  return `
    ${getWorkerSandboxPreamble(pid, storageProxySource, indexedDBProxySource, secureFetchSource)}
    {
      const window = _safeGlobalProxy; const self = _safeGlobalProxy;
      const globalThis = _safeGlobalProxy; const eval = _safeGlobalProxy.eval;
      const Function = _safeGlobalProxy.Function; const setTimeout = _safeGlobalProxy.setTimeout;
      const setInterval = _safeGlobalProxy.setInterval; const fetch = _safeGlobalProxy.fetch;
      const indexedDB = _safeGlobalProxy.indexedDB; const System = _safeGlobalProxy.System;
      const navigator = _safeGlobalProxy.navigator; const URL = _safeGlobalProxy.URL;
      const Blob = _safeGlobalProxy.Blob; const navigate = _safeGlobalProxy.navigate;
      const require = (name) => { if(name==='react') return {}; throw new Error("Sandbox error"); };
      ${fullLogicCode}
      let _state = {};
      const broadcast = () => self.postMessage({ type: 'STATE_UPDATE', payload: _state });
      self.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'INIT') {
           _state = typeof initialState !== 'undefined' ? initialState : {};
           if (!_state.router) _state.router = { path: 'home' };
           broadcast();
        } else if (type === 'DISPATCH') {
           const reducerFn = typeof reducer === 'function' ? reducer : (s) => s;
           let nextState = reducerFn(_state, payload);
           if (payload && payload.type === 'NAVIGATE') {
             const currentRouter = nextState.router || { path: 'home' };
             nextState = { ...nextState, router: { ...currentRouter, path: payload.payload } };
           }
           _state = nextState; broadcast();
        }
      };
    }
  `;
};

/**
 * 运行期错误边界容器
 */
class PreviewErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '16px', backgroundColor: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px', margin: '10px' }}>
          <span style={{ display: 'inline-block', padding: '2px 8px', backgroundColor: '#ff4d4f', color: '#fff', fontSize: '12px', borderRadius: '2px', marginBottom: '8px', fontWeight: 'bold' }}>
            RUNTIME ERROR
          </span>
          <p style={{ margin: '8px 0', fontSize: '13px', color: '#434343', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {this.state.error?.toString()}
          </p>
          <button
            style={{ marginTop: '8px', padding: '4px 12px', cursor: 'pointer', backgroundColor: '#fff', border: '1px solid #d9d9d9', borderRadius: '2px' }}
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            RECOVER
          </button>
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
  previewId,
  onStateChange,
  onLogAction,
  onCompileStart,
  onCompileEnd,
  onCompileError
}) => {
  const [previewState, setPreviewState] = useState({});
  const [modules, setModules] = useState(null);

  const workerRef = useRef(null);
  const compileDbRef = useRef(null);

  // --- 建立系统通信桥梁 ---
  const sysDispatch = useCallback((action) => {
    workerRef.current?.postMessage({ type: 'DISPATCH', payload: action });
    // 将日志向上传递给宿主
    onLogAction?.(action);
  }, [onLogAction]);

  const sysNavigate = useCallback((path) => {
    sysDispatch({ type: 'NAVIGATE', payload: path });
  }, [sysDispatch]);

  // --- 创建 SDK 实例 (特权通行证) ---
  const instanceSDK = useMemo(() => {
    return createSdkForInstance(sysDispatch, previewId, false);
  }, [sysDispatch, previewId]);

  // --- 驱动 Logic 运行 (Worker 状态机) ---
  useEffect(() => {
    if (!localLogicCode) return;
    if (workerRef.current) workerRef.current.terminate();

    const code = generatePreviewWorker(localLogicCode, previewId);
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const w = new Worker(url);

    w.onmessage = (e) => {
      if (e.data.type === 'STATE_UPDATE') {
        setPreviewState(e.data.payload);
        // 通知宿主状态更新
        onStateChange?.(e.data.payload);
      }
    };
    w.postMessage({ type: 'INIT' });
    workerRef.current = w;

    return () => { w.terminate(); URL.revokeObjectURL(url); };
  }, [localLogicCode, previewId, onStateChange]);

  // --- 执行 View 编译 (源代码 -> React组件) ---
  useEffect(() => {
    if (Object.keys(localFiles).length === 0) return;
    if (compileDbRef.current) clearTimeout(compileDbRef.current);

    compileDbRef.current = setTimeout(async () => {
      onCompileStart?.();
      onCompileError?.('');
      try {
        const sandboxWin = getGhostSandbox();
        const resultMap = {};
        for (const [filename, code] of Object.entries(localFiles)) {
          const res = await compileSourceAsync(code, previewId);
          if (res.error) {
            onCompileError?.(`${filename}: ${res.error}`);
            continue;
          }
          const exports = {};
          // 使用幽灵沙箱环境执行工厂函数，注入 SDK
          res.factory.call(sandboxWin, { exports }, exports, instanceSDK);
          const key = filename.replace(/\.(jsx|js)$/, '');
          resultMap[key] = { Component: exports.default || exports, style: exports.style || '' };
        }
        setModules(resultMap);
      } catch (e) {
        onCompileError?.(e.message);
      }
      onCompileEnd?.();
    }, 400);
  }, [localFiles, instanceSDK, previewId, onCompileStart, onCompileEnd, onCompileError]);

  // 声明式生成 CSS 字符串。
  // 放弃原生 document.getElementById()，直接在下方用 <style> 标签渲染，
  // 这样只要文件同步更新了[传入的数据] modules，React 就会强制并实时地更新 CSS
  const scopedCssString = useMemo(() => {
    if (!modules) return '';
    const rawCss = Object.values(modules).map(m => m.style).filter(Boolean).join('\n');
    return scopeCss ? scopeCss(rawCss, previewId) : rawCss;
  }, [modules, previewId]);

  // --- 确定当前路由与组装 UI ---
  const currentPath = previewState.router?.path || 'home';

  const { RootComponent, ChildComponent } = useMemo(() => {
    if (!modules) return { RootComponent: null, ChildComponent: null };

    // 寻找布局组件
    const Layout = modules['layout']?.Component || modules['main']?.Component;
    if (!Layout) return {
      RootComponent: () => (
        <div style={{ padding: '20px', color: '#faad14', textAlign: 'center', fontSize: '14px' }}>
          缺少 layout 组件
        </div>
      ),
      ChildComponent: null,
    };

    // 寻找当前路由对应的页面
    const Page = modules[currentPath]?.Component || (() => (
      <div style={{ padding: '20px', color: '#999', textAlign: 'center', fontSize: '14px' }}>
        404 — {currentPath}
      </div>
    ));

    return { RootComponent: Layout, ChildComponent: Page };
  }, [modules, currentPath]);

  // 准备传递给组件的 CommonProps
  const commonProps = useMemo(() => ({
    state: previewState,
    dispatch: sysDispatch,
    navigate: sysNavigate,
    pid: previewId,
    fetch: instanceSDK.API.fetch,
    handleFocus: () => {},
    reStartApp: () => {},
    forceReStartApp: () => {}
  }), [previewState, sysDispatch, sysNavigate, previewId, instanceSDK]);

  // 引用代理，确保渲染期间 PageComponent 指向最新编译结果
  const proxyLiveRef = useRef({ ChildComponent, commonProps });
  proxyLiveRef.current = { ChildComponent, commonProps };

  const StablePageComponent = useCallback((props) => {
    const { ChildComponent: Comp, commonProps: cp } = proxyLiveRef.current;
    return Comp ? <Comp {...cp} {...props} /> : null;
  }, []);

  if (!modules || !RootComponent) return null;

  return (
    <PreviewErrorBoundary>
      {/* 声明式注入样式标签，跟随组件同步渲染，完美解决文件同步时样式不更新问题 */}
      {scopedCssString && (
        <style dangerouslySetInnerHTML={{ __html: scopedCssString }} />
      )}
      <RootComponent {...commonProps} PageComponent={StablePageComponent} />
    </PreviewErrorBoundary>
  );
};

export default memo(RenderProcess);
