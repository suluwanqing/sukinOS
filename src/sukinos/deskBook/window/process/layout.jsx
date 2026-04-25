import React, { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import createCache from '@emotion/cache'
import { CacheProvider } from '@emotion/react'
import { compileSourceAsync, scopeCss } from '@/sukinos/utils/process/renderWindow'
import { ENV_KEY_META_INFO } from '@/sukinos/utils/config'
import { createSdkForInstance } from "@/sukinos/resources/sdk"

/**
 * 幽灵沙箱管理器 - 单例模式
 * 仅作为 JS 执行上下文，不负责显示 UI
 * 在单实例窗口上直接劫持并阻断 indexedDB、localStorage 等底层持久化 API。
 * 限制了 App 本身的 API 调用权限，但由于宿主注入的 SDK 钩子 (如 useFileSystem)
 * 运行在宿主闭包上下文中，因此不受该限制影响，完美实现“特权通行”。
 */
let ghostIframeInstance = null;
const getGhostSandbox = () => {
  if (ghostIframeInstance) return ghostIframeInstance;
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = 'kernel-ghost-sandbox';
  document.body.appendChild(iframe);
  ghostIframeInstance = iframe.contentWindow;

  //拦截原生敏感 API，强迫 App 使用系统 SDK 钩子
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
 * 故障隔离边界 (ErrorBoundary)
 * 核心功能：
 * 1. 自动重试机制：3次 reStartApp -> 1次 forceReStartApp -> 停止。
 * 2. 美化的异常显示 UI。
 * 3. 拦截子应用崩溃，保护主系统存活。
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
      retryDelay: 1000,
      showDetail: false
    };
    this.retryTimer = null;
    this.maxRetryCount = 3;
  }

  static getDerivedStateFromError(error) {
    // 捕获错误，渲染备用 UI
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // 如果已经达到最大重试次数，不再触发自动重试逻辑
    if (this.state.retryCount > this.maxRetryCount) {
      // console.error(`进程 [${this.props.pid}] 失败：已达到最大重试次数`);
      return;
    }

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

    // console.warn(`进程 [${pid}]：正在准备第 ${retryCount + 1} 次自动修复 (${isHardRetry ? '硬重启' : '软重启'})，延迟 ${delay}ms...`);

    this.retryTimer = setTimeout(() => {
      //必须在回调里重置 hasError 为 false，
      // 这样 render() 才会重新尝试渲染 this.props.children
      this.setState({
        hasError: false,
        isRetrying: false,
        retryCount: retryCount + 1,
        error: null
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

  componentDidUpdate(prevProps) {
    if (prevProps.pid !== this.props.pid) {
      if (this.retryTimer) clearTimeout(this.retryTimer);
      this.setState({
        hasError: false,
        error: null,
        retryCount: 0,
        isRetrying: false,
        showDetail: false
      });
    }
  }

  // 渲染重试中的 UI（Loading 状态）
  renderRetryingUI() {
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', textAlign: 'center' }}>
        <div style={{ padding: '40px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #f0f0f0', borderTopColor: '#1890ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h3 style={{ margin: '0 0 10px', color: '#1f1f1f' }}>正在自动修复应用</h3>
          <p style={{ color: '#666', fontSize: '14px' }}>正在进行第 {this.state.retryCount + 1} 次尝试...</p>
          <button onClick={this.handleKillProcess} style={{ marginTop: '20px', padding: '8px 20px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px', background: 'white' }}>取消并关闭</button>
        </div>
      </div>
    );
  }

  // 渲染最终失败 UI
  renderErrorUI() {
    const { error, showDetail } = this.state;
    return (
      <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', padding: '20px' }}>
        <div style={{ maxWidth: '500px', background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: '50px', marginBottom: '20px' }}>⚠️</div>
          <h3>应用进程已停止响应</h3>
          <p style={{ color: '#666', marginBottom: '20px' }}>PID: {this.props.pid} 尝试多次修复失败。请检查网络或联系开发者。</p>

          <div style={{ textAlign: 'left', marginBottom: '20px' }}>
             <button onClick={this.toggleDetail} style={{ background: 'none', border: 'none', color: '#cf1322', cursor: 'pointer', fontSize: '12px' }}>
               {showDetail ? '▼ 隐藏详情' : '▶ 查看错误堆栈'}
             </button>
             {showDetail && (
               <pre style={{ background: '#fff2f0', padding: '10px', borderRadius: '4px', fontSize: '11px', maxHeight: '150px', color: '#cf1322', marginTop: '10px' }}>
                 {error?.stack || error?.message}
               </pre>
             )}
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button onClick={this.handleManualRetry} style={{ padding: '10px 20px', background: '#1890ff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>再次重试</button>
            <button onClick={this.handleKillProcess} style={{ padding: '10px 20px', background: 'white', border: '1px solid #d9d9d9', borderRadius: '4px', cursor: 'pointer' }}>关闭应用</button>
          </div>
        </div>
      </div>
    );
  }
  render() {
    const { hasError, isRetrying, retryCount } = this.state;
    // 如果已经报错且重试次数已满
    if (hasError && retryCount > this.maxRetryCount) {
      return this.renderErrorUI();
    }
    // 如果报错了且正在等待下次重试定时器触发
    if (hasError || isRetrying) {
      return this.renderRetryingUI();
    }
    // 正常情况渲染子组件
    return this.props.children;
  }
}

/**
 * Iframe 样式注入提供者
 * 为挂载点内部创建一个独立的 Emotion 缓存上下文。
 */
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


/**
 * 核心沙箱组件：物理隔离并同步系统样式
 * 添加 CSS contain 属性减少重排影响范围
 */
const IframeSandbox = memo(({ css, pid, onMount }) => {
  const frameRef = useRef(null);
  const syncDebounceRef = useRef(null);
  const syncedStylesRef = useRef(new Set());
  const syncStyles = useCallback((targetDoc) => {
    // 全量同步,主要是父的样式
    const parentStyles = document.querySelectorAll('link[rel="stylesheet"], style');

    parentStyles.forEach(style => {
      const styleId = style.id || style.getAttribute('data-styled');
      // 双重检查：缓存 + DOM
      if (styleId) {
        if (syncedStylesRef.current.has(styleId)) return;
        if (targetDoc.getElementById(styleId)) {
          syncedStylesRef.current.add(styleId);
          return;
        }
      }
      const clone = style.cloneNode(true);
      targetDoc.head.appendChild(clone);

      if (styleId) syncedStylesRef.current.add(styleId);
    });
  }, []);
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    const win = frameRef.current?.contentWindow;
    if (!doc) return;

    const init = () => {
      // 同步在物理隔离 iframe 环境下应用 JS 限制拦截
      if (win) {
        const restrictApis = ['indexedDB', 'localStorage', 'sessionStorage', 'openDatabase', 'caches'];
        restrictApis.forEach(api => {
          try {
            if (!Object.getOwnPropertyDescriptor(win, api)?.get) {
              Object.defineProperty(win, api, {
                get: () => { throw new Error(`物理沙箱拒绝直接访问 \`${api}\`。请使用 SDK.System.${api}。`); },
                configurable: false
              });
            }
          } catch (e) {}
        });

        // 解决 Iframe 内部焦点导致外部桌面快捷键失效的问题
        // 将 iframe 内部的按键事件强行转发回父窗口，以触发 DeskBook 中的全局监听
        win.addEventListener('keydown', (e) => {
          window.parent.postMessage({
            type: 'SUKIN_GLOBAL_KEY',
            eventPayload: {
              ctrlKey: e.ctrlKey,
              altKey: e.altKey,
              code: e.code
            }
          }, '*');
        });
      }

      syncStyles(doc);
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

    // 用防抖，减少同步频率
    const handleStyleChange = () => {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
      syncDebounceRef.current = setTimeout(() => syncStyles(doc), 100);
    };

    // 只监听新增，不监听删除和修改
    const observer = new MutationObserver((mutations) => {
      const shouldSync = mutations.some(m =>
        m.type === 'childList' &&
        m.addedNodes.length > 0 &&
        Array.from(m.addedNodes).some(node =>
          node.nodeName === 'STYLE' ||
          (node.nodeName === 'LINK' && node.rel === 'stylesheet')
        )
      );
      if (shouldSync) handleStyleChange();
    });

    observer.observe(document.head, { childList: true, subtree: false });

    return () => {
      observer.disconnect();
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    };
  }, [pid, onMount, syncStyles]);

  // 样式更新优化：只更新变化的部分
  useEffect(() => {
    const doc = frameRef.current?.contentDocument;
    if (!doc || !css) return;

    let styleTag = doc.getElementById(`runtime-css-${pid}`);
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = `runtime-css-${pid}`;
      doc.head.appendChild(styleTag);
    }

    // 只有内容变化时才更新
    if (styleTag.innerHTML !== css) {
      styleTag.innerHTML = css;
    }
  }, [css, pid]);

  return (
    <iframe
      key={pid}
      ref={frameRef}
      title={`sandbox-proc-${pid}`}
      loading="lazy"
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        willChange: 'transform',
        contain: 'strict'  // 优化：contain: strict 告诉浏览器这个元素内部变化不影响外部
      }}
    />
  );
}, (prev, next) => {
  return prev.pid === next.pid && prev.css === next.css;
});

/**
 * 内部组件渲染器
 */
const AppInternalRenderer = memo(({ modules, resource, commonProps, currentPath, pid }) => {
  if (!resource.isBundle) {
    const Main = modules['main']?.Component;
    return Main ? (
      <div id={`proc-${pid}`} style={{ height: '100%' }}>
        <Main {...commonProps} PageComponent={() => <div />} />
      </div>
    ) : null;
  }
  const Layout = modules['layout']?.Component;
  if (!Layout) return <div>资源 layout.jsx 丢失!</div>;
  const RawPage = modules[currentPath]?.Component || (() => <div>404: {currentPath}</div>);
  const ConnectedPage = (props) => <RawPage {...commonProps} {...props} />;
  return (
    <div id={`proc-${pid}`} style={{ height: '100%' }}>
      <Layout {...commonProps} PageComponent={ConnectedPage} />
    </div>
  );
});

/**
 * 动态渲染器
 * 负责应用资源的动态编译、SDK 注入及生命周期管理。
 */
const DynamicRenderer = memo(({
  resource, state, dispatch, pid, isSystemApp, onFocus,
  forceReStartApp, reStartApp, onKill ,generateAppSetting,ref:renderRef
}) => {
  const [modules, setModules] = useState(null)
  const [iframeMountNode, setIframeMountNode] = useState(null)

  // 提取寄生模式标识
  const isParasitism = resource?.[ENV_KEY_META_INFO]?.isParasitism === true;
  // 桥接模式判定：单 Iframe 模式且非纯寄生
  const useBridgeMode = (generateAppSetting?.singleIframe || false) && !isParasitism;

  const stableOnFocus = useCallback(() => {
    onFocus();
  }, [onFocus, pid]);

  const handleIframeMount = useCallback((node) => {
    setIframeMountNode(node);
  }, []);

  // 使用导入的工厂函数来动态创建为当前进程定制的 SDK
  const instanceSDK = useMemo(() => {
    return createSdkForInstance(dispatch, pid, isSystemApp);
  }, [dispatch, pid, isSystemApp]);

  // 支持上下文注入
  useEffect(() => {
    if (!resource) return
    const loadAll = async () => {
      const resultMap = {};
      // 如果开启 Bridge 模式，JS 执行环境切换到幽灵沙箱 (带有底层API拦截的单实例)
      const sandboxWin = useBridgeMode ? getGhostSandbox() : window;

      const compileAndRun = async (code) => {
        const res = await compileSourceAsync(code,pid)
        if (!res.error) {
          const exports = {}
          // 将 factory 绑定到沙箱 window 上执行
          // 此时如果 App 尝试使用 this.indexedDB 将直接抛出拦截异常
          // 而 instanceSDK.System.localStorage 等 API 因为是代理，可以安全、隔离地使用
          res.factory.call(sandboxWin, { exports }, exports, instanceSDK)
          return { Component: exports.default || exports, style: exports.style || '' }
        }
        return null;
      }

      if (!resource.isBundle) {
        resultMap['main'] = await compileAndRun(resource.content);
      } else {
        const files = Object.entries(resource.content)
        for (const [key, code] of files) {
          if (typeof code === 'string') {
            resultMap[key] = await compileAndRun(code);
          }
        }
      }
      setModules(resultMap)
    };
    loadAll();
  }, [resource, instanceSDK, useBridgeMode]);

  const combinedCss = useMemo(() => {
    if (!modules) return '';
    const rawCss = Object.values(modules).map(m => m.style).join('\n');
    return scopeCss(rawCss, pid);
  }, [modules, pid]);

  const commonProps = useMemo(() => {
    // 由于 state 是从 Worker (postMessage) 传递过来的，
    // 本身已经是深拷贝，直接使用可避免引用污染，同时减少递归克隆带来的性能损耗
    return {
      state: state,
      handleFocus: stableOnFocus,
      dispatch,
      pid,
      reStartApp,
      forceReStartApp,
      navigate: instanceSDK.API.navigate,
      fetch:instanceSDK.API.fetch
    }
  }, [state, stableOnFocus, dispatch, pid, instanceSDK]);

  if (!modules) return <div>加载中...</div>

  const currentPath = state.router?.path || 'home';

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
        state={state}
        reStartApp={reStartApp}
        forceReStartApp={forceReStartApp}
        onKill={onKill}
      >
        { (isParasitism || useBridgeMode) ? (
          // 寄生模式或桥接模式：UI 泵入宿主
          <>
            {combinedCss && (
              <style id={`runtime-css-${pid}`} dangerouslySetInnerHTML={{ __html: combinedCss }} />
            )}
            <AppInternalRenderer
               modules={modules}
               resource={resource}
               commonProps={commonProps}
               currentPath={currentPath}
               pid={pid}
            />
          </>
        ) : (
          // 物理沙箱模式：UI 泵入隔离 Iframe
          <>
            <IframeSandbox pid={pid} css={combinedCss} onMount={handleIframeMount} />
            {iframeMountNode && createPortal(
              <IframeStyleProvider key={pid} containerNode={iframeMountNode}>
                <AppInternalRenderer
                   modules={modules}
                   resource={resource}
                   commonProps={commonProps}
                   currentPath={currentPath}
                   pid={pid}
                />
              </IframeStyleProvider>,
              iframeMountNode
            )}
          </>
        )}
      </ErrorBoundary>
    </div>
  );
}, (prevProps, nextProps) => {
  // 忽略 dispatch, onFocus, forceReStartApp, reStartApp, onKill 的对比以减少无意义的重新渲染
  return prevProps.pid === nextProps.pid &&
         prevProps.state === nextProps.state &&
         prevProps.resource === nextProps.resource &&
         prevProps.generateAppSetting === nextProps.generateAppSetting;
});

export default DynamicRenderer;
