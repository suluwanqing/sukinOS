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
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
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
        <li><strong>动态编译：</strong>Babel Standalone 实时编译，支持 ES6+ 与 JSX。JSX 标签转为 <code>AppSDK.React.createElement</code>，
          ES Module 的 <code>import</code> / <code>export</code> 转为 CommonJS 的 <code>require</code> / <code>exports</code>，
          因此无需也不允许在文件顶层写 <code>import React</code>。</li>
        <li><strong>沙箱隔离：</strong>页面层运行在受限作用域内，<code>window</code> / <code>document</code> /
          <code>navigator</code> / <code>fetch</code> 这些名字被换成按进程受控的实现（<code>window.localStorage</code>
          因此就是带进程前缀的代理），<code>eval</code>、<code>XMLHttpRequest</code>、<code>importScripts</code>
          一旦访问就抛错。注意 <code>localStorage</code> / <code>sessionStorage</code> / <code>indexedDB</code>
          的<strong>裸名没有被接管</strong>，请一律走 <code>AppSDK.System</code>（细节见「数据存储」一节）。
          逻辑层（worker）根本没有 <code>document</code> 与 <code>AppSDK</code>，所以网络与持久化请放在页面层。两条边界见「解析与分层」末节。</li>
        <li><strong>SDK 注入：</strong>通过全局对象 <code>AppSDK</code> 访问 React 及所有系统能力。</li>
        <li><strong>自动注入：</strong>系统向根组件自动注入 <code>state</code>、<code>dispatch</code>、<code>navigate</code>、<code>pid</code>、<code>fetch</code>、
          <code>handleFocus</code>、<code>reStartApp</code>、<code>forceReStartApp</code> 八项核心 Props（预览环境下后三项是空占位）。
          <strong>没有 <code>onKill</code></strong>——结束进程属于窗口外壳，应用侧请走 <code>AppSDK.API.window.close()</code>。</li>
        <li><strong>错误边界：</strong>内置 ErrorBoundary，具备指数退避自动重试机制（3 次软重启 + 1 次硬重启），另有 5 秒同类错误节流，连续崩溃时直接给出操作按钮而不是无限重启。</li>
      </ul>
    </div>

    <div className={style[bem.e('highlight')]}>
      <h4 className={style[bem.e('subtitle')]}>三种沙箱执行模式</h4>
      <ul className={style[bem.e('list')]}>
        <li><strong>物理沙箱（普通应用的默认）：</strong>UI 通过 <code>createPortal</code> 泵入独立 iframe，CSS 完全隔离，MUI 样式通过 Emotion CacheProvider 单独注入。</li>
        <li><strong>桥接模式：</strong>JS 在共享的幽灵 iframe 中执行，UI 渲染到宿主。由宿主的「单 Iframe」或「虚拟 Worker」开关打开。</li>
        <li><strong>寄生模式：</strong>JS 与 UI 都直接跑在宿主，适合系统级组件内嵌场景。它由 <code>metaInfo.isParasitism === true</code> 决定，
          目前只有预置系统应用带这个标记。</li>
      </ul>
      <p className={style[bem.e('text')]}>
        前两种是<strong>宿主侧设置</strong>（系统设置里切），你的应用不需要也无法配置；它不改变你可以调用的 API——
        <code>AppSDK</code>、注入的 Props、<code>import</code> 语义在三种模式下一致。
        <strong>唯一的例外是原生存储：</strong>物理与幽灵 realm 上 <code>localStorage</code> 等被拦成"访问即抛"，
        桥接共用的那个沙箱与寄生的宿主 realm 没有这层拦截，所以裸写存储名在不同模式下表现不同（见「数据存储」一节）。
        另外 <code>state</code> 从 worker 传到页面走的是 <code>postMessage</code> 的结构化克隆——页面拿到的是一份副本，
        改它既污染不到 worker 状态，也不会触发任何更新，界面刷新只能靠 <code>dispatch</code>。
      </p>
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
      在文件顶层重复声明会直接撞出 <code>SyntaxError</code>（不是覆盖，是整块编译失败）。
      组件函数体内可以照常解构 <code>AppSDK</code> 取别的东西，那是另一层作用域。
    </div>

    <h4 className={style[bem.e('subtitle')]}>已自动注入的顶层变量（禁止重复声明）</h4>
    <pre className={style[bem.e('code')]}>
{`// 系统在每个文件顶部执行了下面这句解构，因此这些名字已占位：
const {
  React,
  useState, useEffect, useMemo, useCallback, useRef,
  useContext, useReducer, Fragment   // ← AppSDK 并未提供这三项，解构出来是 undefined
} = AppSDK || {};`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li>可直接使用的顶层名字：<code>AppSDK</code>、<code>React</code>、<code>useState</code>、<code>useEffect</code>、
        <code>useMemo</code>、<code>useCallback</code>、<code>useRef</code>，以及编译产物用到的 <code>require</code>、
        <code>module</code>、<code>exports</code>。</li>
      <li><code>useContext</code> / <code>useReducer</code> / <code>Fragment</code> 名字被占了但值是 <code>undefined</code>：
        在顶层再写 <code>{'const { Fragment } = React'}</code> 会撞重复声明，请放进函数体内，或直接写
        <code>React.Fragment</code> / <code>AppSDK.React.createContext</code>。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>AppSDK 完整命名空间</h4>
    <pre className={style[bem.e('code')]}>
{`AppSDK = {
  React,          // React 19 核心对象，含 createElement / Fragment / createContext 等
  useState, useEffect, useMemo, useCallback, useRef,   // 已解构到顶层

  Components: {   // 内置 UI 组件库（24 个具名导出，见「内置组件」章节）
    Button, Input, /* ... */
  },

  System: {       // 按进程隔离的存储 API，普通应用同样可用
    localStorage,
    sessionStorage,
    indexedDB,
  },

  API: {          // 进程级 API
    pid,          // 当前进程 ID
    navigate,     // 路由跳转（等价于 Props 里的 navigate）
    fetch,        // 安全 fetch（等价于 Props 里的 fetch，已冻结防止覆写）
    window,       // 窗口外壳控制：getRect / setRect / toggleMaximize / hibernate / close
                  // （勾上「隐藏标题栏」后由应用自行实现标题栏操作；无窗口外壳时 getRect 返回 null，其余调用只给日志）
  },

  hooks: {        // 普通应用只有 useFileSystem；系统应用为全量 Hooks
    useFileSystem,
  },

  middleware,     // 系统内嵌中间件组件（VfsImage / InteractiveAwakening），一般用不到

  kernel,         // ⚠ 见下方「kernel 的实际可用性」
}`}
    </pre>
    <div className={style[bem.e('tip')]}>
      <strong>kernel 的实际可用性：</strong>普通应用拿到的 <code>AppSDK.kernel</code> 只有
      <code>evokeApp</code> 与 <code>getTypeApps</code> 两个方法（都绑好了内核实例，可以直接调），
      其余内核能力只对系统应用开放——系统应用拿到的 <code>AppSDK.kernel</code> 是完整内核实例，
      方法面见「内核通信」一节。普通应用要跨应用交互就走这两个方法，或走状态层约定的 action。
    </div>

    <h4 className={style[bem.e('subtitle')]}>系统自动注入的 Props</h4>
    <p className={style[bem.e('text')]}>
      以下 Props 由系统渲染器自动传入根组件（单页 <code>main.jsx</code> 或多页 <code>layout.jsx</code>）：
    </p>
    <pre className={style[bem.e('code')]}>
{`export default ({
  state,          // 全局应用状态（来自逻辑入口 reducer），每次都是结构化克隆出的副本
  dispatch,       // 发送 Action 更新状态
  navigate,       // 路由跳转函数（仅多页应用有效）
  pid,            // 当前进程 ID（字符串）
  fetch,          // 安全 fetch，已绑定内核进程头（推荐使用）
  handleFocus,    // 提升当前窗口 z-index，无需参数（预览环境为空函数）
  reStartApp,     // 软重启：复用当前 worker 与 state，重新编译并挂载 UI（预览环境为空函数）
  forceReStartApp,// 硬重启：重建进程与 worker；只有关闭「保存状态」的应用才会清掉 state
}) => {
  return <div>...</div>;
};`}
    </pre>
    <p className={style[bem.e('text')]}>
      只有根组件拿到这八项；子组件要用就在 JSX 上显式往下传，或在函数体内用 <code>AppSDK.API</code>。
      结束当前进程没有对应 Prop，请走 <code>AppSDK.API.window.close()</code>。
    </p>

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
    <div className={style[bem.e('tip')]} style={{marginBottom: '12px'}}>
      <strong>先看可用性：</strong>本节列出的<strong>完整内核方法面只有系统应用能拿到</strong>（系统应用指的是编译进壳体的预置资源，
      见「系统权限」一节；与 <code>metaInfo.appType</code> 无关）。普通应用的 <code>AppSDK.kernel</code>
      只有 <code>evokeApp</code> 与 <code>getTypeApps</code> 两个方法，这两个是<strong>普通应用真正可用</strong>的跨应用能力，
      其余协作手段请走状态层约定的 action。
    </div>
    <p className={style[bem.e('text')]}>
      通过 <code>AppSDK.kernel</code> 可以访问底层系统的核心调度能力。最常用的是应用间的唤起与通信，以及检索特定类型的应用列表。
    </p>

    <h4 className={style[bem.e('subtitle')]}>应用唤起与通信 (evokeApp)</h4>
    <p className={style[bem.e('text')]}>
      我们的唤起行为并不是由 OS 去维护一份固定的行为处理操作表，而是由运行时执行，由 APP 主动指定目标进程 <code>pid</code> 和交互信息 <code>interactInfo</code>。
      <br /><br />
      底层实际分情况处理：如果 APP 没有启动，则调用 <code>startProcess</code> 启动并传入信息；如果已启动，则调用内核的
      <code>appIntereact</code>（内核方法名即为此拼写）发送信息。
      <br /><br />
      <b>数据流向：</b>传入的 <code>interactInfo</code> 会与 <code>from</code> 字段合并，并传递到下层目标应用的逻辑层（worker）中，
      最终 <b>直接作为 action</b> 交由 reducer 处理——所以目标应用的 reducer 必须认得这个 <code>type</code>。
      注意目标应用若没有逻辑层（关闭了 worker），这条 action 无处落地。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 发起方：唤起目标应用并传递信息（系统应用）
export default () => {
  const { kernel } = AppSDK;

  const openFile = () => {
    kernel.evokeApp({
      pid: 'my-editor-app', // 目标应用 PID（应用注册时生成，可在应用详情里查）
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

// 接收方（主逻辑入口，默认 logic.jsx）：处理唤起交互
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
      传入应用的类型标识，内核<strong>同步</strong>返回匹配的应用条目——筛选依据是每条记录的
      <code>metaInfo.appType</code> 与你给的字符串全等（如 <code>system</code>、<code>tool</code>），
      与"是否已安装/是否运行"无关，它扫的是内存里的全量注册表。可用于构建"打开方式"或"应用商店"列表。
    </p>
    <pre className={style[bem.e('code')]}>
{`export default () => {
  const { kernel } = AppSDK;
  const [editorApps, setEditorApps] = useState([]);

  useEffect(() => {
    // 接收参数: metaInfo.appType 的值
    const apps = kernel.getTypeApps('editor');

    // 每条是应用注册记录：pid、name、metaInfo（含 icon / version 等）
    // 显示名用 app.name —— 记录上没有 appName 字段
    const formattedApps = apps.map(app => ({
      id: app.pid,
      label: app.name || 'Unknown App',
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

    <h4 className={style[bem.e('subtitle')]}>系统应用可用的完整方法面</h4>
    <p className={style[bem.e('text')]}>
      系统应用拿到的 <code>AppSDK.kernel</code> 就是内核单样本体，方法比上面两个多得多。下面这份按"能不能安全读"分档，
      口径全部来自内核实现；<strong>普通应用一个都调不到</strong>（见本节开头）。
    </p>
    <pre className={style[bem.e('code')]}>
{`只读查询（同步，读的是内存注册表，不含磁盘）
  getApp(pid)                  注册记录 { pid, name, resourceId, metaInfo, status, savedState, isSystemApp }；查不到给 undefined
  getRunningApps()             status === 'RUNNING'，系统 + 用户应用一起扫
  getHibernatedApps()          status === 'HIBERNATED'，同上
  getInstalledApps()           只有用户应用（系统应用不进这张表）
  getTypeApps(appType)         按 metaInfo.appType 全等筛，与安装/运行状态无关
  getBlockEdApps()             按 custom.blockEd 筛
  getApps()                    是 async，返回全量并给每条附 isRunning
  getResource(resourceId)      内存资源缓存里的原始资源对象（含 content / precompiledContent / metaInfo）
  getPidByResourceId / getResourceIdByPid   两张映射表互查
  isSystemApp(pid)             是否系统应用
  getCachedState(pid)          CommHub 缓存的最近一次状态快照

生命周期与交互
  evokeApp / startProcess({pid, resourceId, interactInfo}) / appIntereact({process, interactInfo})
  hibernate(pid) / kill(pid) / forceKillProcess(pid) / reStartApp({pid}) / forceReStartApp({pid}) / forceResetApp(pid)
  clearAppSavedState(pid) / forceSaveAllStates() / restoreSession()
  saveWindowState(pid, rect) / updateWindowRect(pid, rect)
  dispatch(pid, action) / subscribeApp(pid, cb) / subscribeSystem(cb) / subscribe(topic, cb) / publish(topic, payload)

安装面（参数形状与开发者中心内部调用点耦合，不建议应用直接调）
  installApp / updateApp / deleteApp / executeInstallation / enqueueInstallTask / uploadResource / uploadCloud
  ensurePresets / loadAllResources / loadUserAppsFromDb / syncRegistry / syncRegistryByRes
  syncResourcesToFiles / writeAppFile / initializeSystemApps / updateResourceCustom / updateUserAppInfo
  getInstanceDb / initDatabases / reset / reinit / init / setDispatch / syncSystemAccess`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li><code>appIntereact</code> 的入参是<strong>目标进程的 worker 对象本体</strong>（<code>{'{process, interactInfo}'}</code>），
        不是 pid。它就是把 <code>{'{type:"APP_INTERACT", payload:interactInfo}'}</code> 塞进那条通道，
        所以 worker 关掉的应用收到等于没收到。</li>
      <li><code>{'startProcess({pid, interactInfo})'}</code> 三条路径都会把交互信息送进去：冷启动、从休眠唤醒、以及本来就在
        <code>RUNNING</code>（第三种等同于 <code>appIntereact</code> 直投）。所以"已经在跑也要送到"
        用 <code>startProcess</code> 或 <code>evokeApp</code> 都行，区别只是后者会自动补 <code>from</code> 字段。</li>
      <li><code>subscribe*</code> 返回的都是取消订阅函数，务必在 <code>useEffect</code> 的清理里调用；
        主题通道的收发口径见「解析与分层」末节。</li>
      <li>还有一条隐式通道：给 <code>dispatch(pid, action)</code> 传
        <code>{'{type:"KERNEL_CALL", payload:{method, args}}'}</code>。系统应用分支里目前<strong>只实现了</strong>
        <code>method: 'UPLOAD_RESOURCE'</code>，成功/失败会以 <code>{'{type:"MSG", payload:"..."}'}</code> 回到你的 reducer；
        其他 method 一律弹"未找到对应处理器!"，非系统应用走的分支没有任何 case，同样是弹提示。</li>
    </ul>
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

    <h4 className={style[bem.e('subtitle')]}>普通应用可用组件（全量 24 个具名导出）</h4>
    <p className={style[bem.e('text')]}>
      <code>AppSDK.Components</code> 就是宿主 <code>src/component/main.jsx</code> 的具名导出集合，不多不少这 24 个：
    </p>
    <pre className={style[bem.e('code')]}>
{`交互控件   Button, Input, Check, CheckGroup, CheckCardBar,
           Select（下拉）, BoardSelection（面板选择）, DateGoogle（日期选择）
容器布局   Page, GeneralPurposePage, InfoList, PageList, Nav, RoolWrapper
反馈浮层   alert, confirm, AlertConfirm, Notification, OverPlay, ContextMenu, Loading
其他       Logo, getLogoBase64Url`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li><code>Button</code>：通用按钮，支持 <code>type="danger"</code> 等变体。<code>Input</code>：<code>forwardRef</code> 组件，支持受控/非受控。</li>
      <li><code>alert</code> 与 <code>confirm</code> 是<strong>命令式对象</strong>而不是组件：
        <code>alert.success(info)</code> / <code>alert.failure</code> / <code>alert.warning</code> / <code>alert.dark</code>，
        <code>{'confirm.show({ title, content, onConfirm })'}</code> / <code>confirm.hide()</code>。直接当 JSX 标签用会得到无效元素。
        它们的渲染节点由宿主根挂载的 Provider 提供（portal 到宿主 <code>document.body</code>），应用侧不需要也无法自己挂载。</li>
      <li>只有 <code>export default</code> 的组件（如 <code>AlertProvider</code>）<strong>不在这份名单里</strong>；
        <code>formData</code>、<code>tag</code>、<code>title</code> 三个目录没有具名导出，因此也没被注册。
        需要的能力请自己写在内容包里，用相对 <code>import</code> 引入。</li>
      <li>这套组件依赖宿主的 Emotion 主题上下文，物理沙箱下已经通过 CacheProvider 接好；
        <strong>请不要试图 <code>import</code> <code>@mui</code> 之类的第三方包</strong>——沙箱的 <code>require</code> 只认你内容包里的模块 key。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>系统应用额外组件</h4>
    <ul className={style[bem.e('list')]}>
      <li><code>Developer</code>：开发者工具面板</li>
      <li><code>FileSystem</code>：文件系统浏览器</li>
      <li><code>NoteBook</code>：笔记本组件</li>
      <li><code>Setting</code>：设置面板</li>
      <li><code>Start</code>：应用启动器</li>
      <li><code>Store</code>：应用商店</li>
      <li><code>LocalDev</code> / <code>SystemDashboard</code> / <code>DrawBoard</code> / <code>Sheet</code></li>
    </ul>
    <p className={style[bem.e('text')]}>
      这一档挂在 <code>adminAppSdk</code> 上，只有登记为系统预置资源的应用能拿到（判定看内核注册表里的系统应用标记，
      <code>appType</code> 写 <code>'system'</code> 并不会给你这些能力）；
      同时系统应用的 <code>hooks</code> 是全量（10 个），普通应用只有 <code>useFileSystem</code>。
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 数据存储
// ─────────────────────────────────────────────────────────────────────────────
const StorageSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>数据存储隔离 (AppSDK.System)</h2>
    <p className={style[bem.e('text')]}>
      系统自动为每个应用提供隔离的存储空间。所有操作自动加进程前缀（<code>pid-&lt;进程ID&gt;_</code>），
      实现命名空间隔离，应用间数据完全不互通。卸载应用时这份前缀下的 <code>localStorage</code>、
      <code>sessionStorage</code> 键会被清掉，IndexedDB 那份要浏览器提供 <code>databases()</code> 才列得出来（细节见下文）。
    </p>

    <div className={style[bem.e('tip')]}>
      <strong>请一律走 <code>AppSDK.System</code>：</strong>页面代码里<strong>裸写的</strong> <code>localStorage</code>
      并不会被换成代理——UI 前导块只绑定了 <code>window</code> / <code>self</code> / <code>globalThis</code> /
      <code>document</code> / <code>navigator</code> / <code>fetch</code> 那几个名字，<code>localStorage</code>、
      <code>sessionStorage</code>、<code>indexedDB</code> 三个裸名<strong>没有绑定</strong>，
      于是它沿作用域链落到"代码所在 realm 的真实全局"。四种执行点的表现因此不一致：
      <ul className={style[bem.e('list')]}>
        <li>物理沙箱与幽灵 iframe：这两个 realm 上的原生存储被拦成 getter，一访问就抛"拒绝直接访问原生 API"。</li>
        <li>桥接模式（单 Iframe / Virtual Worker 共用一个沙箱 iframe）与寄生模式（直接用宿主 <code>window</code>）：
          没有这层拦截，读写的是整个系统共用的那份真存储——<strong>应用之间串数据，卸载也不清</strong>。</li>
      </ul>
      写 <code>window.localStorage</code> 是安全的：<code>window</code> 就是进程代理，取到的正是带前缀的那份
      （<code>window.System</code> 同样指向这份 <code>AppSDK.System</code>）。但这条不适用于会话存储——
      页面侧的代理只配了 <code>localStorage</code> / <code>indexedDB</code> 两项，<code>window.sessionStorage</code>
      取到的是 <code>undefined</code>，要用它只能写 <code>System.sessionStorage</code>。
      这正是"统一写 <code>System.*</code>"的理由：三种存储在那边都齐、口径一致。
    </div>

    <h4 className={style[bem.e('subtitle')]}>localStorage / sessionStorage</h4>
    <p className={style[bem.e('text')]}>
      <code>System.localStorage</code> 与 <code>System.sessionStorage</code> 是原生 Storage 之上的代理，
      除了常规四个方法，还能直接当对象用：
    </p>
    <pre className={style[bem.e('code')]}>
{`// 正确用法
export default ({ state }) => {
  const { System } = AppSDK;

  // 写入（实际 key 为 "pid-<进程ID>_userProfile"）
  System.localStorage.setItem('userProfile', JSON.stringify({ name: 'Alice' }));

  // 读取
  const raw = System.localStorage.getItem('userProfile');
  const profile = raw ? JSON.parse(raw) : null;

  // 删除
  System.localStorage.removeItem('userProfile');

  // 遍历当前应用所有 key（已去除前缀）
  const keys = Object.keys(System.localStorage);

  // 额外可用的等价写法
  System.localStorage.userProfile;      // == getItem('userProfile')
  System.localStorage.userProfile = '{}';// == setItem
  'userProfile' in System.localStorage;  // == getItem(...) !== null
  delete System.localStorage.userProfile;
  System.localStorage.length;            // 本应用键数量（不含别人的键）
  System.localStorage.key(0);            // 第 0 个键名，已去前缀
  System.localStorage.clear();           // 只清本应用，不动全局

  return <div>{profile?.name}</div>;
};

// 错误用法：裸名存储。UI 前导块没有绑定这三个名字，它落到代码所在 realm 的真实全局——
// 在物理/幽灵沙箱里直接抛错，在桥接与寄生模式下写进全系统共用的那份存储（不隔离、卸载也不清）
localStorage.setItem('key', 'val');
indexedDB.open('my-db');

// 可行但不推荐：window 是进程代理，window.localStorage 取到的正是带前缀的那份，
// 与 System.localStorage 等价。请统一写 System.*，少一种需要读者去确认的写法
window.localStorage.setItem('key', 'val');`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li>值始终是字符串：代理不做 JSON 序列化，存对象前自己 <code>stringify</code>；
        用属性写法赋非字符串时会被原生 Storage 转成 <code>"[object Object]"</code>。</li>
      <li>存储配额是<strong>整个站点共享</strong>的，前缀只隔离命名不隔离容量。</li>
      <li><code>sessionStorage</code> 随浏览器标签页生命周期，刷新即失，不要拿它当持久层。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>IndexedDB</h4>
    <p className={style[bem.e('text')]}>
      数据库名称自动添加 <code>pid-&lt;进程ID&gt;_</code> 前缀。使用方式与原生 IndexedDB API 完全一致，
      仅入口替换为 <code>AppSDK.System.indexedDB</code>。代理只接管三件事：
      <code>open(name, version)</code> 与 <code>deleteDatabase(name)</code> 会自动补前缀，
      <code>databases()</code> 固定返回空数组（原生实现会暴露其他应用的库名）——所以不要靠
      <code>databases()</code> 列举自己的库，请自己维护库名清单。
    </p>
    <p className={style[bem.e('text')]}>
      卸载时的清理同样是靠前缀匹配的：读写 <code>localStorage</code> / <code>sessionStorage</code> 的键能逐个清掉，
      但 IndexedDB 那一份要先靠 <code>indexedDB.databases()</code> 列出库名才能删——这个方法只有 Chromium 系提供，
      换浏览器时你的库会留在盘上（前缀还在，名字可预测）。别把 IndexedDB 当作"卸载即蒸发"的私密空间。
    </p>
    <pre className={style[bem.e('code')]}>
{`export default () => {
  const { System } = AppSDK;

  const openDB = () => {
    // 实际打开的数据库名为 "pid-<进程ID>_myDB"
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
      <strong>三种写法等价，请用其中任意一种：</strong>沙箱在代码外面包了一层块级作用域，
      里面的 <code>fetch</code> 已经被换成带进程头的实现（<code>window</code> / <code>self</code> / <code>globalThis</code>
      上的 <code>fetch</code> 同样指向它），因此 <code>fetch(...)</code>、Props 注入的 <code>fetch(...)</code>、
      <code>AppSDK.API.fetch(...)</code> 走的是同一个函数。不可用的是 <code>XMLHttpRequest</code> 与
      <code>importScripts</code>：逻辑层把这两个名字直接绑成 <code>undefined</code>，页面层的
      <code>XMLHttpRequest</code> 同样绑成 <code>undefined</code>（<code>importScripts</code> 在 window realm
      本就不存在）；经由 <code>window</code> / <code>self</code> / <code>globalThis</code> 访问它们则直接抛 Security Error。
      <br />
      <strong>请注意这条边界：</strong>安全 fetch 只加请求头，<strong>不做域名白名单</strong>——
      白名单管的是 <code>document.createElement('script' | 'link' | 'iframe')</code> 的 <code>src</code>/<code>href</code>。
      所以不要以为请求发不出去，跨域与隐私限制按浏览器原生规则来。
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

// 等价写法：window / self / globalThis 都指向沙箱代理，取到的就是这个安全 fetch
window.fetch('https://api.example.com/data');

// 不可用：XMLHttpRequest 被遮蔽成 undefined
const xhr = new XMLHttpRequest();   // TypeError: XMLHttpRequest is not a constructor`}
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
// CDN 规范
// ─────────────────────────────────────────────────────────────────────────────
const CdnSpecSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>CDN 资源引入规范</h2>

    <h4 className={style[bem.e('subtitle')]}>安全白名单（只管 script / link / iframe 三种标签）</h4>
    <p className={style[bem.e('text')]}>
      检查发生在沙箱化的 <code>document.createElement</code> 上：只有 <code>script</code>、<code>link</code>、
      <code>iframe</code> 三种标签会被套上 <code>src</code>/<code>href</code> 的写拦截，
      <code>img</code> / <code>video</code> / <code>audio</code> / <code>a</code> 这些标签、以及
      <code>fetch</code> / <code>WebSocket</code> / <code>Worker</code> 都<strong>不经过这份白名单</strong>。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 全球 CDN
https://unpkg.com/
https://cdn.jsdelivr.net/

// 国内镜像/替代源
https://cdn.bytedance.com/
https://lf3-cdn-tos.bytecdntp.com/cdn/
https://cdn.bootcdn.net/
https://cdn.bootcss.com/
https://cdn.staticfile.org/
https://g.alicdn.com/
https://npm.elemecdn.com/`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li>判定是<strong>前缀匹配</strong>（<code>startsWith</code>）：命中以上任一条即放行，所以
        <code>https://unpkg.com.evil.test/x.js</code> 这种"伪装前缀"同样能过——白名单是防误用，不是对抗恶意输入。</li>
      <li>另外四类地址<strong>无条件放行</strong>：以 <code>/</code> 或 <code>./</code> 开头的站内相对路径、
        <code>blob:</code>、<code>data:</code>，以及空值。所以本地静态资源直接写相对路径就行。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>引入规范</h4>
    <pre className={style[bem.e('code')]}>
{`// 正确：使用白名单内的国内 CDN，并指定明确的版本号
const loadLodash = () => {
  const script = document.createElement('script');
  script.src = 'https://lf3-cdn-tos.bytecdntp.com/cdn/expire-1-M/lodash.js/4.17.21/lodash.min.js';
  document.body.appendChild(script);
};

// 错误：赋值时就抛 Security Error: URL '...' is not whitelisted.
const script = document.createElement('script');
script.src = 'https://unknown-personal-domain.com/js/lodash.js';
// 用 setAttribute 写同样会被拦下来，两条路径共用一次检查`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>最佳实践与常见陷阱</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>必须锁定版本</strong>：严禁引入未指定具体版本号的链接（例如 <code>unpkg.com/lodash</code>），必须锁死版本号（如 <code>@4.17.21</code>），以防上游非兼容性更新导致线上故障。</li>
      <li><strong>推荐使用国内镜像</strong>：在国内生产环境运行的业务，建议优先选择字节跳动（lf3-cdn-tos）、静态文档等国内源，避免使用 <code>unpkg.com</code> 等未在国内加速的源。</li>
      <li><strong>异步与卸载</strong>：动态注入的 script 或 link 标签，建议在 <code>useEffect</code> 内执行，并在组件卸载（unmount）时清理动态创建的 DOM 节点，避免内存泄漏。</li>
      <li><strong>注入到哪里</strong>：物理沙箱（普通应用的默认模式）下 <code>document</code> 就是本应用自己的 iframe，
        所以动态 script 挂上来的全局变量（<code>window._</code> 之类）只在本应用窗口内可见，窗口销毁即消失；
        不同应用各引各的版本，互不干扰。桥接/寄生模式下会落到宿主文档，请避免污染全局名。</li>
      <li><strong>Blob 里的 JS 也会被沙箱化</strong>：用 <code>{'new Blob([code], {type:"text/javascript"})'}</code> 造出的
        Worker/脚本，系统会在内容前后拼上一段影子沙箱代码（自带按进程隔离的 <code>localStorage</code> /
        <code>indexedDB</code> / <code>fetch</code>，并禁掉 <code>eval</code>），因此递归 Worker 拿不到真实原生存储。</li>
    </ul>
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
      <li><strong>第 4 次（0.5s 后）：</strong>硬重启，调用 <code>forceReStartApp()</code>——重建进程与 worker。
        注意它<strong>不一定清空 state</strong>：只有把「保存状态」（<code>metaInfo.saveState</code>）关掉的应用才会丢状态，
        开了保存的应用硬重启后看到的仍是上次持久化的 state。</li>
      <li><strong>同类错误 5 秒节流：</strong>两次崩溃间隔小于 5 秒且已经重试过时，不再排队重试，
        直接把窗口交给最终错误 UI——防止一个必崩的组件以毫秒级把主线程烧掉。</li>
      <li><strong>超出上限：</strong>展示错误 UI，停止自动重试，等待用户操作。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>错误 UI 功能</h4>
    <p className={style[bem.e('text')]}>
      界面上方标题就是失败阶段，五档：<code>输入校验</code> / <code>Babel 转译</code> / <code>沙箱构建</code> /
      <code>初始化运行</code> / <code>未知阶段</code>（内部 phase 标识分别是
      <code>validate</code> / <code>babel</code> / <code>compile</code> / <code>runtime</code> / <code>unknown</code>）。
      面板里能看到错误消息、源码行列位置、<code>error.stack</code> 以及 React 组件树调用栈（<code>componentStack</code>），可展开复制。
    </p>
    <ul className={style[bem.e('list')]}>
      <li><strong>重试进行中：</strong>重新编译 ｜ 立即重试 ｜ 复制错误信息 ｜ 关闭应用</li>
      <li><strong>最终失败：</strong>重新编译 ｜ 再次重试 ｜ 复制错误信息 ｜ 关闭应用 ｜ <strong>重启系统</strong>（会二次确认，刷新整个页面）</li>
      <li><strong>重新编译：</strong>只清宿主侧编译缓存并重建 factory，不重启 worker，state 保留——
        适合"代码没错但缓存脏了"。</li>
      <li><strong>再次重试 / 立即重试：</strong>把 retryCount 归零后走硬重启。</li>
      <li><strong>关闭应用：</strong>由窗口外壳强制执行 <code>kernel.forceKillProcess(pid)</code>（不是软休眠，窗口位置也不会保存）。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>手动控制重启（应用侧写法）</h4>
    <pre className={style[bem.e('code')]}>
{`export default ({ state, reStartApp, forceReStartApp }) => {
  return (
    <div>
      {/* 软重启：复用 worker 与 state，重新编译并挂载 UI */}
      <button onClick={reStartApp}>刷新应用</button>

      {/* 硬重启：重建进程与 worker；仅关闭「保存状态」时才会清 state */}
      <button onClick={forceReStartApp}>重置应用</button>

      {/* 结束进程：走窗口外壳 API，没有对应的 Prop */}
      <button onClick={() => AppSDK.API.window.close()}>关闭</button>
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
      当应用被识别为 Bundle（多文件应用）时，Worker 在初始化 state 时补上 <code>state.router = {'{ path: "home" }'}</code>
      （只在你自己的 <code>initialState</code> 里没有 <code>router</code> 时才补，你已经写的值不会被覆盖），
      并拦截 <code>NAVIGATE</code> action 改写 <code>router.path</code>。
      两条都<strong>只对 Bundle 生效</strong>：单页应用里 <code>navigate('x')</code> 只会把 action 发到 reducer，
      系统不会替你切页；<code>state.router.path</code> 也就是你 <code>initialState</code> 里给的那个值。
    </p>
    <ul className={style[bem.e('list')]}>
      <li>当前页由渲染侧读取 <code>state.router.path</code>（缺省 <code>'home'</code>）后解析成模块 key，
        再把命中的页面组件作为 <code>PageComponent</code> 传给视图入口。所以导航状态是<strong>应用状态的一部分</strong>：
        持久化了 state 的应用重开时会停在上次的页面上。</li>
      <li>路由 path 与模块 key 同一套规范化：给 <code>home</code> 会依次尝试 <code>home</code>、<code>./home</code>、
        <code>home/index</code>、<code>./home/index</code>；解析不到时页面区域渲染 <code>404 — 路径</code>，不会整窗崩掉。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>文件结构规范</h4>
    <p className={style[bem.e('text')]}>
      以下文件名只是<strong>默认入口约定</strong>，可在「设置 → 入口约定」里按当前用户改写（支持 <code>*</code> /
      <code>**</code> / <code>?</code> 通配）。发布时系统会把当时的识别结果固化进资源，运行时不再读取本机配置。
    </p>
    <ul className={style[bem.e('list')]}>
      <li><code>layout.jsx</code>（多页必须）：视图入口，接收 <code>PageComponent</code> prop，负责导航栏等全局布局。
        多页面靠它选页，缺失时运行时会回落到名为 <code>layout</code> 的模块，找不到就只剩白屏——发布会被拦下，但把文件补齐更好。</li>
      <li><code>logic.jsx</code>（可选）：主逻辑入口，定义全局 state 和 reducer。<strong>自身严禁使用 export</strong></li>
      <li>辅逻辑入口与逻辑层模块（可选）：谁是主块由入口模式的<strong>声明顺序</strong>决定，其余命中入口规则的文件是辅逻辑入口；
        被主逻辑块 <code>import</code> 到的目标不必命中任何入口规则，同样算逻辑层。两条判定与取用写法见「解析与分层」。</li>
      <li><code>home.jsx</code>（推荐）：默认首页，路由为 <code>'home'</code></li>
      <li><code>*.jsx</code>：其他页面，路由路径就是模块 key（<code>navigate('about')</code> 命中 <code>about.jsx</code>
        或 <code>about/index.jsx</code>；放在子目录里的页面要写完整路径 <code>navigate('pages/about')</code>）</li>
      <li><code>*.css</code> / <code>*.module.css</code>：样式文件，通过 <code>import './style.css'</code> 或 <code>import styles from './style.module.css'</code> 导入，系统自动 Scope</li>
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
// 解析与分层：入口约定 → 内容包 → 两套 require → 分层校验
// ─────────────────────────────────────────────────────────────────────────────
const LayeringSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>解析与分层</h2>
    <p className={style[bem.e('text')]}>
      一个应用从「工作区里的一堆文件」变成「能跑起来的资源」要过四道：<strong>入口约定解析</strong>（谁是状态机、谁是视图框架）、
      <strong>内容包与模块 key</strong>（哪些文件随资源走、以什么名字被找到）、<strong>两套 require</strong>（页面与 worker
      各自如何解析 <code>import</code>）、<strong>分层校验</strong>（发布前把只有 worker 才会炸的问题提前报出来）。
      本节是这四道的完整口径，其他章节涉及入口、导入、导出的描述都以这里为准；末了附沙箱能力边界与文件格式 / 编译器口径。
    </p>

    <h4 className={style[bem.e('subtitle')]}>1. 入口约定：哪些文件是入口</h4>
    <p className={style[bem.e('text')]}>
      入口文件名不是硬编码约定，而是「设置 → 入口约定」里的三条模式，按登录用户各自保存。
    </p>
    <pre className={style[bem.e('code')]}>
{`配置项         默认值       作用
logicEntries   logic.jsx    逻辑入口模式列表（可写多条）：命中的第一个文件是主逻辑入口（状态机），其余是辅逻辑入口
viewEntry      layout.jsx   多页应用的视图框架入口，负责接收 PageComponent 并渲染导航
mainEntry      main.jsx     单页应用的内容入口`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li><strong>按用户隔离</strong>：配置存在浏览器本地（<code>su:dev:entry:用户ID</code>）；未登录时只使用默认值且不落盘，因此每台登录环境各自一套。</li>
      <li><strong>只影响开发期</strong>：发布时系统把当时的解析结果固化进资源的 <code>entries</code>，运行时读的是资源里这份结果，不再回读本机配置——应用装到别人机器上，行为不随对方的入口约定漂移。</li>
      <li><strong>缺 entries 的旧资源</strong>：回落成「视图入口 = <code>layout</code>、无逻辑入口」，所以老应用不会因为新增了这条机制而改变行为。</li>
      <li><strong>只有 <code>logicEntries</code> 支持通配</strong>。<code>viewEntry</code> 与 <code>mainEntry</code> 是"按名字定位一个文件"：
        会忽略 <code>.jsx</code> / <code>.js</code> 的差异（写 <code>layout</code> 也能命中 <code>layout.jsx</code>），
        但<strong>不认通配符，也不做目录展开</strong>——把 <code>viewEntry</code> 写成 <code>*layout.jsx</code> 或
        <code>layout</code>（目录式 <code>layout/index.jsx</code>）都定位不到，多页应用会因"缺视图入口"直接发布失败。</li>
      <li>参与匹配的是<strong>相对工作区根、带扩展名的路径</strong>，目录占位（值为 <code>null</code> 的条目）不参与。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>模式写法与主入口的选取顺序</h4>
    <pre className={style[bem.e('code')]}>
{`logic.jsx        精确路径：不含通配符时整串全等比较（其中的 . 就是普通句点）
*.logic.js       段内通配：不跨越目录层级，能命中 main.logic.js，命中不了 sub/main.logic.js
store/**         跨段通配：store/api.js 与 store/deep/util.js 都算命中
**/index.jsx     任意层级下的 index.jsx（含根级的 index.jsx）
logic?.jsx       单字符通配：logicX.jsx 命中，logic.jsx 不命中`}
    </pre>
    <div className={style[bem.e('tip')]}>
      <strong>主入口由顺序决定，不由文件名决定：</strong>命中集合按「模式声明顺序 → 路径字母序」排列，<strong>第一个</strong>才是主逻辑入口。
      把宽的模式写在 <code>logic.jsx</code> 前面，状态机就会落到别的文件上。
    </div>
    <pre className={style[bem.e('code')]}>
{`logicEntries = ['store/**', 'logic.jsx']
工作区：logic.jsx、store/api.jsx、store/deep/util.jsx
命中顺序：store/api.jsx → store/deep/util.jsx → logic.jsx
结果：主逻辑入口 = store/api ｜ 辅逻辑入口 = store/deep/util、logic`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>2. 内容包与模块 key</h4>
    <p className={style[bem.e('text')]}>
      随资源发出去的文件集合叫<strong>内容包</strong>。每个文件折成一个模块 key：<code>.jsx</code> / <code>.js</code>
      去扩展名但保留相对路径（<code>pages/home/index</code>），<code>.css</code> 保留扩展名（<code>styles/global.css</code>）。
      发布、预览、worker、路由解析使用同一口径。
    </p>
    <ul className={style[bem.e('list')]}>
      <li>文件树里的目录占位不入包。</li>
      <li>去扩展名后同名的两个文件（<code>home.jsx</code> 与 <code>home.js</code>）入包会互相覆盖，发布前报 <code>key-conflict</code>。</li>
      <li>主逻辑块<strong>不进内容包</strong>：它单独占用资源的逻辑字段（原文一份、预编译产物一份）。它要的是"按名字识别状态机"，而不是"按 key 被 require"。</li>
      <li>路由解析与 <code>require</code> 用同一类候选补全：给定路由 <code>home</code>，会依次尝试 <code>home</code>、<code>./home</code>、
        <code>home/index</code>、<code>./home/index</code>。也就是说平铺的 <code>home.jsx</code> 与目录式的 <code>home/index.jsx</code>
        都能被 <code>navigate('home')</code> 命中；但路由路径含目录层级，<code>pages/home/index.jsx</code> 要用 <code>navigate('pages/home')</code> 进入。</li>
    </ul>
    <p className={style[bem.e('text')]}>单页与多页发出去的东西不同，这条直接决定能力上限：</p>
    <pre className={style[bem.e('code')]}>
{`形态    内容包                      主逻辑块                    能被 import 的目标
单页    一个视图字符串              原文 + 预编译产物各一份       全局 SDK，没有随资源的模块文件
多页    模块 key → 源码 的映射       同上                         内容包里的任意模块`}
    </pre>
    <div className={style[bem.e('tip')]}>
      <strong>单页形态下主逻辑块不要写相对 import。</strong>那种载荷里只有一个视图字符串，你工作区中的模块文件根本不会随资源走，
      装完在 worker 里 <code>require</code> 必炸；要拆模块请改用多页面（bundle）发布。
    </div>
    <ul className={style[bem.e('list')]}>
      <li>单页那份视图字符串在渲染侧被登记成固定的模块 key <code>main</code>（与你的 <code>mainEntry</code> 文件名无关），
        所以它内部 <code>require</code> 不到任何东西。</li>
      <li>资源里固化的 <code>entries</code> 只有三项：<code>view</code> / <code>logicMain</code> / <code>logicAux</code>，
        <strong>不含单页内容入口</strong>——单页走的是"整个 content 当一个视图"这条独立分支。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>3. 预编译与双份存储</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>原文与产物分开存</strong>：编辑器、更新面板、写回本地盘读的是你写的原文；执行读的是编译好的产物。所以你重新打开应用看到的仍是自己写的 JSX。</li>
      <li><strong>编译发生在发布与预览那一刻</strong>，不是每次打开应用时。Babel 不可用时会降级为原文注入，此时带 <code>import</code> 的主逻辑块在 worker 里是整块语法错误。</li>
      <li><code>.js</code> 与 <code>.jsx</code> <strong>走同一条 Babel 通道</strong>：内容包里的模块 key 已经去掉扩展名，
        编译入口按 key 猜格式时拿不到 <code>.js</code>，一律按 JSX 交给 Babel；主逻辑块的预编译更是直接传
        <code>&lt;key&gt;.jsx</code>。所以 <code>.js</code> 里写 <code>import</code> 会被正常转成 <code>require</code>；
        <em>不要</em>指望"写成 <code>.js</code> 就绕过编译"。</li>
      <li>源码里确实有一个"JS 直接透传"的编译策略，但它只在编译入口收到<strong>以 <code>.js</code> 结尾的 key</strong> 时才生效——
        正常发布链路会去掉扩展名，永远造不出这种 key。唯一可能的来源是手工构造或历史遗留的云端载荷：
        那种模块会被原样存进预编译产物，<code>import</code> 没转成 <code>require</code>，求值时直接语法错误。</li>
      <li>因此 <code>.json</code> / <code>.ts</code> 这类后缀也别写：它们同样会被当 JSX 送去 Babel，然后报语法错误。</li>
      <li>JSX 标签被编译成 <code>AppSDK.React.createElement</code>，这就是页面里不需要 <code>import React</code>、也不允许在文件顶层重复解构 React 的原因。</li>
      <li>系统应用跳过安装期预编译（恒走原文分支），便于审计与热调试。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>4. 两套 require 与导入导出规则</h4>
    <p className={style[bem.e('text')]}>
      <code>import</code> 在两侧都会被编译成内核注入的 <code>require</code>，但两侧是<strong>不同的注册表</strong>，行为有实质差别：
    </p>
    <pre className={style[bem.e('code')]}>
{`UI 侧（页面层）      每个模块编译后进入 moduleRegistry，页面可以 import 组件与工具模块
                    每个模块以形参拿到 module / exports / AppSDK / 注册表 / 自己的 key / 全部 key
                    解析不到 → 抛 Sandbox Require Error
worker 侧（逻辑层）  主逻辑块内联在沙箱块作用域里（拿到块级的 dispatch / require），
                    辅逻辑模块按需惰性求值，形参是 module / exports / require / api
                    解析不到 → 抛 require 失败，并区分「不在内容包」与「在包里没有产物」`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li><strong>相对路径以调用方文件所在目录为基准</strong>：<code>pages/home/index.jsx</code> 里写 <code>../utils/format</code>
        指向的是 <code>pages/utils/format</code>，要到根级得写 <code>../../utils/format</code>。扩展名与 <code>index</code> 会自动补全，
        带 <code>.css</code> 后缀的样式说明符按原样匹配。</li>
      <li><strong>组件还是模块，看导出形状</strong>：<code>export default</code> 一个函数 = 组件（可被 import 复用）；具名导出 =
        模块（工具函数、常量）。视图入口与页面模块的 <code>default</code> <strong>必须是组件</strong>：
        渲染侧取的就是 <code>module.exports.default || module.exports</code>，然后当 React 节点用。
        写错不会被编译器拦下（<em>只有预览期会校验"入口模块有没有 default 导出"这一步</em>），
        而是在「初始化运行」阶段抛一句 React 层面的晦涩错误——报出来的栈离你的代码很远，请靠自己约定避免。</li>
      <li><strong>跨层复用的值请用具名导出</strong>：worker 侧的 <code>require</code> 有个解包约定——目标模块产物只含
        <code>__esModule</code> 与 <code>default</code> 两个键时（即"只有默认导出"），直接把 <code>default</code> 的值当作模块结果返回，
        好让 <code>import X from './x'</code> 在 worker 里照常工作。代价是 <code>{"import { x } from './x'"}</code>
        这种按名字取法在两侧都拿到 <code>undefined</code>（UI 侧不解包，但同样没有这个名字），且<strong>不会报任何错</strong>。
        既可能被当组件又可能被当值用的模块，请用具名导出。</li>
      <li><strong>主逻辑块自身禁止 <code>export</code></strong>：内核按名字识别本块里的 <code>initialState</code> /
        <code>reducer</code> / <code>init</code>，要复用逻辑就抽成普通模块文件由它 import。</li>
      <li>只有命中入口规则的辅逻辑模块会在 UI 侧跳过执行；不命中任何规则的普通模块在 UI 侧仍会求值一次。
        所以页面可以直接 import 普通模块共享常量与纯函数，但<strong>不要 import 辅逻辑入口文件</strong>：
        同一份副作用会在 UI 与 worker 各跑一次，且 worker 注入的 <code>api</code> 在 UI 侧不存在。</li>
      <li>逻辑层不得引入 React/JSX（worker 没有 UI 运行时），也不得引入样式（worker 没有 CSS 模块）。</li>
      <li><strong>worker 侧 <code>require</code> 的注入清单</strong>：每个逻辑模块以形参拿到 <code>module</code> / <code>exports</code> /
        <code>require</code> / <code>api</code> 四样，<code>require</code> 只认内容包里的模块 key。
        <code>react</code> 在 worker 侧<strong>没有</strong>特例，写了就是「不在内容包」；UI 侧才有这条放行——
        <code>import React from 'react'</code> 与 <code>react/jsx-runtime</code> 会直接返回 <code>AppSDK.React</code>。</li>
      <li><strong>worker 侧取不到模块时分三种报错</strong>：不在内容包（路径写错，或单页发布没带上）、
        在包里但没有预编译产物（安装期编译失败，或系统应用跳过预编译）、命中了样式文件（CSS 不进预编译产物，请把样式放页面层）。
        另外目标模块产物一旦含 UI 依赖（<code>AppSDK.React</code> / Hook），会在 require 前被拦下并指名该模块。</li>
      <li>两侧模块求值都是 CommonJS 语义：<code>module.exports = xxx</code> 会被采纳，导出对象先登记再求值，
        因此循环依赖（a ↔ b）拿到的是半成品导出而不是递归爆栈——但被依赖模块的副作用顺序仍需自己保证。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>5. 分层校验：发布前拦什么</h4>
    <pre className={style[bem.e('code')]}>
{`硬故障（预览与发布都拦下来）
  key-conflict          去扩展名后同名，入包会互相覆盖
  logic-imports-css     逻辑层引入样式，worker 侧没有 CSS 模块
  logic-import-missing  逻辑层引用的目标不在这次发布的载荷里
  logic-exports         主逻辑块写了 export，内核取不到状态机
软约束（预览只提示，发布仍拦）
  page-imports-aux      页面引入辅逻辑入口，副作用会在 UI 与 worker 各跑一次`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li><strong>校验对象是这次真正会被发出去的载荷</strong>，不是本机文件树：单页只装视图入口与主逻辑块，主块里那句
        <code>import './store/counter'</code> 在这条通道上就会被判 missing。</li>
      <li>触发点各处口径不同，照这张表用：
        <pre className={style[bem.e('code')]}>
{`开发者中心 · 创建应用        硬 + 软 全拦
开发者中心 · 预览            只拦硬故障，软约束降级为提示
上传面板 · 单文件 (.jsx/.js)  选择时不跑（该通道也没有逻辑层）
上传面板 · 多页文件夹        视图入口必须存在 → 按整个文件夹校验
上传面板 · 单页文件夹        有辅逻辑入口即失败 → 只按真实载荷（视图入口 + 主块）校验
更新面板 · 选择文件时        同上传面板三条通道
更新面板 · 点击更新前        对最终载荷复检一次（单文件通道也走这条）
本地开发 · 注册与更新        任一问题即拦（硬软不分档），恒按 bundle 载荷跑`}
        </pre>
        <strong>硬/软分档目前只有开发者中心（创建、预览）用</strong>：其他面板是"有问题就中断"，
        所以 <code>page-imports-aux</code> 这类软约束在上传/更新/本地开发通道上同样是硬墙。</li>
      <li>设置面板的「运行分层检查」是手动档，用的就是当前发布形态的同一份校验，结果缓存到入口约定或内容变化为止。</li>
      <li>扫描只看源码文本：注释行里的示例路径不算依赖，<code>import</code> 与 <code>require</code> 同等识别；
        但<strong>动态 <code>import('./x')</code> 完全看不见</strong>（识别靠正则匹配静态形式），
        写在条件分支里的动态 <code>require</code> 也只有真走到那条分支才会暴露。</li>
      <li>覆盖范围是主逻辑块与辅逻辑入口的<strong>一层直接依赖</strong>：辅逻辑模块再往下引的目标不在包内时，
        发布校验不报，要等 worker 真求值那一步才炸。页面层 import 只有"引到辅逻辑入口"这一种情况会被记下（软约束），
        <strong>页面 import 主逻辑入口或任意不存在的目标都不在拦截范围内</strong>。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>6. 沙箱能力边界</h4>
    <p className={style[bem.e('text')]}>
      两侧的执行体都是"你的代码被包进一段前导声明的块级作用域"，全局名字逐个被替换成受控版本。
      下表就是这次求值里能拿到的东西，其他原生能力一律不要指望：
    </p>
    <pre className={style[bem.e('code')]}>
{`名字                    页面层（UI）                                    逻辑层（worker）
window/self/globalThis  指向进程代理（不是真全局）                        指向 worker 代理
document                代理过的 document（三种标签受白名单）              裸名不可用，window.document 也是 undefined
fetch                   安全 fetch（自动带进程头）                        同名绑定，同一个安全实现
localStorage            裸名未绑定 → 真实全局（幽灵/物理 realm 上访问即抛，桥接与寄生模式下不隔离）；window.localStorage 才是带前缀的代理   worker 本就没有这个 API，window.localStorage 兜成空对象代理，调用即 TypeError
sessionStorage          window.sessionStorage 是 undefined；裸名同上       同 localStorage
indexedDB               裸名未绑定 → 真实全局；window.indexedDB 是按前缀的代理  裸名已绑定为代理（目标仍是 worker 里没有的 indexedDB）
XMLHttpRequest          undefined                                        undefined
importScripts           页面层没有这个全局，window.importScripts 访问即抛      undefined
eval                    调用即抛 Security Error                          调用即抛 Security Error
Function                访问即抛 Security Error                          可用（内核要靠它构造逻辑模块）
setTimeout/setInterval  可用，delay 下限 4ms，回调 this 绑到进程代理        同左
navigator               代理（serviceWorker 与 usb/bluetooth/serial/hid 被封）  同左
Worker/URL/WebSocket    同名绑定为透传，不加限制                           URL/Blob 同名绑定（透传）；Worker/WebSocket 未绑定，落到 worker realm 原生
Blob                    原生构造器；type 含 javascript 时会被再套一层影子沙箱  同左
AppSDK                  可用                                              不可用`}
    </pre>
    <ul className={style[bem.e('list')]}>
      <li><strong>页面层</strong>：持久化走 <code>AppSDK.System</code>，网络走 <code>fetch</code>（裸名、Props、
        <code>AppSDK.API.fetch</code> 三种写法同一个函数），<strong>只加请求头，不做域名白名单</strong>；
        白名单管的是 <code>document.createElement('script'|'link'|'iframe')</code> 的 URL。</li>
      <li><strong>逻辑层</strong>：没有 <code>AppSDK</code>、没有 <code>document</code>，也就没有组件库与 Hook。
        它负责状态计算：接收 action、算出新 state。主逻辑块能直接用的注入是 <code>dispatch</code> 与
        <code>require</code>（<code>api</code> 只给被 require 的逻辑模块）；要与外部通信走 worker 原生的
        <code>postMessage</code>。<strong>网络请求与持久化请放页面层</strong>——worker 环境本就没有
        <code>localStorage</code> / <code>sessionStorage</code>，沙箱兜出来的那个"看起来像存储"的对象没有原生方法，
        一调用就 TypeError。想在逻辑层留痕，只能把值放进 <code>state</code>，由内核按 <code>saveState</code> 设置持久化。</li>
      <li><strong>为什么"裸写名字"和"写 <code>window.xxx</code>"会不一样</strong>：前导块用的是<code>const</code> 名字遮蔽，
        只覆盖了表里列出的那几个名字。没被绑定的名字（页面侧的 <code>localStorage</code> / <code>sessionStorage</code> /
        <code>indexedDB</code>）沿作用域链找到的是<strong>代码所在 realm 的真实全局</strong>，代理层完全绕过。
        <code>window.*</code> 走的是代理 get 陷阱，才是受控版本。</li>
      <li>页面侧 <code>window.foo = 1</code> 这类自定义全局<strong>不会写到真 window 上</strong>：代理的 set 陷阱把它们收进
        本实例私有的字典，读也从这个字典读，因此不跨应用泄漏、随进程销毁。被保护的名字覆写不了
        （<code>fetch</code> / <code>eval</code> / <code>Function</code> / <code>window</code> / <code>document</code> 等，
        覆写会抛 Security Error）。</li>
      <li><code>Worker</code> / <code>URL</code> / <code>WebSocket</code> 是宿主原生对象的<strong>直传</strong>，
        沙箱没给它们加限制；受白名单管的只有 <code>document.createElement</code> 出来的 <code>script</code> /
        <code>link</code> / <code>iframe</code> 的 URL。<code>Blob</code> 被包了一层：
        <code>type</code> 含 <code>javascript</code> 时会在内容前后拼上一段影子沙箱代码。</li>
      <li><strong>主题通道（跨应用总线）</strong>：worker 里没有 <code>AppSDK</code>，收发都走原生的
        <code>postMessage</code>，靠系统消息协议表达三件事——
        发布 <code>{'postMessage({type:"PUBLISH_TOPIC", payload:{topic, data}})'}</code>、
        订阅 <code>{'postMessage({type:"SUBSCRIBE_TOPIC", payload:{topic}})'}</code>、
        退订 <code>{'postMessage({type:"UNSUBSCRIBE_TOPIC", payload:{topic}})'}</code>。
        命中的主题会以 <code>{"{type:'TOPIC_MESSAGE', topic, data}"}</code> 这个 action 进你的 reducer，
        所以收端按 <code>action.topic</code> 分流、数据读 <code>action.data</code>。
        同一条 topic 重复订阅只生效一次；订阅记录挂在 pid 上，进程被回收时由内核一并清掉。</li>
      <li>这条通道是<strong>广播式</strong>的：你自己发的消息如果订了同一个 topic 也会回到自己，
        其他任何订阅该 topic 的应用同样收得到——不要拿它传私密数据。要"点对点交给某个应用"请用
        <code>AppSDK.kernel.evokeApp</code>（普通应用可用）。</li>
      <li><strong>注入给逻辑模块的 <code>api</code> 是冻结的三项</strong>：<code>dispatch</code> / <code>getState</code> /
        <code>postMessage</code>，覆写属性会抛。逻辑模块本身仍是普通 CJS 模块，<code>module</code> / <code>exports</code> /
        <code>require</code> 四个形参之外没有别的注入。</li>
      <li><strong><code>state</code> 不是"深拷贝并冻结"</strong>：它靠 <code>postMessage</code> 的结构化克隆传到页面，
        没有任何冻结。真正的两个坑是：
        <ul className={style[bem.e('list')]}>
          <li><strong>reducer 必须返回新引用。</strong>worker 里的判定是 <code>nextState !== _state</code>——
            原地改了字段再 <code>return state</code>，既不会广播给页面，也不会持久化，表现就是"点了没反应"，而且不报错。</li>
          <li><strong>state 里不要放函数、类实例、DOM 节点等不可克隆的值。</strong>广播时的 DataCloneError 被 dispatch
            的 try/catch 吞掉，只留一句 <code>[Worker] dispatch 执行出错:</code> 在 worker 控制台里，界面上什么也不会发生。</li>
        </ul>
      </li>
      <li><strong><code>eval</code> 两侧都禁用</strong>；<code>Function</code> 只在 worker 环境放开（内核构造逻辑模块要用），
        应用代码不需要、也不应该依赖它。</li>
      <li>想在 worker 里等一帧或定时执行：<code>setTimeout</code> 可用但有 <strong>4ms 下限</strong>，
        且回调的 <code>this</code> 被绑到进程代理；worker 里没有 <code>requestAnimationFrame</code>。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>7. 文件格式与编译器口径</h4>
    <p className={style[bem.e('text')]}>
      内容包对后缀<strong>不设白名单</strong>（工作区里手建的任意文本文件都会随资源走），但编译只分三档，
      所以「能发出去」和「能被编译」是两件事：
    </p>
    <pre className={style[bem.e('code')]}>
{`后缀             走哪条编译路径                    采集通道是否接受
.jsx            Babel（presets: env + react）      是（上传/更新/本地开发三条通道）
.js             同上，仍按 JSX 交给 Babel           是
.css            CSS 模块生成器，不送 Babel          是
.json/.ts/.svg  按 JSX 交给 Babel → 语法错误        否（采集时被过滤；在工作区手建仍会进内容包）
图片/字体等      没有内容包通道                     否（请用 URL / CDN 资源）`}
    </pre>
    <p className={style[bem.e('text')]}>
      三条采集通道（上传面板、更新面板、本地开发同步）只读 <code>.jsx/.js/.css</code>；
      未知后缀会被 <code>detectSourceFormat</code> 一律当成 JSX，因此不要指望 <code>data.json</code> 能被
      <code>import</code> 进来——把这类常量写成 <code>.js</code> 模块导出即可。
    </p>

    <h4 className={style[bem.e('subtitle')]}>JSX 侧：Babel 配置与失败分阶段</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>preset 组合</strong>：<code>env</code>（ES6+ 与 ES Module → CommonJS）+ <code>react</code>
        （<code>runtime: 'classic'</code>、<code>pragma: 'AppSDK.React.createElement'</code>、
        <code>pragmaFrag: 'AppSDK.React.Fragment'</code>）。classic runtime 是刻意的：automatic runtime 会去注入
        <code>@babel/runtime/jsx-runtime</code>，沙箱里没有这个模块。</li>
      <li><strong>Babel 从哪来</strong>：优先本地依赖，失败才回落 CDN 的 babel-standalone。取不到时降级为「原文注入」，
        由渲染侧运行时再编译——此时带相对 <code>import</code> 的主逻辑块在 worker 里就是整块语法错误。</li>
      <li><strong>编译结果有缓存</strong>：按「源码 + 进程 ID」命中；物理沙箱下每次重建 factory（旧 factory 的
        <code>globalThis</code> 指向已销毁的 iframe），所以那一侧不走缓存。</li>
      <li><strong>报错分五个阶段</strong>：<code>validate</code>（输入校验：源码不是字符串这类）、
        <code>babel</code>（JSX/语法写错，带行列号）、<code>compile</code>（产物构造 factory 失败）、
        <code>runtime</code>（求值时抛错）、<code>unknown</code>（兜底）。错误面板上的中文名分别是
        输入校验 / Babel 转译 / 沙箱构建 / 初始化运行 / 未知阶段。<strong>模块是逐个编译的</strong>：
        一个模块语法错不会挡住其他模块，所有失败汇成一份错误列表一起显示，改完只需重看那一条。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>CSS 侧：模块生成与作用域改写</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>CSS 不进 Babel</strong>，由专用的 CSS 模块生成器产出 CommonJS 导出：<code>exports.style</code>
        是样式原文（这份会被收集拼接），普通 <code>.css</code> 的 <code>default</code> 也是样式字符串，
        <code>.module.css</code> 的 <code>default</code> 是类名映射对象。</li>
      <li><strong>类名不做哈希</strong>：<code>styles.btn</code> 得到的就是 <code>btn</code>。隔离不靠改名，
        而是靠作用域改写——每条选择器前被加上进程根 <code>#proc-进程ID</code>。因此它是<strong>进程级</strong>而非文件级隔离：
        同一应用里两个模块写同名类会同时生效，不同应用之间互不影响。</li>
      <li><strong>改写是正则级的，有三类真实限制</strong>：
        <code>@media</code> / <code>@keyframes</code> / <code>@supports</code> 这类 at-rule 会连同前缀一起变成无效规则而被整块丢弃（媒体查询与 CSS 动画在这条通道上不生效），
        <code>html</code> / <code>body</code> / <code>:root</code> 加了进程根前缀后永不命中，
        而伪类、组合器这些仍正常。要响应式请用 JS（<code>matchMedia</code> 判断后切类名），要动画请用内联样式或
        Web Animations API。</li>
      <li><code>export const style = '...'</code>、<code>import './style.css'</code>、
        <code>import styles from './style.module.css'</code> 三种写法最终汇到同一处：所有模块导出的
        <code>style</code> 拼成一份，注入当前进程容器（iframe 内是 <code>runtime-css-进程ID</code> 这个 style 标签）。</li>
      <li>安装期预编译<strong>跳过 CSS</strong>（否则会把它当 JSX 编译而报错），CSS 因此在 worker 侧完全不存在——
        逻辑层引样式的报错就是这么来的。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>一条完整链路</h4>
    <pre className={style[bem.e('code')]}>
{`工作区文件表
   │   入口约定（logicEntries / viewEntry / mainEntry，按声明顺序 + 路径字母序）
   ├─→ 主逻辑入口  ─────────→ 原文 + 预编译产物各一份（不进内容包）
   ├─→ 辅逻辑入口 ─┐
   ├─→ 视图入口    ├────────→ 内容包（模块 key → 源码）→ 安装期 / 预览期预编译
   └─→ 普通模块   ─┘
        │
        ├→ worker：主块按名字识别 initialState / reducer / init，import 编译成 require 沿产物求值
        ├→ UI：所有模块进 moduleRegistry，按 entries.view 选视图、按 state.router.path 选页
        └→ 分层校验：以「这次发出去的载荷」为对象；创建/预览分软硬，其余通道有问题即中断`}
    </pre>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
//  应用选项 (metaInfo)
// ─────────────────────────────────────────────────────────────────────────────
const AppOptionsSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>应用选项 (metaInfo)</h2>
    <p className={style[bem.e('text')]}>
      「设置」面板里的开关最终都写进 <code>metaInfo</code>，读它们的是内核与窗口外壳，应用代码只读不写。
      发布时载荷会做一次拆装：<code>appName</code> 提到顶层作 <code>name</code>，<code>appIcon</code> 改名成
      <code>metaInfo.icon</code>，<code>sysOptions</code> 单独走顶层（它不进资源库，只是这次发布的判断条件），
      其余字段原样铺开，另外补 <code>seed</code>、<code>authorId</code>、<code>entries</code>、<code>createdAt</code>；
      安装时若没有 <code>version</code> 则记作 <code>0.1</code>。
    </p>

    <pre className={style[bem.e('code')]}>
{`选项              面板分组      默认     读它的人              实际效果
worker            运行控制      true    内核启动流程          false 时不建 Worker，改由宿主线程代管，状态机不再运行
saveState         运行控制      false   内核 + 自动保存        决定关闭/硬重启是否清空持久化状态，也是自动保存的前提
exposeState       运行控制      false   窗口外壳              标题栏多一个「查看状态」按钮
hideHeader        运行控制      false   窗口外壳              标题栏整体不渲染，窗口操作交给 AppSDK.API.window
syncLocal         同步策略      false   安装 + 启动扫描        把应用包写成 uuid-<应用名>.sukin-worker.js
appType           应用归类      tool    归类筛选              getTypeApps(appType) 的过滤依据
initialSize       视觉表现      600×450 窗口外壳              安装时夹到 w≥500 / h≥400，只保留 w、h
sysOptions        部署与隐私    全关     上传流程              shouldUpload 决定是否传服务器，isPrivate 随表单送出
registerToPool    权限拓展      关      发布回调              一次性动作：发布成功后把 resourceId 注册进权限池
custom.*          扩展特性      见下    外壳 / 内核           用户偏好，安装与更新时用户已有值覆盖你的默认值`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>worker：关掉之后到底还剩什么</h4>
    <ul className={style[bem.e('list')]}>
      <li>判定式是 <code>metaInfo.worker !== false</code>：字段缺失、<code>undefined</code>、<code>0</code> 都算开着，只有显式写 <code>false</code> 才关。</li>
      <li>关掉后内核不再创建 Worker，而是挂一个宿主线程上的模拟实例，通信协议与真 Worker 完全一致：仍然会广播 <code>STATE_UPDATE</code> 填状态缓存，UI 侧订阅照常工作，多页应用还会补出 <code>router.path = 'home'</code>。</li>
      <li><strong>代价是状态机整个没了</strong>：<code>logic</code> 里写的 <code>initialState</code> / <code>reducer</code> / <code>init</code> 一行都不会执行，逻辑层的 <code>require</code> 与 <code>api</code> 也不存在。</li>
      <li>此时 <code>dispatch</code> 只有三类结局：① <code>STATE_UPDATE</code> / <code>UPDATE_STATE</code> 走增量合并后广播；② 多页应用的 <code>NAVIGATE</code> 改 <code>state.router.path</code>（切页有效）；③ 其余动作没有任何状态变化，只被原样回灌一次，组件层不会因此重渲染。</li>
      <li>所以 <code>worker: false</code> 只适合「状态全在组件 <code>useState</code> 里、不需要预热和派生」的纯展示应用；需要状态机就保持 <code>true</code>，Worker 本身很轻。</li>
      <li>顺带一条容易被忽略的后果：模拟实例只认 <code>UI_ACTION</code>，其它应用 <code>evokeApp</code> 投递过来的 <code>APP_INTERACT</code> 会被直接丢弃，
        这个应用收不到任何跨应用指令。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>saveState：谁清谁留</h4>
    <ul className={style[bem.e('list')]}>
      <li>真正被它改变的是两条路径：窗口关闭按钮走的强制关闭、错误边界第四次硬重启走的强制重启——两者在 <code>saveState</code> 为假时清掉持久化状态（内存与资源注册表同时置空，并发出状态清空事件）。<strong>这就是「关了窗口再开就没数据」的原因</strong>。</li>
      <li>自动保存定时器要同时满足两个条件：<code>saveState</code> 为真 <strong>且</strong> 间隔大于 0。间隔先取 <code>custom.autoSaveStateInterval</code>，取不到再取系统个性化设置，两处都没配就等于不开。</li>
      <li>窗口位置自动保存不看 <code>saveState</code>，只看 <code>custom.autoSaveWindowInterval</code>。</li>
      <li>LRU 自动休眠无视 <code>saveState</code>，一律把当前状态写回库——进程还活着，休眠是热状态保存，不是清理。</li>
      <li>沙箱存储（<code>pid-&lt;pid&gt;_</code> 前缀的 localStorage / sessionStorage / indexedDB）跟这个开关无关，只有卸载应用时才会被清。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>exposeState 与 hideHeader：外壳行为</h4>
    <ul className={style[bem.e('list')]}>
      <li><code>exposeState</code> 为真时标题栏第一项变成「查看状态」，点开是实时状态面板；给用户排查用，不影响运行时。</li>
      <li><code>hideHeader</code> 取值顺序是「应用级 → 资源级 → false」，并且优先级高于用户的 <code>custom.hideHeaderHover</code>：一旦整体隐藏，悬浮隐藏自动失效。</li>
      <li>隐藏标题栏后拖动、最大化、关闭都得应用自己做，接口是 <code>AppSDK.API.window</code> 的五个方法：<code>close</code>、<code>hibernate</code>、<code>toggleMaximize</code>、<code>setRect</code>、<code>getRect</code>。</li>
      <li><code>setRect</code> 收 <code>{'{ x, y, w, h }'}</code>，调用即视为退出最大化，之后的还原基准就是这个新矩形；<code>getRect</code> 返回当前矩形的副本。预览环境没有窗口外壳，<code>getRect</code> 返回 <code>null</code>，其余调用只打一条警告日志，不会抛错。</li>
      <li>完整用法见内置示例的 <code>pages/windowDemo</code>。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>syncLocal：它是导出物，不是热更新通道</h4>
    <ul className={style[bem.e('list')]}>
      <li>文件名为 <code>uuid-&lt;应用名&gt;.sukin-worker.js</code>，内容是把应用包整个塞进 Worker 模板后的产物——不是 <code>logic.jsx</code> 的原文。同一 <code>name</code> 视为同一应用，所以文件名不带 resourceId。</li>
      <li>创建/更新时勾选即写盘并把文件句柄关联到应用；启动扫描发现该资源没有句柄时会顺手补写一次。没选过本地目录（无目录句柄）时整个流程静默跳过；系统预置资源永不写盘。</li>
      <li>
        <strong>注意读哪份不是你以为的</strong>：冷启动时有句柄且读权限「尚未授予」才会去读本地文件文本，读权限「已授予」反而用资源库里的版本重新生成。
        也就是说手改本地文件后重启，运行版本很可能没变。请把它当作「给外部编辑器改、进版本管理」的导出通道，改完仍然回开发者中心重新发布。
      </li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>appType 与 initialSize</h4>
    <ul className={style[bem.e('list')]}>
      <li><code>appType</code> 预设 <code>editor</code> / <code>game</code> / <code>tool</code>，也可以切到手动输入填任意串；它只是归类标签，供 <code>getTypeApps(type)</code> 同步筛选，不影响沙箱与权限。</li>
      <li><code>'system'</code> 是另一回事：系统应用的高权限来自代码里的注册标记，与 <code>appType</code> 无关；<code>appType === 'system'</code> 只额外决定卸载时是否顺带清掉以 resourceId 命名的系统数据表。</li>
      <li><code>initialSize</code> 在安装时被 <code>Math.max</code> 夹住下限（<code>w ≥ 500</code>、<code>h ≥ 400</code>），面板里的 <code>x</code> / <code>y</code> 不会被保存。</li>
      <li>窗口初始矩形取「上次保存的窗口矩形 → initialSize → 系统默认」，所以 <code>initialSize</code> 只在用户第一次打开、且没有历史存档时起作用。</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>custom：用户偏好优先于你的默认值</h4>
    <p className={style[bem.e('text')]}>
      <code>metaInfo.custom</code> 是「用户习惯」区，安装与更新时的合并规则是<strong>应用级已有值覆盖资源级</strong>。
      你在包里写的 <code>custom</code> 只是首次安装的默认值，别指望用户改过的设置被你的新版本刷掉。
    </p>
    <pre className={style[bem.e('code')]}>
{`custom 键                      含义                     现在到底生不生效
hasShortcut                   创建桌面图标              生效
blockEd                       固定至状态栏              生效
isFullScreen                  默认全屏启动              生效，但仅当首次启动且无历史窗口存档
autoStart                     开机/会话恢复自动运行      生效
backgroundSleep               后台暂停状态订阅          生效
adaptiveMount                 后台只渲染轻量占位          生效，外壳按 !== false 判定，未配置即为开
hideHeaderHover               无悬浮时隐藏标题栏        生效，但被 metaInfo.hideHeader 压制
autoSaveStateInterval         自动保存状态间隔(秒)      生效，还需 saveState 打开
autoSaveWindowInterval        自动保存窗口位置间隔(秒)   生效，不看 saveState
allowResize                   允许调整窗口大小          不生效：外壳有 \`|| true\` 兜底，关不掉
showInLauncher                在启动器中显示            不生效：目前没有消费点`}
    </pre>

    <div className={style[bem.e('highlight')]}>
      <h4 className={style[bem.e('subtitle')]}>部署与权限：sysOptions 和 registerToPool</h4>
      <ul className={style[bem.e('list')]}>
        <li><code>sysOptions.shouldUpload</code> 为真时，本地安装照常完成后异步再传一份到服务器（不等结果）；为假就只落本机。<strong>生产环境未登录（拿不到 <code>authorId</code>）会被直接拒绝</strong>，开发环境跳过这道检查。</li>
        <li><code>sysOptions.uploadInfo.isPrivate</code> 只是随上传表单加一个 <code>isPrivate</code> 字段发给服务器，本机行为完全不变。</li>
        <li><code>sysOptions</code> 里的 <code>userInfo</code>、<code>storePath</code> 由发布时自动注入，不需要你配。</li>
        <li><strong><code>registerToPool</code> 不是运行时开关</strong>：它是一个一次性动作——发布成功拿到 <code>resourceId</code> 后调用权限管理接口把该资源注册进权限池，注册完就复位，不会写进 <code>metaInfo</code>。
          在本地开发面板里勾它还会顺带把「云端上传」和「应用私有」一起打开；关掉上传或私有时这个勾选也会被取消。</li>
      </ul>
    </div>

    <div className={style[bem.e('tip')]}>
      <p className={style[bem.e('text')]}>
        沙箱形态（物理 iframe / 桥接 / 寄生 / 主线程虚拟 Worker）、最大可见窗口数与 LRU 休眠、僵尸文件扫描这些是<strong>宿主级配置</strong>，
        在系统设置里改，<code>metaInfo</code> 无权覆盖。同一份应用包在不同宿主配置下沙箱边界不同，这是刻意的：见「解析与分层」末节的沙箱能力矩阵。
      </p>
    </div>
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

    <h4 className={style[bem.e('subtitle')]}>1. logic.jsx（主逻辑入口 — 自身严禁 export）</h4>
    <pre className={style[bem.e('code')]}>
{`// 本块自身不可使用 export，内核自动识别 initialState 和 reducer；
// 需要拆分的模块请写成普通模块文件，在这里用 import 引入（安装期与页面同构预编译）
import { formatName } from './utils/format';

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
      编译后的代码通过 <code>factory.call(sandboxWin, module, exports, instanceSDK, ...)</code>
      在沙箱 window 上下文中执行，<code>AppSDK</code> 即第三个参数 <code>instanceSDK</code>，
      已经是进程级别的定制实例（含进程 ID、隔离存储、安全 fetch 等）。
    </p>
    <p className={style[bem.e('text')]}>
      模块求值语义与 worker 侧一致：<code>module</code> 是注册表里的模块本体，
      因此 <code>module.exports = xxx</code> 会被采纳；<code>exports</code> 先登记再求值，
      所以循环依赖（a ↔ b）拿到的是半成品导出而不是递归爆栈 —— 与 Node 的 CommonJS 行为相同，
      但被依赖模块的副作用顺序仍需自己保证。
    </p>

    <h4 className={style[bem.e('subtitle')]}>模块化编译</h4>
    <p className={style[bem.e('text')]}>
      系统通过 <code>require</code> + <code>_interopRequireDefault</code> + <code>__esModule</code>
      实现模块加载。Babel 的 <code>env</code> preset 将 ES Module 转为 CommonJS，
      <code>import X from './a'</code> 编译为 <code>_interopRequireDefault(require('./a')).default</code>。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 源码
import Button from './Button.jsx';
import { format } from './utils.js';
import './style.css';
import styles from './style.module.css';

// 编译后（env preset 转 CommonJS）
var _Button = _interopRequireDefault(require('./Button.jsx'));
var _utils = require('./utils.js');
require('./style.css'); // 副作用导入，自动 Scope
var _styleModule = _interopRequireDefault(require('./style.module.css'));`}
    </pre>
    <p className={style[bem.e('text')]}>
      <strong>模块 vs 组件划分：</strong><code>.js</code> 与 <code>.jsx</code> 走同一条 Babel 链路，不区分扩展名，
      都允许 JSX。靠导出机制自动识别——<code>export default</code> 为组件，具名导出为模块。
      视图入口的 <code>export default</code> 必须是 React 组件，但这一步<strong>没有编译期检查</strong>：
      取组件的规则是 <code>exports.default || exports</code>，写错要到运行时才暴露成「初始化运行时异常」。
    </p>

    <h4 className={style[bem.e('subtitle')]}>State 的传递路径</h4>
    <p className={style[bem.e('text')]}>
      worker 每次广播都经 <code>postMessage</code> 做结构化克隆，UI 侧拿到的是一份独立快照，
      <strong>没有被冻结</strong>：改写它不报错，但下一次广播会整份换掉，改的内容也随之消失。
      渲染层还会用深比较把「内容没变的新快照」折叠回旧引用，好让下游 memo 短路——
      于是「直接改 state 后界面不动」和「改了个等价值也不重渲染」都是正常现象。结论只有一条：状态请始终走 <code>dispatch</code>。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 无效：改的是本次快照，下一次广播会整份覆盖
state.user.name = 'NewName';

// 正确：走 reducer 产出新状态
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
      只有被登记为系统预置资源的应用会拿到 <code>adminAppSdk</code>，普通用户应用恒为 <code>devAppSdk</code>。
      这跟 <code>metaInfo.appType</code> 写什么无关，也不是发布面板里能勾出来的选项——它由代码侧的预置资源表和后端放权名单共同决定。
    </p>

    <h4 className={style[bem.e('subtitle')]}>扩展能力</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>rootSeed：</strong><code>AppSDK.API.rootSeed(length?, seed?, isNumber?)</code>，默认 8 位随机串；
        <code>isNumber</code> 为真时只用数字集。<code>length</code> 不是正整数会抛错，这是它唯一的失败模式。</li>
      <li><strong>完整 kernel：</strong><code>AppSDK.kernel</code> 就是内核单例本身，所有公共方法都能直接调。
        普通应用的 <code>AppSDK.kernel</code> 是被裁剪过的两件套（<code>evokeApp</code> / <code>getTypeApps</code>），
        两者都已绑好实例、可正常调用，见「基础 SDK」的提示框。</li>
      <li><strong>完整 hooks：</strong>十个 hook 模块全量导出（<code>useKernel</code>、<code>useAuth</code>、<code>useFileSystem</code>、
        <code>useProcessBridge</code>、<code>useStateHandle</code>、<code>useWindowInteraction</code>、<code>userWindowForKernel</code>、
        <code>useWheelToHorizontalScroll</code>、<code>useDebounce</code>、<code>useThrottle</code>）；普通应用只有 <code>hooks.useFileSystem</code> 一项。</li>
      <li><strong>扩展 Components：</strong>在公共组件之上再加十个系统界面 ——
        Developer、FileSystem、NoteBook、Setting、Start、Store、LocalDev、SystemDashboard、DrawBoard、Sheet。</li>
    </ul>

    <pre className={style[bem.e('code')]}>
{`// adminAppSdk 结构
export const adminAppSdk = {
  ...devAppSdk,          // 继承全部基础 SDK
  API: {
    ...devAppSdk.API,
    rootSeed: generateShortSeed,   // 高权限种子生成器
  },
  Components: {
    ...devAppSdk.Components,
    Developer, FileSystem, NoteBook, Setting, Start,        // 五个系统界面
    Store, LocalDev, SystemDashboard, DrawBoard, Sheet,      // 再加五个
  },
  hooks,                 // 完整 hooks
  kernel: _kernel,       // 内核单例本身，方法带 this
};`}
    </pre>

    <div className={style[bem.e('highlight')]}>
      <h4 className={style[bem.e('subtitle')]}>成为系统应用意味着什么</h4>
      <ul className={style[bem.e('list')]}>
        <li><strong>登记方式：</strong>在 <code>src/sukinos/resources/&lt;应用&gt;/registry.jsx</code> 里声明预设资源，
          汇总进 <code>preset_resources</code>；启动时逐个比对「当前用户可访问的系统资源」名单，不在名单里的预设资源不注册。
          也就是说系统应用是编译进壳体的源码，不是分发包。</li>
        <li><strong>pid 就是 resourceId：</strong>系统应用的进程号直接取 resourceId，稳定可预测；普通应用是随机 uuid。</li>
        <li><strong>不走安装与预编译：</strong>预设资源不经过安装流程，因此没有 <code>precompiledContent</code> / <code>precompiledLogic</code>，
          UI 与 worker 都走原文编译分支。改了源码重编译宿主即生效。</li>
        <li><strong>不写用户注册表：</strong>内核里所有「非系统应用才写 sysDb」的分支把它们排除在外，状态只在内存，
          刷新后回到 <code>INSTALLED</code>，只有 <code>custom</code> 允许被数据库覆盖记录合并回来。</li>
        <li><strong>卸载清理更广：</strong>卸载时除了 <code>pid-&lt;pid&gt;_</code> 前缀的沙箱存储，
          还会按 resourceId 前缀清空它在公共系统数据库里注册的专属数据表。</li>
      </ul>
    </div>

    <div className={style[bem.e('tip')]}>
      <p className={style[bem.e('text')]}>
        这些差异对普通应用开发者只影响一件事：<strong>不要照着系统应用的例子写代码</strong>。
        示例仓库里 <code>AppSDK.kernel.xxx()</code>、<code>AppSDK.Components.Setting</code> 之类的用法在用户应用里要么抛错要么取到 <code>undefined</code>。
      </p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// 代码规范
// ─────────────────────────────────────────────────────────────────────────────
const CodeSpecSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>代码规范与最佳实践</h2>

    <h4 className={style[bem.e('subtitle')]}>文件顶层禁止区域（绝对不能写）</h4>
    <p className={style[bem.e('text')]}>
      原因不是「风格建议」：这些名字已经由内核在同一个块级作用域里 <code>const</code> 出来了，
      你再写一遍就是重复声明，整个模块直接 <code>SyntaxError</code>。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 以下在文件顶层严禁再写一遍（已自动注入，重写即重复声明报错）：
const { React, useState, useEffect, useMemo,
        useCallback, useRef, useContext, useReducer, Fragment } = AppSDK;

// 其中 useContext / useReducer / Fragment 三项 AppSDK 并没有，
// 注入的只是 undefined。要用只能换名字或走全路径（再解构一次就是重复声明）：
const useCtx = AppSDK.React.useContext;      // ✅ 换个名字
const Frag = AppSDK.React.Fragment;          // ✅
AppSDK.React.useContext(SomeContext);        // ✅ 直接调用
const { useContext } = AppSDK.React;         // ❌ 与注入的同名，重复声明

// 以下可以在文件顶层写（Components / System 未自动注入）：
const { Button, Input } = AppSDK.Components;
const { System } = AppSDK;`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>主逻辑入口规范</h4>
    <p className={style[bem.e('text')]}>
      主逻辑块与页面模块走同一套预编译，所以 <code>import</code> 可以正常写（编译后就落到内核注入的
      <code>require</code>）；唯一限制是不能写 <code>export</code>，因为内核是按名字识别本块里的
      <code>initialState</code> / <code>reducer</code> / <code>init</code>，要导出请改成普通模块文件。
      被引入的模块自身正常使用 <code>import</code> / <code>export</code> 语法。
    </p>
    <p className={style[bem.e('text')]}>
      两个前提（被 import 的目标要随载荷走、且以多页面方式发布）以及校验按真实载荷判定的口径，见「解析与分层」的内容包与分层校验两小节。
    </p>
    <p className={style[bem.e('text')]}>
      辅逻辑模块在 worker 侧求值，除 <code>module</code> / <code>exports</code> / <code>require</code>
      外还会收到注入的 <code>api</code>（<code>api.dispatch</code>、<code>api.getState</code>、
      <code>api.postMessage</code>）。这份注入只存在于 worker：页面一旦 import 辅逻辑模块，
      同一份副作用会在 UI 与 worker 各跑一次，且 <code>api</code> 在 UI 侧取不到——
      要给页面复用的纯函数请放在不命中任何入口规则的模块目录里。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 正确
import { step, nextCount } from './store/counter';   // 取用逻辑模块
const initialState = { count: 0 };
function reducer(state, action) { ... }

//错误（export 会破坏内核解析）
export const initialState = { count: 0 };
export function reducer(state, action) { ... }
export default function reducer(state, action) { ... }`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>组件导出规范</h4>
    <p className={style[bem.e('text')]}>
      页面模块求值后按 <code>exports.default || exports</code> 取组件：有默认导出就用默认导出，
      否则把整个 exports 对象当组件。这一步没有编译检查，取错了一到运行时才炸成「初始化运行时异常」。
      所以视图入口必须有 <code>export default</code> 且它是函数；只写具名导出等于把一个普通对象交给 <code>createElement</code>。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 正确
export default ({ state, dispatch }) => {
  return <div>内容</div>;
};

// 错误（没有默认导出，取到的是 { App: fn } 这个普通对象）
export const App = () => <div />;`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>样式规范（三种写法）</h4>
    <p className={style[bem.e('text')]}>
      系统支持三种样式写法，均会自动 Scope 隔离，不会污染全局。推荐使用 CSS Modules。
      类名不做哈希，隔离靠给每条选择器加进程根前缀，因此 <code>@media</code> / <code>@keyframes</code> 这类
      at-rule 与 <code>html</code> / <code>body</code> / <code>:root</code> 都会失效，细节见「解析与分层」的 CSS 小节。
      受控样式是「收集」出来的：所有内容模块导出的 <code>style</code> 会被拼成一份再统一加前缀，
      所以样式写在哪个文件都能生效，不必集中在视图入口。
    </p>
    <pre className={style[bem.e('code')]}>
{`// 写法一：export const style（内部写 CSS 字符串，系统自动 Scope，兼容旧写法）
export const style = \`
  .container { padding: 20px; background: #f0f0f0; }
  .title { font-size: 18px; color: #333; }
\`;
// 使用：className 直接写类名
<div className="container"><h2 className="title">标题</h2></div>

// 写法二：import './style.css'（副作用导入，系统自动 Scope，类名直接使用）
import './style.css';
<div className="container">...</div>

// 写法三：import styles from './style.module.css'（CSS Modules，styles.btn 返回类名）
import styles from './style.module.css';
<div className={styles.container}>
  <h2 className={styles.title}>标题</h2>
</div>`}
    </pre>
    <h4 className={style[bem.e('subtitle')]}>命名规范</h4>
    <ul className={style[bem.e('list')]}>
      <li>页面文件使用小驼峰：<code>userProfile.jsx</code>（路由 <code>navigate('userProfile')</code>；改成目录式 <code>userProfile/index.jsx</code> 后同一个路由照样命中）</li>
      <li>组件函数使用 PascalCase：<code>const UserProfile = () =&gt; ...</code></li>
      <li>CSS 类名使用小写连字符：<code>user-profile-container</code></li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>常见陷阱</h4>
    <ul className={style[bem.e('list')]}>
      <li>Props 中 <code>fetch</code> 与 <code>AppSDK.API.fetch</code> 是同一个已冻结的安全 fetch，用哪个都行；
        裸写的 <code>fetch(...)</code> 在块级作用域里也已被遮蔽成它，不会退回原生实现。</li>
      <li>子组件需要 <code>state</code> / <code>dispatch</code>，请手动从父组件 Props 往下传——系统只给根组件注入八个 Props。</li>
      <li>不要在顶层 <code>await</code>（沙箱不支持 Top-level await），也不要在模块顶层直接读写 DOM 之外的宿主全局。</li>
      <li><strong><code>state</code> 不是冻结对象</strong>：它是 worker 每次广播时结构化克隆出来的快照，
        改它不报错，但会被下一次广播整体覆盖。相同内容的两次广播会被折叠成同一引用，所以「手改 state 后不重渲染」是正常现象，不是 bug。</li>
      <li>模块顶层不要写 <code>this.xxx</code> 取全局：<code>this</code> 是沙箱 window 代理，部分原生属性上直接抛拦截异常。</li>
      <li>一个模块被 import 两次不会跑两遍（有求值缓存），但循环依赖会拿到半成品 exports——
        两侧行为一致，别指望某一侧「先跑完」。</li>
      <li>样式请走三种受控写法之一。直接向 <code>document.head</code> 注 style 标签会绕过作用域前缀，污染同屏的其它窗口，禁止使用。</li>
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
      <li><strong>文件监听</strong>：自动监听 <code>.jsx/.js/.css</code> 文件变化</li>
      <li><strong>哑文件管道</strong>：按相对路径回传全部模块文件，入口判定交给 SukinOS 的「入口约定」配置</li>
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
          if (!/\\.(jsx|js|css)$/.test(filePath)) return;

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

          // 处理请求：递归读取 dir 下的 .jsx/.js/.css，key 用带扩展名的相对路径
          res.end(JSON.stringify({
            status: 'ok',
            protocol: 2,                   // 协议 2：入口判定由 SukinOS 侧完成
            files: { /* 'layout.jsx': '...', 'style.css': '...' */ },
            logic: '',                     // 恒为空，兼容只认 logic 字段的旧前端
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
          <li><strong>暴露状态</strong>：在窗口标题栏加「查看状态」按钮，给用户排查用（不是跨应用共享状态）</li>
          <li><strong>状态持久化</strong>：关闭应用时是否保留状态，同时是自动保存的前提</li>
          <li><strong>Worker 运行</strong>：关掉即无状态机模式，<code>reducer</code> 不再执行</li>
          <li><strong>上传到应用商店</strong>：发布到公共应用市场</li>
          <li><strong>私有应用</strong>：随上传表单发给服务器的 <code>isPrivate</code> 字段</li>
          <li>逐项语义与默认值见「应用选项 (metaInfo)」一节</li>
        </ul>
      </div>
    </div>

    <h4 className={style[bem.e('subtitle')]}>文件同步流程</h4>
    <pre className={style[bem.e('code')]}>
{`1. 前端配置端口和目录
2. 点击"立即同步"或开启自动同步
3. 请求发送到 Vite 插件的 /__sukin_local_sync
4. 服务端扫描目录，返回全部 .jsx/.js/.css 文件（协议 2：不再单独抽取 logic）
5. 前端按「入口约定」判定主逻辑 / 辅逻辑 / 视图入口，再分别交给 worker 与沙箱编译
6. 编译成功后实时预览
7. 文件变化触发自动重新编译`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>必要文件说明</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>视图入口</strong>（默认 <code>layout.jsx</code>）：必须存在，作为应用主布局组件</li>
      <li><strong>主逻辑入口</strong>（默认 <code>logic.jsx</code>）：可选，缺失时应用无状态机</li>
      <li><strong>其他 .jsx/.js/.css 文件</strong>：折成模块 key 入内容包，路由路径就是模块 key（子目录页面要写完整路径）</li>
      <li>入口文件名统一由开发者中心「设置 → 入口约定」中当前用户的配置判定，本地开发面板与上传/更新面板同一套口径；
        旧版模板插件（协议 1）会按文件名把 <code>logic</code> 开头的文件单独抽成主逻辑回传，
        此时样式文件与其他子目录文件不会被同步，建议更新 <code>vite.config.js</code></li>
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

  const promptText =`你现在是 SukinOS (基于 React 19 的沙箱操作系统) 的高级应用开发助手。
请严格按照以下规范生成代码。这里只列规则，入口解析 / 内容包 / 两套 require / 分层校验的完整解释见开发手册「解析与分层」一节，
运行开关（worker / saveState / exposeState 等）的语义见「应用选项 (metaInfo)」一节。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【一、绝对禁止项】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. 页面不得 import / require 辅逻辑入口文件：它只在 worker 侧求值，页面引入会让同一份副作用在 UI 与 worker 各跑一次，
     且 worker 注入的 api 在页面侧不存在。普通模块、组件与样式（import './style.css' / import styles from './style.module.css'）都可以正常 import
  2. 禁止在文件顶层重复声明以下名字（内核已在同一作用域 const 出来，重写即 SyntaxError）：
       const { React, useState, useEffect, useMemo, useCallback,
               useRef, useContext, useReducer, Fragment } = AppSDK;
     其中 useContext / useReducer / Fragment 只是占位的 undefined：要用请换名字接（const useCtx = AppSDK.React.useContext）
     或直接写 React.Fragment / AppSDK.React.createContext，不要再解构一次
  3. 禁止在主逻辑入口（默认 logic.jsx）中使用 export 关键字：内核按名字识别本块里的 initialState / reducer / init
  4. 存储一律走 AppSDK.System（带进程前缀 pid-<pid>_，卸载才清）：不要裸写 localStorage / sessionStorage / indexedDB，
     页面前导没有绑定这三个名字，它们指向代码所在 realm 的真实全局（沙箱 iframe 里访问即抛，桥接与寄生模式下等于共用宿主存储）；
     window.localStorage / window.indexedDB 走代理、与 System 同源可用，但请统一写 AppSDK.System；
     window.sessionStorage 在页面侧是 undefined，需要它请用 AppSDK.System.sessionStorage
  5. 网络只用 Props 注入的 fetch 或 AppSDK.API.fetch（同一个函数，已带进程标识头，不做域名白名单）：
     XMLHttpRequest 在页面侧是 undefined、window.XMLHttpRequest 访问即抛，别去绕
  6. 禁止直接修改 state 对象：它是每次广播的结构化克隆快照，改动不报错但会被下一次广播整份覆盖，更新只能走 dispatch
  7. navigate: 路由路径按四种写法归一后匹配模块 key —— 平铺页面用文件名（about.jsx 对应 navigate('about')），
     目录页面用完整路径（pages/about/index.jsx 对应 navigate('pages/about')），带 ./ 前缀与扩展名也能命中
  8. dispatch: 对应 reducer 的实现
  9. 非 logic 页面至少要有一个 export default ({}) => {} 作为当前组件视图入口，单文件可以声明其他子组件
  10. 必需有视图入口（默认 layout.jsx）作为整个程序的入口，多页面靠它选页，缺失时只剩白屏
  11. 架构建议：一般建议无论如何都处理为多页面架构
  12. 模块 vs 组件划分（.js 与 .jsx 走同一条编译链路，不区分扩展名，都允许 JSX）：
      - export default 函数组件 → 组件（可被 import 复用）
      - 具名导出（export const xxx / export function xxx）→ 模块（工具函数、常量等）
      - 视图入口的 export default 必须是 React 组件；这一步没有编译检查，取组件的规则是 exports.default || exports，
        只写具名导出等于把一个普通对象交给 createElement，错误要到运行时才暴露
  13. 逻辑层分层：主逻辑入口用 import 取用逻辑模块（安装期与页面同构预编译，编译后落到内核注入的 require）；
      被引入的目标必须随内容包走、且以多页面（bundle）发布 —— 单页载荷只有一个视图字符串加主逻辑块，那种形态下相对 import 必然缺失；
      辅逻辑入口 = 命中入口约定的其余文件（谁是主块由模式声明顺序决定），自身可正常 import / export；
      逻辑层不得引入 React/JSX，也不得引入样式（worker 没有 UI 运行时与 CSS 模块）；
      与页面共用的纯函数、常量请放在不命中任何入口规则的普通模块目录里
  14. 跨层复用的值写成具名导出：只有默认导出的模块，值挂在 .default 上，按名字去取拿到的是 undefined 且不报错
  15. 逻辑层（worker）没有 AppSDK、没有 document：网络请求与持久化请放页面层
  16. 文件只有三类受控形态：.jsx / .js（都送 Babel，转 ES Module 为 CommonJS）、.css / .module.css（走样式模块）。
      不要 import JSON / TS / 图片等资源，常量与配置写成 .js 模块导出，图片用 CDN 链接；
      样式里 @media / @keyframes 会因作用域改写而失效，响应式改用 matchMedia 切类名、动画用内联样式或 Web Animations API

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【二、SDK Kernel 结构】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
主要涉及 AppSDK.kernel 中的 evokeApp 和 getTypeApps。
前提：普通应用的 AppSDK.kernel 就只有这两个方法，两者都可直接调用；其余内核方法只对系统应用开放，
生成普通应用代码时不要引用它们。

■ 1. kernel.evokeApp
─────────────────────────────────────────────────────────────────────────────
  系统的唤起行为是在运行时执行，由 APP 去操作需要的唤起 pid 和交互信息。
  interactInfo 会与 from 合并成一个对象；目标未运行则走 startProcess 带过去，已运行则直接投递给它的 worker。
  投递形式是 { type: 'APP_INTERACT', payload: 合并后的对象 }，worker 收到后原样 dispatch，
  因此合并后的对象整个充当 action —— reducer 里读 action.type / action.from / 其余平铺字段。
  目标应用关掉 worker 时这条 action 会被丢弃。
  内核这条通道没有权限校验：任何应用都能唤起任何应用并投进任意 action。接收方必须自己按 action.from
  白名单过滤，并校验所需字段存在且类型正确，不要把 interactInfo 直接当作可信输入用于路径拼接或写操作。

  [示例代码]
  // 处理 APP 没有启动的情况，实际分情况调用（涉及 appIntereact & startProcess）
  async evokeApp({ pid, from, interactInfo }) {}

  kernel.evokeApp({
    pid,
    from: "system",
    interactInfo: {
      type: 'openFile',        // 必须给 type，它就是 action.type
      openType: 'wr',
      mode,
      ...targetFileForOpen,
    }
  });

  在 logic 中对应处理时，interactInfo 全部处理为 action：

  function reducer(state = initialState, action) {
    if (action?.type === 'openFile') {
      // 处理逻辑并返回新 state，UI 才看得到
    }
  }

■ 2. kernel.getTypeApps
─────────────────────────────────────────────────────────────────────────────
  接收参数：metaInfo.appType 的值；同步返回匹配的应用注册记录（pid / name / metaInfo，没有 appName 字段）。

  [示例代码]
  const apps = kernel.getTypeApps('editor')
  const formattedApps = apps.map(app => ({
    id: app.pid,
    label: app.name || 'Unknown App',
    icon: app.metaInfo?.icon ? (
      <img
        src={app.metaInfo.icon}
        alt='icon'
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    ) : null
  }))

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【三、核心规范】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 1. logic.jsx（无 export，内核自动识别）
─────────────────────────────────────────────────────────────────────────────
  const initialState = {
    /* 初始状态 */
  }

  function reducer(state, action) {
    switch (action.type) {
      case 'ACTION':
        return { ...state, ...action.payload }
      default:
        return state
    }
  }

■ 2. 页面组件（export default，接收系统注入 Props）
─────────────────────────────────────────────────────────────────────────────
  // 可在文件顶层解构（非禁区内容，但不可以解构上述重复声明）：
  const { Button, Input } = AppSDK.Components
  const { System } = AppSDK

  // 样式三种写法（均自动 Scope，推荐 CSS Modules）：
  // 写法一：export const style = `/* 组件作用域 CSS，系统自动 Scope */`
  // 写法二：import './style.css'（副作用导入，类名直接使用）
  // 写法三：import styles from './style.module.css'（styles.btn 返回类名）
  export const style = \`/* 组件作用域 CSS，系统自动 Scope */\`;

  export default ({
    state, // 全局状态（结构化克隆的快照，改了会被下次广播覆盖）
    dispatch, // 更新状态的唯一入口
    navigate, // 路由跳转（仅 Bundle 多页有效）
    pid, // 当前进程 ID
    fetch, // 安全 fetch（与 AppSDK.API.fetch 同一个函数）
    handleFocus, // 提升窗口层级
    reStartApp, // 软重启
    forceReStartApp // 硬重启（saveState 为假时会清掉持久化状态）
  }) => {
    // 在函数体内可以进一步解构 AppSDK 其余内容
    const { System, API } = AppSDK

    // 没有 onKill 这个 Prop：结束进程走 AppSDK.API.window.close()

    return <div>应用内容</div>
  }

■ 3. 存储操作（必须通过 AppSDK.System）
─────────────────────────────────────────────────────────────────────────────
  const { System } = AppSDK

  // 本地存储
  System.localStorage.setItem('key', JSON.stringify(data))
  const data = JSON.parse(System.localStorage.getItem('key') || 'null')
  System.localStorage.removeItem('key')

  // IndexedDB
  const req = System.indexedDB.open('dbName', 1)

■ 4. 网络请求
─────────────────────────────────────────────────────────────────────────────
  【方式 A（推荐）：从 Props 解构】
  export default ({ fetch }) => {
    const load = async () => {
      const res = await fetch('https://api.example.com/data')
      return res.json()
    }
  }

  【方式 B：通过 SDK】
  const { API } = AppSDK
  const res = await API.fetch('https://api.example.com/data')

■ 5. 子组件 Props 传递
─────────────────────────────────────────────────────────────────────────────
  子组件需要 fetch / dispatch / state 时，必须从父组件手动往下传：

  const SubComponent = ({ state, dispatch, fetch }) => {
    /* ... */
  }

  export default ({ state, dispatch, fetch }) => (
    <SubComponent state={state} dispatch={dispatch} fetch={fetch} />
  )

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【四、最小完整闭环示例（Bundle 多页）】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 1. logic.jsx
─────────────────────────────────────────────────────────────────────────────
  const initialState = {
    count: 0,
    items: [],
    loading: false
  }

  function reducer(state, action) {
    switch (action.type) {
      case 'INCREMENT':
        return { ...state, count: state.count + 1 }
      case 'SET_ITEMS':
        return { ...state, items: action.payload, loading: false }
      case 'SET_LOADING':
        return { ...state, loading: action.payload }
      default:
        return state
    }
  }

■ 2. layout.jsx
─────────────────────────────────────────────────────────────────────────────
  export const style = \`
    .layout { display: flex; height: 100%; }
    .nav { width: 160px; padding: 12px; background: #f5f5f5; }
    .main { flex: 1; padding: 20px; overflow-y: auto; }
    .nav-btn { display: block; width: 100%; padding: 8px; margin-bottom: 4px; border: none; background: none; cursor: pointer; text-align: left; border-radius: 4px; }
    .nav-btn:hover { background: #e0e0e0; }
    .nav-btn.active { background: #1677ff; color: #fff; }
  \`;

  export default ({ PageComponent, navigate, state, dispatch, fetch }) => {
    const path = state.router?.path || 'home'

    return (
      <div className='layout'>
        <nav className='nav'>
          <button
            className={\`nav-btn \${path === 'home' ? 'active' : ''}\`}
            onClick={() => navigate('home')}
          >
            首页
          </button>
          <button
            className={\`nav-btn \${path === 'detail' ? 'active' : ''}\`}
            onClick={() => navigate('detail')}
          >
            详情
          </button>
        </nav>
        <div className='main'>
          <PageComponent />
        </div>
      </div>
    )
  }

■ 3. home.jsx
─────────────────────────────────────────────────────────────────────────────
  const { Button } = AppSDK.Components
  const { System, useEffect } = AppSDK

  export const style = \`
    .home { padding: 20px; }
  \`;

  export default ({ state, dispatch, navigate, fetch }) => {
    const load = async () => {
      dispatch({ type: 'SET_LOADING', payload: true })
      try {
        const res = await fetch(
          'https://jsonplaceholder.typicode.com/todos?_limit=5'
        )
        const data = await res.json()
        dispatch({ type: 'SET_ITEMS', payload: data })
        // 持久化到隔离存储
        System.localStorage.setItem('cachedItems', JSON.stringify(data))
      } catch (e) {
        dispatch({ type: 'SET_LOADING', payload: false })
        console.error(e)
      }
    }

    useEffect(() => {
      // 读取缓存
      const cached = System.localStorage.getItem('cachedItems')
      if (cached) {
        dispatch({ type: 'SET_ITEMS', payload: JSON.parse(cached) })
      }
    }, [])

    return (
      <div className='home'>
        <h2>首页 — count: {state.count}</h2>
        <Button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</Button>
        <Button onClick={load} disabled={state.loading}>
          {state.loading ? '加载中...' : '获取数据'}
        </Button>
        <Button onClick={() => navigate('detail')}>去详情</Button>
        <ul>
          {state.items.map(item => (
            <li key={item.id}>{item.title}</li>
          ))}
        </ul>
      </div>
    )
  }

■ 4. detail.jsx
─────────────────────────────────────────────────────────────────────────────
  export const style = \`
    .detail { padding: 20px; }
  \`;

  export default ({ state, dispatch, navigate, fetch, pid }) => {
    return (
      <div className='detail'>
        <h2>详情页</h2>
        <p>进程 ID：{pid}</p>
        <p>已加载条目数：{state.items.length}</p>
        <button onClick={() => navigate('home')}>← 返回首页</button>
      </div>
    )
  }
`;

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
  { id: 'network', label: '网络请求', icon: <PublicIcon />, component: NetworkSection },
  { id: 'cdn',  label: 'CDN加载',  icon: <CloudQueueIcon />,       component: CdnSpecSection },
  { id: 'error',    label: '错误处理',  icon: <ErrorOutlineIcon />, component: ErrorBoundarySection },
  { id: 'bundle',   label: '系统路由',  icon: <FolderZipIcon />,    component: BundleSection },
  { id: 'layering', label: '解析与分层', icon: <AccountTreeIcon />,  component: LayeringSection },
  { id: 'options',  label: '应用选项',  icon: <BuildIcon />,        component: AppOptionsSection },
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
          <div className={style[bem.e('version')]}>v3.2.0</div>
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
