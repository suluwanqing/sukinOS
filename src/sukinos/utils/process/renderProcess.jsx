import React, { useState, useEffect, memo, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { compileSourceAsync, scopeCss } from '@/sukinos/utils/process/renderWindow';
import { createSdkForInstance } from '@/sukinos/resources/sdk';

import { generateWorker } from './generateWorker';
import {
  ENV_KEY_RESOURCE_ID,
  ENV_KEY_NAME,
  ENV_KEY_IS_BUNDLE,
  ENV_KEY_LOGIC,
  ENV_KEY_CONTENT,
  ENV_KEY_META_INFO
} from '@/sukinos/utils/config';
import { clearSandboxStorageByPid } from '@/sukinos/utils/security'
// 这个组件暂时只用于预览这类。

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

  // 追踪上一次的 previewId，用于沙箱存储清理对比
  const prevPreviewIdRef = useRef(previewId);

  //如果外部传了 undefined，这里的代理函数在被执行时也会静默略过
  const handleStateChange = useEventCallback(onStateChange);
  const handleLogAction = useEventCallback(onLogAction);
  const handleCompileStart = useEventCallback(onCompileStart);
  const handleCompileEnd = useEventCallback(onCompileEnd);
  const handleCompileError = useEventCallback(onCompileError);

  // --- 监控 previewId 变化并清理沙箱缓存 ---
  useEffect(() => {
    if (prevPreviewIdRef.current !== previewId) {
      clearSandboxStorageByPid(prevPreviewIdRef.current);
      prevPreviewIdRef.current = previewId;
    }
  }, [previewId]);

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
    return createSdkForInstance(sysDispatch, previewId, false);
  }, [sysDispatch, previewId]);

  const sysNavigate = useCallback((path) => {
    // 对齐 DynamicRenderer，通过 SDK 内部的 navigate 逻辑触发
    instanceSDK.API.navigate(path);
  }, [instanceSDK]);

  // 提取 isBundle 的判定，避免完整的 localFiles 对象触发 Worker 异常销毁
  const isBundle = useMemo(() => {
    return !!(localFiles && (localFiles['layout.jsx'] || localFiles['layout.js']));
  }, [localFiles]);

  // --- 驱动 Logic 运行 (Worker 状态机) ---
  useEffect(() => {
    if (!localLogicCode) return;
    if (workerRef.current) workerRef.current.terminate();

    // 兼容 generateWorker 的参数结构，保证预览环境 Worker 逻辑与生产 100% 对齐
    const workerArgs = {
      [ENV_KEY_RESOURCE_ID]: previewId,
      [ENV_KEY_NAME]: 'Preview-App',
      [ENV_KEY_IS_BUNDLE]: isBundle,
      [ENV_KEY_LOGIC]: localLogicCode,
      [ENV_KEY_CONTENT]: {}, // 预览无需原始资源
      [ENV_KEY_META_INFO]: { isPreview: true }
    };

    const code = generateWorker(workerArgs);
    const blob = new Blob([code], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    const w = new Worker(url, { name: `Preview-${previewId}` });

    w.onmessage = (e) => {
      // 这里的 STATE_UPDATE 是 generateWorker 内部 broadcast 函数发送的
      if (e.data.type === 'STATE_UPDATE') {
        setPreviewState(e.data.payload);
        // 直接调用稳定且安全的代理函数
        handleStateChange(e.data.payload);
      }
    };
    w.postMessage({ type: 'INIT' });
    workerRef.current = w;

    return () => { w.terminate(); URL.revokeObjectURL(url); };
  }, [localLogicCode, previewId, isBundle, handleStateChange]);

  // --- 执行 View 编译 (源代码 -> React组件) ---
  useEffect(() => {
    if (!localFiles || Object.keys(localFiles).length === 0) return;
    if (compileDbRef.current) clearTimeout(compileDbRef.current);

    compileDbRef.current = setTimeout(async () => {
      handleCompileStart();
      handleCompileError('');
      try {
        const sandboxWin = getGhostSandbox();
        const resultMap = {};
        for (const [filename, code] of Object.entries(localFiles)) {
          const res = await compileSourceAsync(code, previewId);
          if (res.error) {
            handleCompileError(`${filename}: ${res.error}`);
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
        handleCompileError(e.message);
      }
      handleCompileEnd();
    }, 400);
  }, [localFiles, instanceSDK, previewId, handleCompileStart, handleCompileEnd, handleCompileError]);

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

    // 对齐 DynamicRenderer 行为，依据是否存在 layout 区分单文件/多文件模式
    const hasLayout = !!modules['layout'];

    if (!hasLayout) {
      // 单文件模式处理逻辑
      const Main = modules['main']?.Component;
      if (!Main) return {
        RootComponent: () => (
          <div style={{ padding: '20px', color: '#faad14', textAlign: 'center', fontSize: '14px' }}>
             layout.jsx 组件丢失!
          </div>
        ),
        ChildComponent: null,
      };
      // 避免单文件模式下 PageComponent 去渲染引发 404
      return { RootComponent: Main, ChildComponent: () => <div /> };
    } else {
      // 多文件(Bundle)模式：存在 layout，按布局+路由模式处理
      // 寻找布局组件
      const Layout = modules['layout'].Component;

      // 寻找当前路由对应的页面
      const Page = modules[currentPath]?.Component || (() => (
        <div style={{ padding: '20px', color: '#999', textAlign: 'center', fontSize: '14px' }}>
          404 — {currentPath}
        </div>
      ));

      return { RootComponent: Layout, ChildComponent: Page };
    }
  }, [modules, currentPath]);

  // 准备传递给组件的 CommonProps
  const commonProps = useMemo(() => ({
    // 此时的 state 结构已包含 generateWorker 注入的 config
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
      {/*强制包裹带有匹配 ID 的 div，防止 scopeCss 转换后的 CSS 选择器失去锚点导致页面无样式白屏！ */}
      <div id={`proc-${previewId}`} style={{ height: '100%' }}>
        <RootComponent {...commonProps} PageComponent={StablePageComponent} />
      </div>
    </PreviewErrorBoundary>
  );
};

export default memo(RenderProcess, (prevProps, nextProps) => {
  return prevProps.previewId === nextProps.previewId &&
         prevProps.localLogicCode === nextProps.localLogicCode &&
         prevProps.localFiles === nextProps.localFiles;
});
