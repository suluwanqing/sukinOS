import React, { useState, useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import DescriptionIcon from '@mui/icons-material/Description';
import ExtensionIcon from '@mui/icons-material/Extension';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';
import CodeIcon from '@mui/icons-material/Code';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WebIcon from '@mui/icons-material/Web';
import PublicIcon from '@mui/icons-material/Public';
import StorageIcon from '@mui/icons-material/Storage';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import LayersIcon from '@mui/icons-material/Layers';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';

const bem = createNamespace('developer-helper');

// ─────────────────────────────────────────────────────────────────────────────
// 平台开发概览
// ─────────────────────────────────────────────────────────────────────────────
const IntroSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>平台开发概览</h2>
    <p className={style[bem.e('text')]}>
      本平台提供基于 React 19 的沙箱运行环境，专为快速构建桌面级 Web 应用设计。
      开发者无需配置 Webpack / Vite，只需关注业务逻辑。系统内置 Babel Standalone，
      支持浏览器端实时将 JSX 转换为可执行代码。
    </p>

    <div className={style[bem.e('highlight')]}>
      <h4 className={style[bem.e('subtitle')]}>运行时架构</h4>
      <ul className={style[bem.e('list')]}>
        <li><strong>动态编译：</strong>Babel Standalone 实时编译，支持 ES6+ 与 JSX。所有 JSX 标签转为 <code>AppSDK.React.createElement</code>，因此无需也不允许在文件顶层写 <code>import React</code>。</li>
        <li><strong>沙箱隔离：</strong>应用运行在受限作用域（幽灵 iframe / 物理 iframe）内，直接访问 <code>window.localStorage</code>、<code>window.indexedDB</code>、<code>window.fetch</code>、<code>XMLHttpRequest</code> 等原生 API 一律被拦截抛错。</li>
        <li><strong>SDK 注入：</strong>通过全局对象 <code>AppSDK</code> 访问 React 及所有系统能力。</li>
        <li><strong>自动注入：</strong>系统向根组件自动注入 <code>state</code>、<code>dispatch</code>、<code>navigate</code>、<code>pid</code>、<code>fetch</code>、<code>handleFocus(开发模式下为空占位)</code>、<code>reStartApp(开发模式下为空占位)</code>、<code>forceReStartApp(开发模式下为空占位)</code>、<code>onKill(开发模式下为空占位)</code> 等核心 Props。</li>
        <li><strong>错误边界：</strong>内置 ErrorBoundary，具备指数退避自动重试机制（3 次软重启 + 1 次硬重启）。</li>
      </ul>
    </div>

    <div className={style[bem.e('highlight')]}>
      <h4 className={style[bem.e('subtitle')]}>沙箱执行模式对比</h4>
      <ul className={style[bem.e('list')]}>
        <li><strong>物理沙箱（默认）：</strong>UI 通过 <code>createPortal</code> 泵入独立 iframe，CSS 完全隔离，MUI 样式通过 Emotion CacheProvider 单独注入。</li>
        <li><strong>桥接模式（singleIframe）：</strong>JS 在幽灵沙箱中执行，UI 渲染到宿主。State 经 <code>deepCloneAndFreeze</code> 深冻结后传入，防止子应用污染宿主状态树。</li>
        <li><strong>寄生模式（isParasitism）：</strong>UI 直接挂载到宿主 DOM，适合系统级组件内嵌场景。</li>
      </ul>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 基础 SDK
// ─────────────────────────────────────────────────────────────────────────────
const SDKSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>基础 SDK (AppSDK)</h2>
    <p className={style[bem.e('text')]}>
      所有应用通过全局对象 <code>AppSDK</code> 与系统交互。它在编译器执行阶段由内核注入，
      是应用访问 React、组件库、存储、网络的唯一合法入口。
    </p>

    <div className={style[bem.e('tip')]}>
      <strong>注意：</strong>以下常用 Hook 和 React 核心已由系统<strong>自动注入到顶层作用域</strong>，
      无需也<strong>严禁</strong>在文件顶层重复解构，否则会覆盖注入变量导致运行时错误。
      你可以在组件内部再次解构 AppSDK 获取其他内容。
    </div>

    <h4 className={style[bem.e('subtitle')]}>已自动注入的顶层变量（禁止重复声明）</h4>
    <pre className={style[bem.e('code')]}>
{`// 以下内容系统已自动注入，请勿在文件顶层重新声明！
// 等同于系统在每个文件顶部执行了：
const {
  React,
  useState, useEffect, useMemo, useCallback,
  useRef, useContext, useReducer
} = AppSDK || {};

const { Fragment } = React || {};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>AppSDK 完整命名空间</h4>
    <pre className={style[bem.e('code')]}>
{`AppSDK = {
  React,          // React 19 核心对象，含 createElement / Fragment 等
  useState,       // 已解构到顶层
  useEffect,      // 已解构到顶层
  useMemo,        // 已解构到顶层
  useCallback,    // 已解构到顶层
  useRef,         // 已解构到顶层
  useContext,     // 已解构到顶层
  useReducer,     // 已解构到顶层

  Components: {   // 内置 UI 组件库（可在顶层解构）
    Button,
    Input,
    // ... 更多见"内置组件"章节
  },

  System: {       // 沙箱化存储 API（必须使用此命名空间）
    localStorage,
    sessionStorage,
    indexedDB,
  },

  kernel,         // 内核公共方法（含 evokeApp / getTypeApps 等）
  hooks,          // 文件管理等集成 Hooks

  API: {          // 进程级 API（已通过 Props 或全局 fetch 暴露）
    pid,          // 当前进程 ID
    navigate,     // 路由跳转（通过 Props 注入）
    fetch,        // 安全 fetch（通过 Props / 全局 fetch 使用）
  },
}`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>系统自动注入的 Props</h4>
    <p className={style[bem.e('text')]}>
      以下 Props 由系统渲染器自动传入根组件（单页 <code>main.jsx</code> 或多页 <code>layout.jsx</code>）：
    </p>
    <pre className={style[bem.e('code')]}>
{`export default ({
  state,          // 全局应用状态（来自 logic.jsx reducer）
  dispatch,       // 发送 Action 更新状态
  navigate,       // 路由跳转函数（仅多页应用有效）
  pid,            // 当前进程 ID（字符串）
  fetch,          // 安全 fetch，已绑定内核进程头（推荐使用）
  handleFocus,    // 提升当前窗口 z-index，无需参数
  reStartApp,     // 软重启（保留 state，重新编译）
  forceReStartApp,// 硬重启（清空所有状态）
  onKill,         // 结束当前进程（关闭窗口）
}) => {
  return <div>...</div>;
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>组件内获取其他 SDK 内容</h4>
    <pre className={style[bem.e('code')]}>
{`// 正确：在组件内部解构（不在顶层）
export default ({ state, dispatch }) => {
  // 在函数体内解构 AppSDK 的其余部分
  const { Components, System, kernel, hooks } = AppSDK;
  const { Button, Input } = Components;

  return <Button onClick={() => dispatch({ type: 'ADD' })}>点击</Button>;
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 内核通信 (Kernel)
// ─────────────────────────────────────────────────────────────────────────────
const KernelSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>内核通信 (AppSDK.kernel)</h2>
    <p className={style[bem.e('text')]}>
      通过 <code>AppSDK.kernel</code> 可以访问底层系统的核心调度能力。最常用的是应用间的唤起与通信，以及检索特定类型的应用列表。
    </p>

    <h4 className={style[bem.e('subtitle')]}>应用唤起与通信 (evokeApp)</h4>
    <p className={style[bem.e('text')]}>
      我们的唤起行为并不是由 OS 去维护一份固定的行为处理操作表，而是由运行时执行，由 APP 主动指定目标进程 <code>pid</code> 和交互信息 <code>interactInfo</code>。
      <br /><br />
      底层实际分情况处理：如果 APP 没有启动，则调用 <code>startProcess</code> 启动并传入信息；如果已启动，则调用 <code>appInteract</code> 发送信息。
      <br /><br />
      <b>数据流向：</b>传入的 <code>interactInfo</code> 会与 <code>from</code> 字段合并，并传递到下层目标应用的 <code>logic.jsx</code> 中，最终 <b>直接作为 action</b> 交由 reducer 处理。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 发起方：唤起目标应用并传递信息
export default () => {
  const { kernel } = AppSDK;

  const openFile = () => {
    kernel.evokeApp({
      pid: 'my-editor-app', // 目标应用 PID
      from: 'system',       // 来源标识
      interactInfo: {
        type: 'openFile',
        payload: {
          openType: 'wr',     // 交互类型/操作指令
          mode: 'edit',
          filePath: '/doc/test.txt' // 传递的具体数据
        }
      }
    });
  };

  return <button onClick={openFile}>使用编辑器打开文件</button>;
};

// 接收方 (logic.jsx)：处理唤起交互
function reducer(state = initialState, action) {
  // 此时 interactInfo 全部被处理为 action 传入
  // 优先处理系统底层的应用间交互指令
  if (action?.type === 'openFile') {
    // 执行操作，注意由于这里直接进入到 Worker 中，UI 无法感知
    // 需要在内部维护状态行为返回 state，让 UI 去感知处理
    return {
      ...state,
      currentFile: action.payload.filePath,
      editorMode: action.payload.mode
    };
  }

  // 正常处理普通 dispatch 触发的事件
  switch (action.type) {
    case 'TEST':
      return { ...state };
    default:
      return state;
  }
}`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>获取指定类型的应用 (getTypeApps)</h4>
    <p className={style[bem.e('text')]}>
      传入应用的类型标识（如 <code>editor</code>、<code>tool</code>），内核将返回匹配的所有已安装应用信息。可用于构建"打开方式"或"应用商店"列表。
    </p>
    <pre className={style[bem.e('code')]}>
{`export default () => {
  const { kernel } = AppSDK;
  const [editorApps, setEditorApps] = useState([]);

  useEffect(() => {
    // 接收参数: APP 的类型
    const apps = kernel.getTypeApps('editor');

    // 至少返回包含 pid, name, metaInfo 等字段的对象
    const formattedApps = apps.map(app => ({
      id: app.pid,
      label: app.name || app.appName || 'Unknown App',
      icon: app.metaInfo?.icon ? (
        <img
          src={app.metaInfo.icon}
          alt='icon'
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      ) : null
    }));

    setEditorApps(formattedApps);
  }, []);

  return (
    <ul>
      {editorApps.map(app => (
        <li key={app.id}>
          <div style={{ width: 24, height: 24 }}>{app.icon}</div>
          <span>{app.label}</span>
        </li>
      ))}
    </ul>
  );
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 内置组件
// ─────────────────────────────────────────────────────────────────────────────
const ComponentsSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>内置 UI 组件 (AppSDK.Components)</h2>
    <p className={style[bem.e('text')]}>
      通过 <code>AppSDK.Components</code> 获取系统内置组件。由于 Components 不在顶层自动解构，
      推荐在组件函数体内或文件顶层（组件定义之前）解构。
    </p>

    <h4 className={style[bem.e('subtitle')]}>使用方式</h4>
    <pre className={style[bem.e('code')]}>
{`// 方式 A：文件顶层（组件定义前，非顶层禁止区域）
const { Button, Input } = AppSDK.Components;

export default ({ state, dispatch }) => {
  return (
    <div>
      <Input placeholder="请输入..." />
      <Button onClick={() => dispatch({ type: 'SUBMIT' })}>提交</Button>
    </div>
  );
};

// 方式 B：组件函数体内解构
export default ({ state }) => {
  const { Button, Input } = AppSDK.Components;
  return <Button>点击</Button>;
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>devAppSdk可用组件</h4>
    <ul className={style[bem.e('list')]}>
      <li><code>Button</code>：通用按钮，支持 <code>type="danger"</code> 等变体</li>
      <li><code>Input</code>：文本输入框，支持受控/非受控</li>
      <li>更多组件请通过 <code>console.log(AppSDK.Components)</code> 探查</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>adminAppSdk额外组件</h4>
    <ul className={style[bem.e('list')]}>
      <li><code>Developer</code>：开发者工具面板</li>
      <li><code>FileSystem</code>：文件系统浏览器</li>
      <li><code>NoteBook</code>：笔记本组件</li>
      <li><code>Setting</code>：设置面板</li>
      <li><code>Start</code>：应用启动器</li>
      <li><code>Store</code>：应用商店</li>
    </ul>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 数据存储
// ─────────────────────────────────────────────────────────────────────────────
const StorageSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>数据存储隔离 (AppSDK.System)</h2>
    <p className={style[bem.e('text')]}>
      系统自动为每个应用提供隔离的存储空间。所有操作自动添加进程 ID 前缀（<code>pid-xxx_</code>），
      实现命名空间隔离，应用间数据完全不互通。
    </p>

    <div className={style[bem.e('tip')]}>
      <strong>严禁直接使用原生 API：</strong>
      沙箱会拦截 <code>window.localStorage</code>、<code>window.sessionStorage</code>、
      <code>window.indexedDB</code> 等所有原生存储调用并抛出错误。
      <strong>必须通过 <code>AppSDK.System</code> 使用隔离版本。</strong>
    </div>

    <h4 className={style[bem.e('subtitle')]}>localStorage / sessionStorage</h4>
    <pre className={style[bem.e('code')]}>
{`// 正确用法
export default ({ state }) => {
  const { System } = AppSDK;

  // 写入（实际 key 为 "pid-xxx_userProfile"）
  System.localStorage.setItem('userProfile', JSON.stringify({ name: 'Alice' }));

  // 读取
  const raw = System.localStorage.getItem('userProfile');
  const profile = raw ? JSON.parse(raw) : null;

  // 删除
  System.localStorage.removeItem('userProfile');

  // 遍历当前应用所有 key（已去除前缀）
  const keys = Object.keys(System.localStorage);

  return <div>{profile?.name}</div>;
};

// 错误用法（将被沙箱拦截抛错）
window.localStorage.setItem('key', 'val');
localStorage.setItem('key', 'val');`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>IndexedDB</h4>
    <p className={style[bem.e('text')]}>
      数据库名称自动添加 <code>pid-xxx_</code> 前缀。使用方式与原生 IndexedDB API 完全一致，
      仅入口替换为 <code>AppSDK.System.indexedDB</code>。
    </p>
    <pre className={style[bem.e('code')]}>
{`export default () => {
  const { System } = AppSDK;

  const openDB = () => {
    // 实际打开的数据库名为 "pid-xxx_myDB"
    const request = System.indexedDB.open('myDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('users', { keyPath: 'id' });
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const tx = db.transaction('users', 'readwrite');
      tx.objectStore('users').put({ id: 1, name: 'Alice' });
      tx.oncomplete = () => db.close();
    };

    request.onerror = (e) => console.error('DB Error:', e);
  };

  return <button onClick={openDB}>初始化数据库</button>;
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 网络请求
// ─────────────────────────────────────────────────────────────────────────────
const NetworkSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>网络请求 (fetch)</h2>
    <p className={style[bem.e('text')]}>
      系统为每个进程注入了安全的 <code>fetch</code> 函数，所有请求自动附带
      <code>x-kernel-process-id</code> 请求头，用于服务端识别应用身份。
    </p>

    <div className={style[bem.e('tip')]}>
      <strong>严禁使用原生网络 API：</strong>
      <code>window.fetch</code>、<code>XMLHttpRequest</code>、<code>self.fetch</code> 均被沙箱拦截。
      有两种合法用法：使用 Props 注入的 <code>fetch</code>（推荐），或 <code>AppSDK.API.fetch</code>。
    </div>

    <h4 className={style[bem.e('subtitle')]}>推荐用法：通过 Props 接收 fetch</h4>
    <pre className={style[bem.e('code')]}>
{`// 最佳实践：通过 Props 解构 fetch（系统注入，已绑定进程头）
export default ({ state, dispatch, fetch }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://api.example.com/data');
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={loadData} disabled={loading}>
        {loading ? '加载中...' : '获取数据'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>备用用法：AppSDK.API.fetch</h4>
    <pre className={style[bem.e('code')]}>
{`// 备用：通过 SDK 获取（与 Props fetch 等价）
export default () => {
  const { API } = AppSDK;

  const loadData = async () => {
    const res = await API.fetch('https://api.example.com/data');
    return res.json();
  };

  return <button onClick={loadData}>加载</button>;
};

// 严禁（沙箱拦截）
window.fetch('https://...');
const xhr = new XMLHttpRequest();`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>POST 请求示例</h4>
    <pre className={style[bem.e('code')]}>
{`export default ({ fetch }) => {
  const submit = async (payload) => {
    try {
      const res = await fetch('https://api.example.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await res.json();
    } catch (err) {
      console.error('请求失败:', err);
    }
  };

  return <button onClick={() => submit({ key: 'value' })}>提交</button>;
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 错误处理
// ─────────────────────────────────────────────────────────────────────────────
const ErrorBoundarySection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>错误处理与自动恢复</h2>
    <p className={style[bem.e('text')]}>
      系统内置 ErrorBoundary，自动捕获应用运行时错误并执行分级重试策略。
      整个机制对开发者透明，无需手动配置。
    </p>

    <h4 className={style[bem.e('subtitle')]}>自动重试策略（指数退避）</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>第 1 次（1s 后）：</strong>软重启，调用 <code>reStartApp()</code></li>
      <li><strong>第 2 次（2s 后）：</strong>软重启，调用 <code>reStartApp()</code></li>
      <li><strong>第 3 次（4s 后）：</strong>软重启，调用 <code>reStartApp()</code></li>
      <li><strong>第 4 次（0.5s 后）：</strong>硬重启，调用 <code>forceReStartApp()</code>，清空所有状态</li>
      <li><strong>超出上限：</strong>展示错误 UI，停止自动重试，等待用户操作</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>错误 UI 功能</h4>
    <ul className={style[bem.e('list')]}>
      <li>可展开查看完整错误堆栈（<code>error.stack</code>）</li>
      <li><strong>再次重试：</strong>手动触发硬重启（重置 retryCount）</li>
      <li><strong>关闭应用：</strong>调用 <code>onKill(pid)</code> 结束进程</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>手动控制重启（Props 用法）</h4>
    <pre className={style[bem.e('code')]}>
{`export default ({ reStartApp, forceReStartApp, onKill, pid }) => {
  return (
    <div>
      {/* 软重启：重新编译/渲染，保留 state */}
      <button onClick={reStartApp}>刷新应用</button>

      {/* 硬重启：清空所有状态后重新初始化 */}
      <button onClick={forceReStartApp}>重置应用</button>

      {/* 结束进程（关闭窗口） */}
      <button onClick={() => onKill(pid)}>关闭</button>
    </div>
  );
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>开发建议</h4>
    <ul className={style[bem.e('list')]}>
      <li>用 <code>try-catch</code> 包裹所有异步操作（fetch、IndexedDB 等）</li>
      <li>避免在 render 阶段（组件函数直接执行时）抛出错误</li>
      <li>对 JSON.parse、类型转换等操作做防御处理</li>
    </ul>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 系统路由（Bundle）
// ─────────────────────────────────────────────────────────────────────────────
const BundleSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>多页应用机制 (Level 1 路由)</h2>
    <p className={style[bem.e('text')]}>
      当检测到 Bundle（多文件应用）时，系统 Worker 自动初始化路由状态
      <code>state.router.path = 'home'</code>，并拦截 <code>NAVIGATE</code> action 更新路径。
    </p>

    <h4 className={style[bem.e('subtitle')]}>文件结构规范</h4>
    <ul className={style[bem.e('list')]}>
      <li><code>layout.jsx</code>（必须）：根容器，接收 <code>PageComponent</code> prop，负责导航栏等全局布局</li>
      <li><code>logic.jsx</code>（可选）：定义全局 state 和 reducer。<strong>严禁使用 export</strong></li>
      <li><code>home.jsx</code>（推荐）：默认首页，路由为 <code>'home'</code></li>
      <li><code>*.jsx</code>：其他页面，文件名即路由路径（如 <code>about.jsx</code> 对应 <code>navigate('about')</code>）</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>layout.jsx 模板</h4>
    <pre className={style[bem.e('code')]}>
{`// layout.jsx
const { Button } = AppSDK.Components;

export const style = \`
  .layout-root { display: flex; height: 100%; }
  .layout-nav { width: 180px; padding: 10px; background: #f5f5f5; }
  .layout-main { flex: 1; padding: 20px; overflow-y: auto; }
  .nav-btn { display: block; width: 100%; padding: 8px 12px; margin-bottom: 4px;
             text-align: left; border: none; background: none; cursor: pointer;
             border-radius: 4px; }
  .nav-btn:hover { background: #e0e0e0; }
  .nav-btn.active { background: #1890ff; color: #fff; }
\`;

// 系统注入：navigate, state, dispatch, pid, fetch
export default ({ PageComponent, navigate, state, dispatch, pid, fetch }) => {
  const currentPath = state.router?.path || 'home';
  return (
    <div className="layout-root">
      <nav className="layout-nav">
        <button className={\`nav-btn \${currentPath === 'home' ? 'active' : ''}\`}
                onClick={() => navigate('home')}>首页</button>
        <button className={\`nav-btn \${currentPath === 'about' ? 'active' : ''}\`}
                onClick={() => navigate('about')}>关于</button>
      </nav>
      <main className="layout-main">
        <PageComponent />
      </main>
    </div>
  );
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>页面组件：navigate + state + fetch</h4>
    <pre className={style[bem.e('code')]}>
{`// about.jsx
export const style = \`.about { padding: 20px; }\`;

export default ({ state, dispatch, navigate, fetch, pid }) => {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    fetch('https://api.example.com/about')
      .then(r => r.json())
      .then(setInfo)
      .catch(console.error);
  }, []);

  return (
    <div className="about">
      <h2>关于页面</h2>
      <p>当前进程 ID：{pid}</p>
      {info && <p>{info.description}</p>}
      <button onClick={() => navigate('home')}>返回首页</button>
    </div>
  );
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  多级路由（Level 2）
// ─────────────────────────────────────────────────────────────────────────────
const PatternSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>内部组件与多级路由 (Level 2)</h2>
    <p className={style[bem.e('text')]}>
      在单个 .jsx 文件内，可定义多个组件并用 <code>useState</code> 实现视觉上的二级路由。
      内部组件可直接从父组件接收 <code>state</code>、<code>dispatch</code>、<code>fetch</code> 等 Props。
    </p>

    <h4 className={style[bem.e('subtitle')]}>多组件 + 二级路由 + fetch</h4>
    <pre className={style[bem.e('code')]}>
{`// settings.jsx
const { Button, Input } = AppSDK.Components;

export const style = \`
  .tabs { display: flex; border-bottom: 1px solid #eee; margin-bottom: 20px; }
  .tab { padding: 8px 16px; cursor: pointer; border-bottom: 2px solid transparent; }
  .tab.active { border-bottom-color: #1890ff; color: #1890ff; font-weight: bold; }
\`;

// 内部子组件：接收父级传入的 state / dispatch / fetch
const ProfileView = ({ state, dispatch, fetch }) => {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(state.user?.name || '');

  const save = async () => {
    setSaving(true);
    try {
      await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      dispatch({ type: 'UPDATE_USER', payload: { name } });
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h3>基本资料</h3>
      <Input value={name} onChange={e => setName(e.target.value)} />
      <Button onClick={save} disabled={saving}>
        {saving ? '保存中...' : '保存'}
      </Button>
    </div>
  );
};

const SecurityView = ({ fetch }) => {
  const [status, setStatus] = useState('');

  const checkSecurity = async () => {
    const res = await fetch('/api/security/check');
    const data = await res.json();
    setStatus(data.level);
  };

  return (
    <div>
      <h3>安全设置</h3>
      <p>安全等级：{status || '未检测'}</p>
      <Button onClick={checkSecurity}>检测安全等级</Button>
    </div>
  );
};

// 根组件：持有子路由状态，向下传递所有 Props
export default ({ state, dispatch, navigate, fetch, pid }) => {
  const [tab, setTab] = useState('profile');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <h2>设置</h2>
        <button onClick={() => navigate('home')}>← 返回</button>
      </div>
      <div className="tabs">
        <div className={\`tab \${tab === 'profile' ? 'active' : ''}\`}
             onClick={() => setTab('profile')}>个人资料</div>
        <div className={\`tab \${tab === 'security' ? 'active' : ''}\`}
             onClick={() => setTab('security')}>安全设置</div>
      </div>
      {tab === 'profile' && <ProfileView state={state} dispatch={dispatch} fetch={fetch} />}
      {tab === 'security' && <SecurityView fetch={fetch} />}
    </div>
  );
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 综合示例
// ─────────────────────────────────────────────────────────────────────────────
const FullExampleSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>综合示例：完整 Bundle 应用</h2>
    <p className={style[bem.e('text')]}>
      以下为包含 logic.jsx / layout.jsx / home.jsx / account.jsx 的完整多页应用示例，
      演示了 state 管理、导航、fetch、存储的全链路用法。
    </p>

    <h4 className={style[bem.e('subtitle')]}>1. logic.jsx（全局状态 — 严禁 export）</h4>
    <pre className={style[bem.e('code')]}>
{`// 绝对不可使用 export，内核自动识别 initialState 和 reducer
const initialState = {
  theme: 'light',
  user: { name: 'Admin', role: 'root' },
  notifications: [],
};

function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [...state.notifications, action.payload] };
    // NAVIGATE action 由 Worker 自动拦截处理，无需在此处理
    default:
      return state;
  }
}`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>2. layout.jsx（导航框架）</h4>
    <pre className={style[bem.e('code')]}>
{`const { Button } = AppSDK.Components;

export const style = \`
  .app-root { display: flex; height: 100%; font-family: sans-serif; }
  .sidebar { width: 200px; padding: 12px; background: #f7f7f7;
             border-right: 1px solid #e8e8e8; display: flex; flex-direction: column; }
  .content { flex: 1; overflow-y: auto; }
  .menu-item { padding: 10px 12px; margin-bottom: 4px; border-radius: 6px;
               cursor: pointer; border: none; background: none; width: 100%;
               text-align: left; font-size: 14px; }
  .menu-item:hover { background: #ebebeb; }
  .menu-item.active { background: #e6f4ff; color: #1677ff; }
  .dark .sidebar { background: #1a1a1a; border-color: #333; }
  .dark .menu-item:hover { background: #2a2a2a; }
\`;

export default ({ PageComponent, navigate, state, dispatch, pid, fetch }) => {
  const currentPath = state.router?.path || 'home';

  return (
    <div className={\`app-root \${state.theme}\`}>
      <div className="sidebar">
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>设置中心</h3>
        {[
          { path: 'home', label: '通用设置' },
          { path: 'account', label: '账户管理' },
        ].map(({ path, label }) => (
          <button key={path}
            className={\`menu-item \${currentPath === path ? 'active' : ''}\`}
            onClick={() => navigate(path)}>
            {label}
          </button>
        ))}
        <div style={{ marginTop: 'auto' }}>
          <Button onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>
            {state.theme === 'light' ? '切换深色' : '切换浅色'}
          </Button>
        </div>
      </div>
      <div className="content">
        <PageComponent />
      </div>
    </div>
  );
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>3. home.jsx（通用设置页）</h4>
    <pre className={style[bem.e('code')]}>
{`export const style = \`
  .home-page { padding: 24px; }
  .setting-row { display: flex; align-items: center; justify-content: space-between;
                 padding: 12px 0; border-bottom: 1px solid #f0f0f0; }
\`;

export default ({ state, dispatch, fetch }) => {
  const { System } = AppSDK;

  // 持久化主题偏好到隔离 localStorage
  useEffect(() => {
    System.localStorage.setItem('theme', state.theme);
  }, [state.theme]);

  return (
    <div className="home-page">
      <h2>通用设置</h2>
      <div className="setting-row">
        <span>当前主题</span>
        <strong>{state.theme}</strong>
      </div>
      <div className="setting-row">
        <span>用户角色</span>
        <strong>{state.user?.role}</strong>
      </div>
    </div>
  );
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>4. account.jsx（账户管理页 + 二级路由）</h4>
    <pre className={style[bem.e('code')]}>
{`const { Input, Button } = AppSDK.Components;

export const style = \`
  .account-page { padding: 24px; }
  .sub-tabs { display: flex; gap: 4px; margin-bottom: 20px; }
  .sub-tab { padding: 6px 14px; border-radius: 4px; cursor: pointer;
             border: 1px solid #d9d9d9; background: #fff; font-size: 13px; }
  .sub-tab.active { background: #1677ff; color: #fff; border-color: #1677ff; }
\`;

const BasicInfo = ({ state, dispatch, fetch }) => {
  const [name, setName] = useState(state.user?.name || '');
  const [msg, setMsg] = useState('');

  const save = async () => {
    try {
      // 也可以调用后端接口
      // await fetch('/api/user', { method: 'POST', body: JSON.stringify({ name }) });
      dispatch({ type: 'UPDATE_USER', payload: { name } });
      setMsg('保存成功！');
      setTimeout(() => setMsg(''), 2000);
    } catch (e) {
      setMsg('保存失败：' + e.message);
    }
  };

  return (
    <div>
      <h3>基本信息</h3>
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>用户名：</label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <Button onClick={save}>保存</Button>
      {msg && <span style={{ marginLeft: 12, color: '#52c41a' }}>{msg}</span>}
    </div>
  );
};

const SecurityInfo = ({ fetch }) => {
  const [level, setLevel] = useState('');
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    try {
      const res = await fetch('https://httpbin.org/get');
      const data = await res.json();
      setLevel(data.headers?.['X-Kernel-Process-Id'] ? '已验证' : '未知');
    } catch {
      setLevel('检测失败');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <h3>安全设置</h3>
      <p>安全等级：<strong>{level || '未检测'}</strong></p>
      <Button onClick={check} disabled={checking}>
        {checking ? '检测中...' : '检测安全状态'}
      </Button>
    </div>
  );
};

export default ({ state, dispatch, navigate, fetch, pid }) => {
  const [tab, setTab] = useState('basic');

  return (
    <div className="account-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>账户管理</h2>
        <button onClick={() => navigate('home')}>← 返回通用</button>
      </div>
      <div className="sub-tabs">
        {[['basic','基本信息'],['security','安全设置']].map(([key, label]) => (
          <button key={key}
            className={\`sub-tab \${tab === key ? 'active' : ''}\`}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'basic'    && <BasicInfo state={state} dispatch={dispatch} fetch={fetch} />}
      {tab === 'security' && <SecurityInfo fetch={fetch} />}
    </div>
  );
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 编译原理
// ─────────────────────────────────────────────────────────────────────────────
const CompilerSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>编译原理 (Babel)</h2>
    <p className={style[bem.e('text')]}>
      所有 JSX 标签在编译阶段被替换为 <code>AppSDK.React.createElement</code>，
      因此无需 <code>import React</code>，但应用必须在 AppSDK 注入的上下文中运行。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 源码
const el = <div className="box">Hello</div>;

// 编译后
const el = AppSDK.React.createElement('div', { className: 'box' }, 'Hello');`}
    </pre>
    <p className={style[bem.e('text')]}>
      编译后的代码通过 <code>factory.call(sandboxWin, { 'exports' }, exports, instanceSDK)</code>
      在沙箱 window 上下文中执行，<code>AppSDK</code> 即第三个参数 <code>instanceSDK</code>，
      已经是进程级别的定制实例（含进程 ID、隔离存储、安全 fetch 等）。
    </p>

    <h4 className={style[bem.e('subtitle')]}>State 安全传递</h4>
    <p className={style[bem.e('text')]}>
      在非寄生模式下，<code>state</code> 经过 <code>deepCloneAndFreeze</code> 深度克隆并冻结后传入子应用。
      这意味着你<strong>不能直接修改 state 对象</strong>（修改会静默失败或抛出 TypeError），
      必须通过 <code>dispatch</code> 更新状态。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 错误：直接修改 state（被冻结，会报错）
state.user.name = 'NewName';

//  正确：通过 dispatch
dispatch({ type: 'UPDATE_USER', payload: { name: 'NewName' } });`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 系统权限（Admin）
// ─────────────────────────────────────────────────────────────────────────────
const AdminSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>系统应用扩展 (adminAppSdk)</h2>
    <p className={style[bem.e('text')]}>
      系统级应用通过 <code>adminAppSdk</code> 获得额外能力，包含基础 SDK 的全部功能，
      并扩展了系统管理权限。
    </p>

    <h4 className={style[bem.e('subtitle')]}>扩展能力</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>rootSeed：</strong>生成系统级唯一 ID 种子</li>
      <li><strong>完整 kernel：</strong>直接访问系统内核公共操作</li>
      <li><strong>完整 hooks：</strong>文件系统、进程管理等高权限 Hooks</li>
      <li><strong>扩展 Components：</strong>包含 Developer、FileSystem、NoteBook、Setting、Start、Store</li>
    </ul>

    <pre className={style[bem.e('code')]}>
{`// adminAppSdk 结构
export const adminAppSdk = {
  ...devAppSdk,      // 继承全部基础 SDK
  API: {
    ...devAppSdk.API,
    rootSeed: generateShortSeed,
  },
  Components: {
    ...devAppSdk.Components,
    Developer,       // 开发者工具
    FileSystem,      // 文件系统管理
    NoteBook,        // 笔记本
    Setting,         // 系统设置
    Start,           // 启动器
    Store,           // 应用商店
  },
  hooks,             // 完整 hooks（含文件系统等）
  kernel,            // 内核直接访问
};`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 代码规范
// ─────────────────────────────────────────────────────────────────────────────
const CodeSpecSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>代码规范与最佳实践</h2>

    <h4 className={style[bem.e('subtitle')]}>文件顶层禁止区域（绝对不能写）</h4>
    <pre className={style[bem.e('code')]}>
{`// 以下在文件顶层严禁书写（系统已自动注入）：
const { React, useState, useEffect, useMemo,
        useCallback, useRef, useContext, useReducer } = AppSDK;
const { Fragment } = React;

// 以下可以在文件顶层写（Components 未自动注入）：
const { Button, Input } = AppSDK.Components;
const { System } = AppSDK;`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>logic.jsx 规范</h4>
    <pre className={style[bem.e('code')]}>
{`// 正确
const initialState = { count: 0 };
function reducer(state, action) { ... }

//错误（export 会破坏内核解析）
export const initialState = { count: 0 };
export function reducer(state, action) { ... }
export default function reducer(state, action) { ... }`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>组件导出规范</h4>
    <pre className={style[bem.e('code')]}>
{`// 正确
export default ({ state, dispatch }) => {
  return <div>内容</div>;
};

// 错误（命名导出无法作为主页面组件）
export const App = () => <div />;`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>样式规范</h4>
    <pre className={style[bem.e('code')]}>
{`// 正确：export const style 导出 CSS 字符串，系统自动 Scope 处理
export const style = \`
  .container {
    padding: 20px;
    background: #f0f0f0;
  }
  .title {
    font-size: 18px;
    color: #333;
  }
\`;

//错误：直接向 document.head 注入样式（沙箱内可能污染全局）
const style = document.createElement('style');
style.innerHTML = '.box { color: red; }';
document.head.appendChild(style);`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>命名规范</h4>
    <ul className={style[bem.e('list')]}>
      <li>页面文件使用小驼峰：<code>userProfile.jsx</code>（文件名即路由路径）</li>
      <li>组件函数使用 PascalCase：<code>const UserProfile = () =&gt; ...</code></li>
      <li>CSS 类名使用小写连字符：<code>user-profile-container</code></li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>常见陷阱</h4>
    <ul className={style[bem.e('list')]}>
      <li>Props 中 <code>fetch</code> 优先于全局 fetch，建议始终从 Props 解构</li>
      <li>子组件需要 fetch / dispatch，请手动从父组件 Props 往下传</li>
      <li>不要在顶层 await（沙箱不支持 Top-level await）</li>
      <li>state 是深冻结对象，任何直接赋值都无效，请始终用 dispatch</li>
    </ul>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 开发模式
// ─────────────────────────────────────────────────────────────────────────────

const DevType = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>最简 Vite 插件配置</h2>

    <h4 className={style[bem.e('subtitle')]}>插件核心功能</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>文件监听</strong>：自动监听 <code>.jsx/.js</code> 文件变化</li>
      <li><strong>防抖聚合</strong>：多个文件同时保存时，聚合为一次同步</li>
      <li><strong>HTTP 接口</strong>：提供 <code>/__sukin_local_sync</code> 同步接口</li>
      <li><strong>版本控制</strong>：通过时间戳标识文件版本，避免重复同步</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>vite.config.js 配置</h4>
    <pre className={style[bem.e('code')]}>
{`import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'sukin-local-driver',
      configureServer(server) {
        const dirStates = new Map(); // dir -> { v, debounceMs, timer }

        // 监听文件变化
        server.watcher.on('all', (event, filePath) => {
          if (!/\\.(jsx|js)$/.test(filePath)) return;

          for (const [dir, state] of dirStates) {
            if (filePath.includes(dir)) {
              clearTimeout(state.timer);
              state.timer = setTimeout(() => {
                state.v = Date.now(); // 更新版本号
              }, state.debounceMs);
              break;
            }
          }
        });

        // 注册 HTTP 接口
        server.middlewares.use((req, res, next) => {
          if (!req.url.startsWith('/__sukin_local_sync')) return next();

          const url = new URL(req.url, 'http://localhost');
          const dir = url.searchParams.get('dir') || 'src';
          const watchDebounce = Number(url.searchParams.get('watchDebounce') || 500);

          // 处理请求...
          res.end(JSON.stringify({
            status: 'ok',
            files: { /* 文件内容 */ },
            logic: '/* logic.jsx 内容 */',
            v: Date.now(),
            dir
          }));
        });
      }
    }
  ],
  server: {
    port: 5173,           // 开发服务器端口
    cors: true,          // 允许跨域
    host: '0.0.0.0'      // 允许局域网访问
  },
});`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>LocalDev 配置说明</h4>

    <div className={style[bem.e('config-grid')]}>
      <div className={style[bem.e('config-item')]}>
        <h5>连接配置</h5>
        <ul className={style[bem.e('list')]}>
          <li><strong>端口</strong>：Vite 开发服务器端口（默认 5173）</li>
          <li><strong>工作目录</strong>：本地开发文件夹路径（默认 'src'）</li>
        </ul>
      </div>

      <div className={style[bem.e('config-item')]}>
        <h5>同步配置</h5>
        <ul className={style[bem.e('list')]}>
          <li><strong>自动同步</strong>：开启后定时轮询文件变化</li>
          <li><strong>轮询间隔</strong>：自动同步的间隔时间（毫秒）</li>
          <li><strong>监听防抖</strong>：服务端文件变化聚合延迟</li>
          <li><strong>手动防抖</strong>：点击"立即同步"按钮的防抖延迟</li>
        </ul>
      </div>

      <div className={style[bem.e('config-item')]}>
        <h5>应用配置</h5>
        <ul className={style[bem.e('list')]}>
          <li><strong>应用名称</strong>：发布后的应用标识（必须唯一）</li>
          <li><strong>应用图标</strong>：应用图标 URL 路径</li>
          <li><strong>应用类型</strong>：选择应用分类（如 editor、tool 等）</li>
          <li><strong>初始尺寸</strong>：应用窗口的初始宽度和高度</li>
        </ul>
      </div>

      <div className={style[bem.e('config-item')]}>
        <h5>高级选项</h5>
        <ul className={style[bem.e('list')]}>
          <li><strong>暴露状态</strong>：是否允许其他应用访问状态</li>
          <li><strong>持久化状态</strong>：关闭应用时是否保存状态</li>
          <li><strong>上传到应用商店</strong>：发布到公共应用市场</li>
          <li><strong>私有应用</strong>：是否为私有应用（仅自己可见）</li>
        </ul>
      </div>
    </div>

    <h4 className={style[bem.e('subtitle')]}>文件同步流程</h4>
    <pre className={style[bem.e('code')]}>
{`1. 前端配置端口和目录
2. 点击"立即同步"或开启自动同步
3. 请求发送到 Vite 插件的 /__sukin_local_sync
4. 服务端扫描目录，返回所有 .jsx/.js 文件
5. 前端接收文件内容，在 Worker 中编译执行
6. 编译成功后实时预览
7. 文件变化触发自动重新编译`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>必要文件说明</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>layout.jsx</strong>：必须存在，作为应用主布局组件</li>
      <li><strong>logic.jsx</strong>：必须存在，包含 initialState 和 reducer</li>
      <li><strong>其他 .jsx/.js 文件</strong>：自动根据文件名映射为路由</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>开发环境要求</h4>
    <ul className={style[bem.e('list')]}>
      <li>Node.js </li>
      <li>Vite 等任何服务均可，开发服务器在运行状态</li>
      <li>网络可访问：Vite 服务必须允许跨域</li>
      <li>浏览器支持 ES6+ 和 Web Workers</li>
    </ul>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// AI 提示词助手
// ─────────────────────────────────────────────────────────────────────────────
const AIPromptSection = () => {
  const [copied, setCopied] = useState(false);

  const promptText = `你现在是 SukinOS (基于 React 19 的沙箱操作系统) 的高级应用开发助手。
请严格按照以下规范生成代码，文件中不允许出现任何 import 语句。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【一、绝对禁止项】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 禁止使用 import / require（任何文件中）
2. 禁止在文件顶层声明以下变量：
     const { React, useState, useEffect, useMemo, useCallback,
             useRef, useContext, useReducer } = AppSDK;
     const { Fragment } = React;
3. 禁止在 logic.jsx 中使用 export 关键字
4. 禁止直接使用原生存储 API：
     window.localStorage / window.sessionStorage / window.indexedDB
5. 禁止直接使用原生网络 API：
     window.fetch / XMLHttpRequest / self.fetch
6. 禁止直接修改 state 对象
7. navagate:文件名字即为路由传入字符串即可实现跳转
8. dispatch:对应reducer的实现
9. 非logic页面至少要有一个export default ({})=>{}作为当前组件视图入口,单文件可以声明其他子组件。
10. 必需要有layout.jsx作为整个程序的入口
11. 一般建议无论如何都处理为多页面
12. 唤起其他应用(evokeApp)时，不要依赖OS维护行为表，需直接传递pid与标准action格式的interactInfo（含type与payload）。接收方在reducer中直接处理该action，通过返回新state让UI感知。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【二、核心规范】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ logic.jsx（无 export，内核自动识别）
  const initialState = { /* 初始状态 */ };
  function reducer(state, action) {
    // 处理唤起应用交互（interactInfo 会直接作为 action 传入）
    // 注意：因 reducer 运行在 worker 中，必须通过返回新 state 才能让 UI 感知
    if(action?.type === 'openFile') {
      return { ...state, ...action.payload };
    }

    switch (action.type) {
      case 'NORMAL_ACTION': return { ...state, ... };
      default: return state;
    }
  }

■ 页面组件（export default，接收系统注入 Props）
  // 可在文件顶层解构（非禁区内容,但是不可以解构上述重复声明）：
  const { Button, Input } = AppSDK.Components;
  const { System } = AppSDK;

  export const style = \`/* 组件作用域 CSS，系统自动 Scope */\`;

  export default ({
    state,           // 全局状态（深冻结，不可直接修改）
    dispatch,        // 更新状态的唯一入口
    navigate,        // 路由跳转（仅 Bundle 多页有效）
    pid,             // 当前进程 ID
    fetch,           // 安全 fetch（已自动注入进程头，推荐使用此版本）
    handleFocus,     // 提升窗口层级
    reStartApp,      // 软重启
    forceReStartApp, // 硬重启
    onKill,          // 结束进程
  }) => {
    // 在函数体内可以进一步解构 AppSDK 其余内容
    const { kernel, hooks } = AppSDK;
    ...
    return <div>...</div>;
  };

■ 内核交互（AppSDK.kernel）
  const { kernel } = AppSDK;
  // 获取特定应用列表
  const apps = kernel.getTypeApps('editor');
  // 唤起与交互（注意 payload 标准格式）
  kernel.evokeApp({
    pid: 'target-app-pid',
    from: 'system',
    interactInfo: {
      type: 'openFile',
      payload: { openType: 'wr', mode: 'edit', filePath: '/a.txt' }
    }
  });

■ 存储操作（必须通过 AppSDK.System）
  const { System } = AppSDK;
  System.localStorage.setItem('key', JSON.stringify(data));
  const data = JSON.parse(System.localStorage.getItem('key') || 'null');
  System.localStorage.removeItem('key');
  const req = System.indexedDB.open('dbName', 1);

■ 网络请求（通过 Props fetch 或 AppSDK.API.fetch）
  // 方式 A（推荐）：从 Props 解构
  export default ({ fetch }) => {
    const load = async () => {
      const res = await fetch('https://api.example.com/data');
      return res.json();
    };
  };
  // 方式 B：通过 SDK
  const { API } = AppSDK;
  const res = await API.fetch('https://api.example.com/data');

■ 子组件 Props 传递
  // 子组件需要 fetch / dispatch / state，必须从父组件手动往下传
  const SubComponent = ({ state, dispatch, fetch }) => { ... };
  export default ({ state, dispatch, fetch }) => (
    <SubComponent state={state} dispatch={dispatch} fetch={fetch} />
  );

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【三、最小完整闭环示例（Bundle 多页）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

--- logic.jsx ---
const initialState = {
  count: 0,
  items: [],
  loading: false,
  targetFile: null,
};

function reducer(state, action) {
  // 1. 处理来自 kernel.evokeApp 传入的应用间通信指令 (运行在 worker，通过返回 state 通知 UI)
  if(action?.type === 'openFile') {
    return { ...state, targetFile: action.payload.filePath };
  }

  // 2. 处理常规 dispatch
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + 1 };
    case 'SET_ITEMS':  return { ...state, items: action.payload, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    default: return state;
  }
}

--- layout.jsx ---
const { Button } = AppSDK.Components;

export const style = \`
  .layout { display: flex; height: 100%; }
  .nav { width: 160px; padding: 12px; background: #f5f5f5; }
  .main { flex: 1; padding: 20px; overflow-y: auto; }
  .nav-btn { display: block; width: 100%; padding: 8px; margin-bottom: 4px;
             border: none; background: none; cursor: pointer; text-align: left;
             border-radius: 4px; }
  .nav-btn:hover { background: #e0e0e0; }
  .nav-btn.active { background: #1677ff; color: #fff; }
\`;

export default ({ PageComponent, navigate, state, dispatch, fetch }) => {
  const path = state.router?.path || 'home';
  return (
    <div className="layout">
      <nav className="nav">
        <button className={\`nav-btn \${path==='home'?'active':''}\`} onClick={()=>navigate('home')}>首页</button>
        <button className={\`nav-btn \${path==='detail'?'active':''}\`} onClick={()=>navigate('detail')}>详情</button>
      </nav>
      <div className="main"><PageComponent /></div>
    </div>
  );
};

--- home.jsx ---
const { Button } = AppSDK.Components;
const { System } = AppSDK;

export const style = \`.home { padding: 20px; }\`;

export default ({ state, dispatch, navigate, fetch }) => {
  const load = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/todos?_limit=5');
      const data = await res.json();
      dispatch({ type: 'SET_ITEMS', payload: data });
      // 持久化到隔离存储
      System.localStorage.setItem('cachedItems', JSON.stringify(data));
    } catch (e) {
      dispatch({ type: 'SET_LOADING', payload: false });
      console.error(e);
    }
  };

  useEffect(() => {
    // 读取缓存
    const cached = System.localStorage.getItem('cachedItems');
    if (cached) dispatch({ type: 'SET_ITEMS', payload: JSON.parse(cached) });
  }, []);

  return (
    <div className="home">
      <h2>首页 — count: {state.count}</h2>
      {state.targetFile && <p style={{color: 'blue'}}>外部唤起文件：{state.targetFile}</p>}
      <Button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</Button>
      <Button onClick={load} disabled={state.loading}>
        {state.loading ? '加载中...' : '获取数据'}
      </Button>
      <Button onClick={() => navigate('detail')}>去详情</Button>
      <ul>
        {state.items.map(item => <li key={item.id}>{item.title}</li>)}
      </ul>
    </div>
  );
};

--- detail.jsx ---
export const style = \`.detail { padding: 20px; }\`;

export default ({ state, dispatch, navigate, fetch, pid }) => {
  return (
    <div className="detail">
      <h2>详情页</h2>
      <p>进程 ID：{pid}</p>
      <p>已加载条目数：{state.items.length}</p>
      <button onClick={() => navigate('home')}>← 返回首页</button>
    </div>
  );
};

请根据我的具体需求：[此处填写需求] 生成代码。`;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={style[bem.e('section')]}>
      <h2 className={style[bem.e('title')]}>AI 提示词助手 (Prompt)</h2>
      <p className={style[bem.e('text')]}>
        将以下提示词复制后发送给 AI 助手，即可让 AI 生成符合 SukinOS 规范的应用代码。
        本提示词已包含全部禁止项、核心规范、Props 解构（含 fetch/System/dispatch）及完整的多页 Bundle 闭环示例。
      </p>

      <div style={{ position: 'relative', marginTop: '20px' }}>
        <button
          onClick={handleCopy}
          style={{
            position: 'absolute', top: '10px', right: '10px',
            padding: '8px 16px',
            backgroundColor: copied ? '#52c41a' : '#1677ff',
            color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
            fontWeight: 'bold', zIndex: 1, transition: 'background 0.3s',
            fontSize: '13px',
          }}
        >
          {copied ? '✓ 已复制！' : '一键复制 Prompt'}
        </button>
        <pre className={style[bem.e('code')]} style={{
          paddingTop: '52px',
          whiteSpace: 'pre-wrap',
          border: '2px dashed #d9d9d9',
          borderRadius: '8px',
          maxHeight: '500px',
          overflowY: 'auto',
        }}>
          {promptText}
        </pre>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 导航配置
// ─────────────────────────────────────────────────────────────────────────────
const docSections = [
  { id: 'intro',    label: '开发概览',  icon: <DescriptionIcon />,  component: IntroSection },
  { id: 'sdk',      label: '基础 SDK',  icon: <ExtensionIcon />,    component: SDKSection },
  { id: 'kernel',   label: '内核交互',  icon: <AccountTreeIcon />,  component: KernelSection },
  { id: 'components', label: '内置组件', icon: <LayersIcon />,      component: ComponentsSection },
  { id: 'storage',  label: '数据存储',  icon: <StorageIcon />,      component: StorageSection },
  { id: 'network',  label: '网络请求',  icon: <PublicIcon />,       component: NetworkSection },
  { id: 'error',    label: '错误处理',  icon: <ErrorOutlineIcon />, component: ErrorBoundarySection },
  { id: 'bundle',   label: '系统路由',  icon: <FolderZipIcon />,    component: BundleSection },
  { id: 'pattern',  label: '多级路由',  icon: <AccountTreeIcon />,  component: PatternSection },
  { id: 'example',  label: '综合示例',  icon: <WebIcon />,          component: FullExampleSection },
  { id: 'compiler', label: '编译配置',  icon: <BuildIcon />,        component: CompilerSection },
  { id: 'admin',    label: '系统权限',  icon: <SecurityIcon />,     component: AdminSection },
  { id: 'code', label: '代码规范', icon: <CodeIcon />, component: CodeSpecSection },
  { id: 'devType',     label: '开发模式',  icon: <RocketLaunchIcon />,         component: DevType },
  { id: 'ai',       label: 'AI 提示词', icon: <SmartToyIcon />,     component: AIPromptSection },
];

// ─────────────────────────────────────────────────────────────────────────────
// 根组件
// ─────────────────────────────────────────────────────────────────────────────
const Helper = () => {
  const [activeTabId, setActiveTabId] = useState('intro');

  const ActiveComponent = useMemo(() =>
    docSections.find(s => s.id === activeTabId)?.component || IntroSection,
  [activeTabId]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('sidebar')]}>
        <div className={style[bem.e('header')]}>
          <h3>开发手册</h3>
          <div className={style[bem.e('version')]}>v3.0.0</div>
        </div>
        <div className={style[bem.e('nav')]}>
          {docSections.map(item => (
            <div
              key={item.id}
              className={[
                style[bem.e('nav-item')],
                style[bem.is('active', activeTabId === item.id)]
              ].join(' ')}
              onClick={() => setActiveTabId(item.id)}
            >
              <span className={style[bem.e('nav-icon')]}>{item.icon}</span>
              <span className={style[bem.e('nav-label')]}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className={style[bem.e('content')]}>
        <ActiveComponent />
      </div>
    </div>
  );
};

export default Helper;
