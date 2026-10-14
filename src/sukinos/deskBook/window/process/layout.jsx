import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { compileSourceAsync, scopeCss, createCssModule, clearCompileCache } from '@/sukinos/utils/process/renderWindow'
import { resolveModuleKey, resolveAppEntries, isHtmlKey, isCompiledKey } from '@/sukinos/utils/process/sourceMapper'
import HtmlAppFrame from '@/sukinos/utils/process/htmlAppFrame'
import { RESTRICTED_STORAGE_APIS } from '@/sukinos/utils/security'
import { ENV_KEY_META_INFO,ENV_KEY_RESOURCE_ID,ENV_KEY_CONTENT,ENV_KEY_CONTENT_PRECOMPILED } from '@/sukinos/utils/config'
import { createSdkForInstance } from "@/sukinos/resources/sdk"
import { registerSandboxDoc } from '@/sukinos/utils/process/styleSyncHub'

/**
 * 幽灵沙箱管理器 - 单例模式
 * 仅作为 JS 执行上下文，不负责显示 UI
 * 在单实例窗口上直接劫持并阻断 indexedDB、localStorage 等底层持久化 API。
 * 限制了 App 本身的 API 调用权限，但由于宿主注入的 SDK 钩子 (如 useFileSystem)
 * 运行在宿主闭包上下文中，因此不受该限制影响，完美实现"特权通行"。
 */
let ghostIframeInstance = null;
const getGhostSandbox = () => {
  // 若轻量化已经建立了，直接共用该 window，不再重复创建幽灵 iframe。
  const sharedIframe = document.getElementById('kernel-shared-js-sandbox');
  if (sharedIframe) {
    return sharedIframe.contentWindow;
  }

  if (ghostIframeInstance) return ghostIframeInstance;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = 'kernel-ghost-sandbox';
  document.body.appendChild(iframe);
  ghostIframeInstance = iframe.contentWindow;

  //拦截原生敏感 API，强迫 App 使用系统 SDK 钩子
  RESTRICTED_STORAGE_APIS.forEach(api => {
    try {
      Object.defineProperty(ghostIframeInstance, api, {
        get: () => {
          throw new Error(`拒绝直接访问原生 API \`${api}\`。请使用 SDK.System.${api}`);
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

/** 结构化错误面板：吃 renderWindow 的编译期 errorDetail（phase/loc/stack）与运行期 error + componentStack */
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

/**
 * 故障隔离边界 (ErrorBoundary)
 * 核心功能：
 * 1. 自动重试机制：3次 reStartApp -> 1次 forceReStartApp -> 停止。
 * 2. 美化的异常显示 UI。
 * 3. 拦截子应用崩溃，保护主系统存活。
 * 4. 透传 React 组件树调用栈（componentStack）到错误详情面板。
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      componentStack: null,
      retryCount: 0,
      isRetrying: false,
      retryDelay: 1000,
      showDetail: false,
      // 查看源码模态框开关
      showSource: false,
      copied: false
    };
    this.retryTimer = null;
    this.maxRetryCount = 3;
    // 同一错误 5s 内只允许触发一次自动重试
    // 避免崩溃应用以毫秒级重新渲染->再崩溃，把主线程烧掉
    this._lastCatchAt = 0;
  }

  static getDerivedStateFromError(error) {
    // componentStack 在 getDerivedStateFromError 阶段拿不到，由 componentDidCatch 补充
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 保存 React 组件树调用栈，供错误 UI 展示
    this.setState({ componentStack: info?.componentStack || null });

    if (this.state.retryCount > this.maxRetryCount) {
      return;
    }

    const now = Date.now();
    if (now - this._lastCatchAt < 5000 && this.state.retryCount > 0) {
      // 5s 内重复崩溃，跳过本次自动重试，直接进入最终错误界面（含操作按钮）
      this.setState({ isRetrying: false });
      return;
    }
    this._lastCatchAt = now;

    // 只要当前不在重试倒计时中，就触发重试
    if (!this.state.isRetrying) {
      this.handleRetry();
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    const { reStartApp, forceReStartApp, pid } = this.props;

    this.setState({ isRetrying: true });

    // 计算延迟：前 3 次软重启（指数退避），第 4 次硬重启
    const isHardRetry = retryCount === this.maxRetryCount;
    const delay = isHardRetry ? 500 : this.state.retryDelay * Math.pow(2, retryCount);


    this.retryTimer = setTimeout(() => {
      // 必须在回调里重置 hasError 为 false，
      // 这样 render() 才会重新尝试渲染 this.props.children
      this.setState({
        hasError: false,
        isRetrying: false,
        retryCount: retryCount + 1,
        error: null,
        componentStack: null
      }, () => {
        if (isHardRetry) {
          forceReStartApp?.();
        } else {
          reStartApp?.();
        }
      });
    }, delay);
  };

  handleManualRetry = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.setState({
      hasError: false,
      error: null,
      componentStack: null,
      retryCount: 0,
      isRetrying: false,
      showDetail: false
    }, () => {
      this.props.forceReStartApp?.();
    });
  };

  handleKillProcess = () => {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.props.onKill?.(this.props.pid);
  };

  handleReloadSystem = () => {
    if (confirm('确定要重启整个系统吗？')) {
      window.location.reload();
    }
  };

  toggleDetail = () => {
    this.setState(prev => ({ showDetail: !prev.showDetail }));
  };

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
      `[应用错误] PID: ${this.props.pid}`,
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

  handleViewSource = () => {
    this.setState({ showSource: true });
  };

  handleCloseSource = () => {
    this.setState({ showSource: false });
  };

  componentDidUpdate(prevProps) {
    if (prevProps.pid !== this.props.pid) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.setState({
        hasError: false,
        error: null,
        componentStack: null,
        retryCount: 0,
        isRetrying: false,
        showDetail: false
      });
    }
  }

  renderRetryingUI() {
    const { copied } = this.state;
    const btnBase = { padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: 'none' };
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', textAlign: 'center' }}>
        <div style={{ padding: '40px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #f0f0f0', borderTopColor: '#1890ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h3 style={{ margin: '0 0 10px', color: '#1f1f1f' }}>正在自动修复应用</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>正在进行第 {this.state.retryCount + 1} 次尝试...</p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '20px' }}>
            <button
              onClick={() => { this.props.onRecompile?.(); }}
              style={{ ...btnBase, background: '#ff4d4f', color: 'white' }}
              title="清除编译缓存并重新走 Babel 编译"
            >
              重新编译
            </button>
            <button onClick={this.handleManualRetry} style={{ ...btnBase, background: '#1890ff', color: 'white' }}>立即重试</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
            {/* <button onClick={this.handleViewSource} style={{ ...btnBase, background: 'white', border: '1px solid #d9d9d9', color: '#1f1f1f' }}>查看源码</button> */}
            <button onClick={this.handleCopyError} style={{ ...btnBase, background: 'white', border: '1px solid #d9d9d9', color: '#1f1f1f' }}>
              {copied ? '✓ 已复制' : '复制错误信息'}
            </button>
            <button onClick={this.handleKillProcess} style={{ ...btnBase, background: 'white', border: '1px solid #d9d9d9', color: '#1f1f1f' }}>关闭应用</button>
          </div>
        </div>
      </div>
    );
  }

  renderErrorUI() {
    const { error, componentStack, showSource, copied } = this.state;
    // 尝试将 error 适配为 ErrorDetailPanel 所需的 errorDetail 格式
    const errorDetail = error?.errorDetail || {
      phase: 'runtime',
      message: error?.message || String(error || '未知运行时错误'),
      stack: error?.stack || '',
      loc: '',
    };

    // 提取 APP 原始源码（单文件为字符串，bundle 为 { key: code } 对象）
    const rawContent = this.props.resource?.[ENV_KEY_CONTENT];
    const sourceText = typeof rawContent === 'string'
      ? rawContent
      : (rawContent && typeof rawContent === 'object')
        ? Object.entries(rawContent).map(([k, v]) => `// ===== ${k} =====\n${v}`).join('\n\n')
        : '（无源码可查看）';

    const btnBase = { padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', border: 'none' };

    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: '20px', boxSizing: 'border-box', overflow: 'auto' }}>
        <div style={{ maxWidth: '600px', width: '100%', background: 'white', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '50px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px', color: '#1f1f1f' }}>应用进程已停止响应</h3>
          <p style={{ color: '#666', marginBottom: '20px', fontSize: '13px' }}>
            PID: <strong>{this.props.pid}</strong>，尝试多次修复失败。可尝试重新编译或检查源码。
          </p>

          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
            <ErrorDetailPanel
              errorDetail={errorDetail}
              componentStack={componentStack}
              title="运行时崩溃详情"
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
            <button
              onClick={() => { this.props.onRecompile?.(); }}
              style={{ ...btnBase, background: '#ff4d4f', color: 'white' }}
              title="清除编译缓存并重新走 Babel 编译"
            >
              重新编译
            </button>
            <button onClick={this.handleManualRetry} style={{ ...btnBase, background: '#1890ff', color: 'white' }}>再次重试</button>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {/* <button onClick={this.handleViewSource} style={{ ...btnBase, background: 'white', border: '1px solid #d9d9d9', color: '#1f1f1f' }}>查看源码</button> */}
            <button onClick={this.handleCopyError} style={{ ...btnBase, background: 'white', border: '1px solid #d9d9d9', color: '#1f1f1f' }}>
              {copied ? '✓ 已复制' : '复制错误信息'}
            </button>
            <button onClick={this.handleKillProcess} style={{ ...btnBase, background: 'white', border: '1px solid #d9d9d9', color: '#1f1f1f' }}>关闭应用</button>
            <button onClick={this.handleReloadSystem} style={{ ...btnBase, background: 'white', border: '1px solid #d9d9d9', color: '#cf1322' }}>重启系统</button>
          </div>
        </div>

        {/* 查看源码模态框 */}
        {showSource && (
          <div
            onClick={this.handleCloseSource}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: 'white', borderRadius: '12px', width: '80%', maxWidth: '720px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 8px 30px rgba(0,0,0,0.2)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                <strong style={{ color: '#1f1f1f' }}>应用源码</strong>
                <button onClick={this.handleCloseSource} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#666', lineHeight: 1 }}>×</button>
              </div>
              <pre style={{ margin: 0, padding: '16px 18px', overflow: 'auto', fontSize: '12px', lineHeight: '1.6', color: '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {sourceText}
              </pre>
            </div>
          </div>
        )}
      </div>
    );
  }
  render() {
    const { hasError, isRetrying } = this.state;
    // 报错且不在自动重试中 → 显示最终错误 UI（含全部操作按钮）
    if (hasError && !isRetrying) {
      return this.renderErrorUI();
    }
    // 正在自动重试中 → 显示重试中 UI
    if (isRetrying) {
      return this.renderRetryingUI();
    }
    return this.props.children;
  }
}

/** Iframe 样式注入提供者：为挂载点内部建一个独立的 Emotion 缓存上下文 */
const IframeStyleProvider = memo(({ children, containerNode }) => {
  const [cache, setCache] = useState(null);

  useEffect(() => {
    if (!containerNode) return;
    const targetDoc = containerNode.ownerDocument;
    const targetHead = targetDoc.head;

    const myCache = createCache({
      key: 'iframe-mui',
      container: targetHead,
      prepend: true,
      speedy: false
    });

    setCache(myCache);
  }, [containerNode]);

  if (!cache) return null;

  return <CacheProvider value={cache}>{children}</CacheProvider>;
});


/** 核心沙箱组件：物理隔离并同步系统样式；CSS contain 用于缩小重排影响范围 */
const IframeSandbox = memo(({ css, pid, onMount, isVisible = true }) => {
  const frameRef = useRef(null);
  const unregisterStyleSyncRef = useRef(null);
  // 缓存最近一次 css，避免相同字符串重复 set innerHTML 触发 iframe 全量重排
  const lastCssRef = useRef('');

  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    const win = frameRef.current?.contentWindow;
    if (!doc) return;
    let keyHandler = null;
    let mouseHandler = null;

    const init = () => {
      // 同步在物理隔离 iframe 环境下应用 JS 限制拦截
      if (win) {
        RESTRICTED_STORAGE_APIS.forEach(api => {
          try {
            if (!Object.getOwnPropertyDescriptor(win, api)?.get) {
              Object.defineProperty(win, api, {
                get: () => { throw new Error(`物理沙箱拒绝直接访问 \`${api}\`。请使用 SDK.System.${api}。`); },
                configurable: false
              });
            }
          } catch (e) {}
        });

        // iframe 内部按键转发回父窗口，触发 DeskBook 的全局监听，解决内部焦点让桌面快捷键失效
        // 抽出 handler 引用：组件卸载时要移除监听
        keyHandler = (e) => {
          window.parent.postMessage({
            type: 'SUKIN_GLOBAL_KEY',
            eventPayload: {
              ctrlKey: e.ctrlKey,
              altKey: e.altKey,
              code: e.code
            }
          }, '*');
        };
        win.addEventListener('keydown', keyHandler);

        // 将 iframe 内部的 mousedown 事件转发回父窗口，以触发窗口聚焦
        // 解决物理沙箱模式下点击 iframe 内部内容不会冒泡到宿主 document 的问题
        mouseHandler = (e) => {
          window.parent.postMessage({
            type: 'SUKIN_GLOBAL_MOUSE',
            eventPayload: {
              type: 'mousedown',
              clientX: e.clientX,
              clientY: e.clientY
            }
          }, '*');
        };
        win.addEventListener('mousedown', mouseHandler);
      }

      unregisterStyleSyncRef.current = registerSandboxDoc(doc);

      if (!doc.getElementById('sandbox-layout')) {
        const style = doc.createElement('style');
        style.id = 'sandbox-layout';
        style.innerHTML = `
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            // overflow: hidden;
            background: transparent;
            /* 关键:contain: strict 属性彻底物理隔离，限制重排影响范围 */
            contain: strict;
          }
          #app-mount {
            height: 100%;
            width: 100%;
            position: relative;
            /* 关键：contain 属性 */
            contain: layout style paint;
          }
          /* 标记可拖拽区域 */
          [data-drag-handle], .window-header, .app-header {
            cursor: move;
            user-select: none;
          }
        `;
        doc.head.appendChild(style);
      }
      let root = doc.getElementById('app-mount');
      if (!root) {
        root = doc.createElement('div');
        root.id = 'app-mount';
        doc.body.appendChild(root);
      }
      onMount(root);
    };

    if (doc.readyState === 'complete') init();
    else frameRef.current.onload = init;

    return () => {
      // 注销全局样式同步 + 移除 keydown/mousedown 监听，防止泄漏
      if (unregisterStyleSyncRef.current) {
        unregisterStyleSyncRef.current();
        unregisterStyleSyncRef.current = null;
      }
      if (win && keyHandler) {
        try { win.removeEventListener('keydown', keyHandler); } catch (e) {}
      }
      if (win && mouseHandler) {
        try { win.removeEventListener('mousedown', mouseHandler); } catch (e) {}
      }
    };
  }, [pid, onMount]);

  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || css == null) return;

    // 增加 ref 层短路，避免父级因引用变化导致的无意义 set
    if (lastCssRef.current === css) return;
    lastCssRef.current = css;

    let styleTag = doc.getElementById(`runtime-css-${pid}`);
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = `runtime-css-${pid}`;
      doc.head.appendChild(styleTag);
    }

    if (styleTag.innerHTML !== css) {
      styleTag.innerHTML = css;
    }
  }, [css, pid]);

  return isVisible ? (
    <iframe
      ref={frameRef}
      title={`sandbox-${pid}`}
      style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
    />
  ) : null;
}, (prev, next) => {
  // 注意 onMount 必须由父级 useCallback 稳定引用，否则等于无 memo
  return prev.pid === next.pid && prev.css === next.css && prev.onMount === next.onMount && prev.isVisible === next.isVisible;
});

/** 内部组件渲染器：modules / component 缺失时兜底，不让 null 页面模块抛 TypeError */
const AppInternalRenderer = memo(({ modules, resource, commonProps, currentPath, pid }) => {
  if (!modules) return null;
  if (!resource.isBundle) {
    const Main = modules['main']?.Component;
    return Main ? (
      <div id={`proc-${pid}`} style={{ height: '100%' }}>
        <Main {...commonProps} PageComponent={() => <div />} />
      </div>
    ) : null;
  }
  const viewKey = resolveAppEntries(resource[ENV_KEY_META_INFO]).view;
  const Layout = modules[viewKey]?.Component;
  if (!Layout) return <div style={{ padding: '16px', color: '#cf1322', background: '#fff2f0' }}>子应用入口框架 {viewKey} 加载失败</div>;
  // 嵌套路由解析,将 currentPath 规范化为模块 key，支持 pages/about、./pages/about/index 等
  const pageKey = resolveModuleKey(currentPath, Object.keys(modules));
  const PageObj = modules[pageKey];
  const RawPage = PageObj?.Component || (() => <div style={{ padding: '16px' }}>404: 页面 [{currentPath}] 加载失败或未找到</div>);
  const ConnectedPage = (props) => <RawPage {...commonProps} {...props} />;
  return (
    <div id={`proc-${pid}`} style={{ height: '100%' }}>
      <Layout {...commonProps} PageComponent={ConnectedPage} />
    </div>
  );
}, (prev, next) => {
  return prev.pid === next.pid
      && prev.modules === next.modules
      && prev.resource === next.resource
      && prev.currentPath === next.currentPath
      && prev.commonProps === next.commonProps;
});


// 因为 worker 通过 postMessage 传递过来的 state 每次全是新的对象引用（包括深层级）。
// 高频滚动如果引发了无效 state 更新，浅比较挡不住，会引发灾难性的全量重新渲染。
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
};

/** 动态渲染器：应用资源的动态编译、SDK 注入与生命周期管理 */
const DynamicRenderer =({
  resource, state, dispatch, pid, isSystemApp, onFocus,
  forceReStartApp, reStartApp, onKill ,generateAppSetting, windowControls, ref:renderRef, isVisible
}) => {
  const [modules, setModules] = useState(null)
  // 编译/运行阶段的错误列表，每条对应一个模块的结构化错误
  // 格式：Array<{ key: string, errorDetail: object, phase: string }>
  const [compileErrors, setCompileErrors] = useState([])
  // 编译版本号：递增后强制重新编译（清除缓存重新走 Babel），供错误边界"重新编译"使用
  const [compileVersion, setCompileVersion] = useState(0)

  const [iframeMountNode, setIframeMountNode] = useState(null);
  // 物理沙箱模式下，iframe.contentWindow 作为 JS 执行上下文
  // 确保 globalThis/document/window 全部指向 iframe 内部，与 createPortal 的 UI 渲染位置一致
  const iframeContentWinRef = useRef(null);
  // portal 需要一个 state 来触发 createPortal 的重挂载（只在 mount 时设一次）
  const [portalMountNode, setPortalMountNode] = useState(null);
  const stableOnFocus = useCallback(() => {
    onFocus(pid);
  }, [onFocus, pid]);

  const handleIframeMount = useCallback((node) => {
    setIframeMountNode(node);
    // mountNode 是 iframe 内部的 #app-mount div
    // ownerDocument.defaultView === iframe.contentWindow（物理沙箱的 JS 执行环境）
    iframeContentWinRef.current = node.ownerDocument.defaultView;
    setPortalMountNode(node);
  }, []);

  const handleRecompile = useCallback(() => {
    clearCompileCache();
    setCompileVersion(v => v + 1);
  }, []);

  // 使用导入的工厂函数来动态创建为当前进程定制的 SDK
  // dispatch 在 kernel 单例下其实是稳定的，但保险起见用 ref 锁住，
  // 避免外部偶尔换 dispatch 引用就重建整个 SDK 并导致下面的编译副作用重跑
  const dispatchRef = useRef(dispatch);
  useEffect(() => { dispatchRef.current = dispatch; }, [dispatch]);
  const stableDispatch = useCallback((...args) => dispatchRef.current?.(...args), []);

  // getResource() 每次可能给新引用，而编译只该在内容真正变化时触发：用 resourceId + content 浅比较替代引用比较
  const stableResourceRef = useRef(resource);
  const stableResource = useMemo(() => {
    if (stableResourceRef.current === resource) return stableResourceRef.current;
    const prevId = stableResourceRef.current?.[ENV_KEY_RESOURCE_ID];
    const nextId = resource?.[ENV_KEY_RESOURCE_ID];
    if (prevId !== nextId) {
      stableResourceRef.current = resource;
      return resource;
    }
    // 同一个 resourceId，比较 content 引用（编译结果缓存在 resource 对象上）
    const prevContent = stableResourceRef.current?.content;
    const nextContent = resource?.content;
    if (prevContent !== nextContent) {
      stableResourceRef.current = resource;
      return resource;
    }
    // 内容没变，保持旧引用避免触发下游依赖
    return stableResourceRef.current;
  }, [resource]);

  // 提取寄生模式标识（基于稳定化的 resource，避免无谓重计算）
  const isParasitism = stableResource?.[ENV_KEY_META_INFO]?.isParasitism === true;
  // 桥接模式判定：单 Iframe 模式或主线程 Virtual Worker 轻量模式下且非纯寄生
  const useBridgeMode = (generateAppSetting?.singleIframe || generateAppSetting?.useVirtualWorker || false) && !isParasitism;

  const instanceSDK = useMemo(() => {
    return createSdkForInstance(stableDispatch, pid, isSystemApp, windowControls);
  }, [stableDispatch, pid, isSystemApp, windowControls]);

  // 视图入口由发布时固化的 entries 决定；后缀是 .html 即文档档，载荷自治渲染，不进编译管线
  const viewEntryKey = resolveAppEntries(stableResource?.[ENV_KEY_META_INFO]).view;
  const isDocumentApp = !!stableResource?.isBundle && isHtmlKey(viewEntryKey);

  useEffect(() => {
    if (!stableResource || isDocumentApp) return
    let cancelled = false; // 防止 resource 切换时旧编译结果覆盖新结果
    // 编译开始前清空上一次的编译错误，避免旧错误残留误导开发者
    setCompileErrors([]);

    const loadAll = async () => {
      const resultMap = {};
      // 收集本次编译过程中产生的所有模块错误，统一在编译结束后 setState
      const errorList = [];

      // JS 执行上下文选择：
      // - 桥接 / Virtual Worker 模式：获取唯一的全局共享沙箱（隐藏 Iframe，UI 在宿主 DOM 渲染）
      // - 寄生模式：宿主 window （UI 直接渲染在宿主 DOM）
      // - 物理沙箱模式：iframe.contentWindow （确保 UI 与 JS 在同一个 iframe Context 下渲染）
      const sandboxWin = useBridgeMode
        ? getGhostSandbox()
        : isParasitism
          ? window
          : iframeContentWinRef.current;
      // 物理沙箱模式下，必须等 iframe mount 完成后才有 contentWindow
      if (!isParasitism && !useBridgeMode && !sandboxWin) return;

      // 模块注册表：{ key: { factory, exports } }，供 require 解析相对路径导入
      const moduleRegistry = {};
      // 收集所有模块 key，供 require 的 resolveModulePath 匹配候选
      const moduleKeys = [];

      /**
       * 第一阶段：编译单个模块代码，构建 moduleRegistry（不执行）
       * 所有阶段（Babel 转译、Function 构建）的错误均被结构化捕获，
       * 并以友好的错误 Component 回退，同时收集到 errorList 供页面展示。
       */
      const compileModule = async (code, key, precompiled = false) => {
        try {
          // CSS 不走 Babel，走专用 CSS 模块生成器（普通 .css 副作用导入 / .module.css CSS Modules）
          const isCss = /\.css$/.test(key);
          if (isCss) {
            const cssRes = createCssModule(code, key);
            moduleRegistry[key] = { factory: cssRes.factory, exports: null };
            moduleKeys.push(key);
            return true;
          }
          // 传入 sandboxWin 的 Function 构造器，使 factory 内部的 globalThis 指向该沙箱 window
          // 物理沙箱模式下 globalThis=iframe.contentWindow → document=iframe.document
          let res = await compileSourceAsync({ sourceCode: code, pid, targetFunctionConstructor: sandboxWin?.Function, module: key, precompiled })
          // 预编译短路失败时自动降级，用原始 JSX 重新走 Babel 编译兜底
          if (precompiled && res?.error) {
            console.warn(`[渲染] 预编译模块 ${key} 执行失败，降级为 Babel 编译:`, res?.error)
            res = await compileSourceAsync({ sourceCode: code, pid, targetFunctionConstructor: sandboxWin?.Function, module: key, precompiled: false })
          }
          if (!res || res.error) {
            // 收集编译阶段错误（含结构化 errorDetail）
            const detail = res?.errorDetail || { phase: 'compile', message: res?.error || '解析错误', stack: '', loc: '' };
            errorList.push({ key, errorDetail: detail });
            return false;
          }
          moduleRegistry[key] = { factory: res.factory, exports: null };
          moduleKeys.push(key);
          return true;
        } catch (e) {
          // 收集未预期的顶层异常
          const detail = {
            phase: 'unknown',
            message: e.message,
            stack: e.stack || e.message,
            loc: '',
            raw: e
          };
          errorList.push({ key, errorDetail: detail });
          return false;
        }
      }

      // 第二阶段：执行单个模块，返回 { Component, style }
      const runModule = (key) => {
        const mod = moduleRegistry[key];
        if (!mod) {
          // 编译失败：返回错误组件
          const detail = errorList.find(e => e.key === key)?.errorDetail || { phase: 'compile', message: '模块编译失败', stack: '', loc: '' };
          return {
            Component: () => (
              <ErrorDetailPanel
                errorDetail={detail}
                title={`编译失败 [${key}]`}
                moduleKey={key}
              />
            ),
            style: ''
          };
        }
        // 已求值过则复用缓存；正在求值中（循环依赖）也直接返回半成品 exports，
        // 不能再进一次 factory —— 那会沿着 A→B→A 递归到爆栈
        if (mod.executed || mod.exports) {
          const cached = mod.exports || {};
          return { Component: cached.default || cached, style: cached.style || '' };
        }
        const exports = (mod.exports = {});
        try {
          // 将 factory 绑定到沙箱 window 上执行，并传入完整模块上下文
          // 此时如果 App 尝试使用 this.indexedDB 将直接抛出拦截异常
          // 而 instanceSDK.System.localStorage 等 API 因为是代理，可以安全、隔离地使用
          // module 实参用注册表里的 mod 本体，module.exports = xxx 才写得进去（与 worker 侧同语义）
          mod.factory.call(sandboxWin, mod, exports, instanceSDK, moduleRegistry, key, moduleKeys)
        } catch (evalError) {
          mod.exports = null; // 求值失败不留半成品，下一次执行重来
          // 收集 factory 执行阶段错误
          const detail = {
            phase: 'runtime',
            message: evalError.message,
            stack: evalError.stack || evalError.message,
            loc: '',
            raw: evalError
          };
          errorList.push({ key, errorDetail: detail });
          return {
            Component: () => (
              <ErrorDetailPanel
                errorDetail={detail}
                title={`初始化运行时异常 [${key}]`}
                moduleKey={key}
              />
            ),
            style: ''
          };
        }
        mod.executed = true;
        const done = mod.exports || {};
        return { Component: done.default || done, style: done.style || '' }
      }

      // 系统 APP 强制走 JSX 编译，保证可调试/可审计
      const usePrecompiled = !isSystemApp && !!stableResource[ENV_KEY_CONTENT_PRECOMPILED];
      // 收集所有待编译模块：{ key: { code, precompiled } }
      const pendingModules = [];
      if (!stableResource.isBundle) {
        const precompiledCode = usePrecompiled ? stableResource[ENV_KEY_CONTENT_PRECOMPILED] : null;
        pendingModules.push({ key: 'main', code: precompiledCode || stableResource.content, precompiled: !!precompiledCode });
      } else {
        const files = Object.entries(stableResource.content)
        const precompiledFiles = usePrecompiled ? (stableResource[ENV_KEY_CONTENT_PRECOMPILED] || {}) : {};
        for (const [key, code] of files) {
          // 文档档、资源档与数据文本档不进编译管线：混装包里它们只是被子文档引用的载荷，
          // 送进 Babel 会产出一条假编译错误
          if (!isCompiledKey(key, code)) continue;
          if (typeof code === 'string') {
            const precompiledCode = precompiledFiles[key];
            pendingModules.push({ key, code: precompiledCode || code, precompiled: !!precompiledCode });
          }
        }
      }

      // 第一阶段：编译所有模块，构建 moduleRegistry
      for (const { key, code, precompiled } of pendingModules) {
        await compileModule(code, key, precompiled);
      }
      // 第二阶段：执行所有模块，构建 resultMap
      // 辅逻辑入口由 worker 侧模块运行时求值，UI 侧只保留编译产物，避免副作用执行两遍
      const auxLogicKeys = resolveAppEntries(stableResource[ENV_KEY_META_INFO]).logicAux;
      for (const { key } of pendingModules) {
        if (auxLogicKeys.includes(key)) continue;
        resultMap[key] = runModule(key);
      }
      if (!cancelled) {
        setModules(resultMap)
        // 统一更新编译错误列表，供外层使用（如日志、监控等）
        if (errorList.length > 0) {
          setCompileErrors(errorList);
        }
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, [resource, iframeMountNode, compileVersion]);

  // CSS 提取器：增加 Boolean 强过滤和默认值，避免 null page 引发的 style 读取异常
  const combinedCss = useMemo(() => {
    // 文档档的样式只活在子文档里：scopeCss 会给 at-rule 的 prelude 一起加前缀，整块会失效
    if (!modules || isDocumentApp) return '';
    const rawCss = Object.values(modules)
      .filter(Boolean)
      .map(m => m.style || '')
      .join('\n');
    return scopeCss(rawCss, pid);
  }, [modules, pid, isDocumentApp]);

  // state 深比较worker postMessage 反序列化每次都得到新引用，
  // 但内容可能和上次完全相同。这里把"等价 state"折叠为同一引用，下游 memo 才能短路
  const stableStateRef = useRef(state);
  const stableState = useMemo(() => {
    if (deepEqual(stableStateRef.current, state)) {
      return stableStateRef.current;
    }
    stableStateRef.current = state;
    return state;
  }, [state]);

  const commonProps = useMemo(() => {
    // 由于 state 是从 Worker (postMessage) 传递过来的，
    // 本身已经是深拷贝，直接使用可避免引用污染，同时减少递归克隆带来的性能损耗
    return {
      state: stableState,
      handleFocus: stableOnFocus,
      dispatch: stableDispatch,
      pid,
      reStartApp: () => reStartApp({ pid }),
      forceReStartApp: () => forceReStartApp({ pid }),
      navigate: instanceSDK.API.navigate,
      fetch:instanceSDK.API.fetch
    }
    //把 dispatch 替换为 stableDispatch，并使用 stableState
  }, [stableState, stableOnFocus, stableDispatch, pid, instanceSDK, reStartApp, forceReStartApp]);
  const currentPath = stableState?.router?.path || 'home';

  // 加载中占位组件（解决物理沙箱死锁：不能提前return，必须让IframeSandbox先挂载）
  const loadingPlaceholder = (
    <div style={{ height: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#999' }}>
      加载中...
    </div>
  );

  return (
    <div
      style={{ height: '100%', width: '100%' }}
      onMouseDown={stableOnFocus}
      ref={renderRef}
    >
      {/*
          ErrorBoundary 此时接收了重试函数，
          负责在 AppInternalRenderer 渲染失败时执行重试策略。
      */}
      <ErrorBoundary
        pid={pid}
        state={stableState}
        reStartApp={() => reStartApp({ pid })}
        forceReStartApp={() => forceReStartApp({ pid })}
        onKill={onKill}
        onRecompile={handleRecompile}
        resource={stableResource}
      >
        { isDocumentApp ? (
          // 文档档模式：内容包里的 HTML 合成成同源子文档，样式与脚本都在子文档内自洽，
          // 既不走 IframeSandbox（否则要等 iframe mount 才有 JS 上下文，而这里根本不需要）也不走 portal
          <div id={`proc-${pid}`} style={{ height: '100%' }}>
            {isVisible !== false && (
              <HtmlAppFrame
                pid={pid}
                htmlKey={viewEntryKey}
                files={stableResource[ENV_KEY_CONTENT]}
                sdk={instanceSDK}
              />
            )}
          </div>
        ) : (isParasitism || useBridgeMode) ? (
          // 寄生模式、桥接模式或虚拟 Worker 沙箱下：UI 直接在宿主侧渲染
          <>
            {combinedCss && (
              <style id={`runtime-css-${pid}`} dangerouslySetInnerHTML={{ __html: combinedCss }} />
            )}
            {modules ? (
              <AppInternalRenderer
                 modules={modules}
                 resource={stableResource}
                 commonProps={commonProps}
                 currentPath={currentPath}
                 pid={pid}
              />
            ) : loadingPlaceholder}
          </>
        ) : (
          // 物理沙箱模式：UI 泵入隔离 Iframe
          // IframeSandbox必须先渲染，iframe挂载后iframeContentWinRef才可用，loadAll()才能编译
          <>
            <IframeSandbox pid={pid} css={combinedCss} onMount={handleIframeMount} isVisible={isVisible} />
            {portalMountNode && createPortal(
              <IframeStyleProvider key={pid} containerNode={portalMountNode}>
                {modules ? (
                  <AppInternalRenderer
                     modules={modules}
                     resource={stableResource}
                     commonProps={commonProps}
                     currentPath={currentPath}
                     pid={pid}
                  />
                ) : loadingPlaceholder}
              </IframeStyleProvider>,
              portalMountNode
            )}
          </>
        )}
      </ErrorBoundary>
    </div>
  );
}
const memoEqual = (prevProps, nextProps) => {
  // state 内部已做 deepEqual 折叠，内容相同时引用不变
  // resource 内部已做 stableResource 稳定化
  return prevProps.state === nextProps.state &&
    prevProps.resource === nextProps.resource &&
    prevProps.pid === nextProps.pid &&
    prevProps.isSystemApp === nextProps.isSystemApp &&
    prevProps.generateAppSetting === nextProps.generateAppSetting &&
    prevProps.onFocus === nextProps.onFocus &&
    prevProps.onKill === nextProps.onKill
}
export default memo(DynamicRenderer, memoEqual);
