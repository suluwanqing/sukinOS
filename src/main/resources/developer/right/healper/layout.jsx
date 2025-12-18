import React, { useState, useMemo } from 'react';
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import DescriptionIcon from '@mui/icons-material/Description';
import ExtensionIcon from '@mui/icons-material/Extension';
import BuildIcon from '@mui/icons-material/Build';
import SecurityIcon from '@mui/icons-material/Security';
import CodeIcon from '@mui/icons-material/Code';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import WebIcon from '@mui/icons-material/Web';
import PublicIcon from '@mui/icons-material/Public';

const bem = createNamespace('developer-helper');

const IntroSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>平台开发概览</h2>
    <p className={style[bem.e('text')]}>
      本平台提供了一个基于 React 的沙箱运行环境，专为快速构建桌面级 Web 应用而设计。
      开发者无需配置繁琐的 Webpack 或 Vite 构建工具，只需关注业务逻辑与组件开发。
      系统内置了 Babel 编译器，支持内部组件定义，可在浏览器端实时将 JSX 转换为可执行代码。
    </p>
    <div className={style[bem.e('highlight')]}>
      <h4 className={style[bem.e('subtitle')]}>核心机制</h4>
      <ul className={style[bem.e('list')]}>
        <li><strong>动态编译：</strong>利用 Babel Standalone 实时编译，支持 ES6+ 语法</li>
        <li><strong>沙箱隔离：</strong>应用运行在受限作用域内，确保系统安全</li>
        <li><strong>SDK 注入：</strong>通过全局对象 AppSDK 访问 React 及系统能力</li>
        <li><strong>自动注入：</strong>系统自动向根组件注入 <code>state</code>, <code>dispatch</code>, <code>navigate</code> 等核心 Props</li>
      </ul>
    </div>
  </div>
)

const SDKSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>基础 SDK (devAppSdk)</h2>
    <p className={style[bem.e('text')]}>
      普通应用开发时，全局变量 <code>AppSDK</code> 是你与系统交互的桥梁。
      它提供了 React 核心库、常用 Hooks 以及基础 UI 组件。
    </p>

    <h4 className={style[bem.e('subtitle')]}>React 核心</h4>
    <p className={style[bem.e('text')]}>
      无需 <code>import React</code>，直接解构使用。
    </p>
    <pre className={style[bem.e('code')]}>
{`const { useState, useEffect, useMemo } = AppSDK;

export default ({ state }) => {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>核心 Props 注入</h4>
    <p className={style[bem.e('text')]}>
      系统渲染器会自动向你的根组件（单页的 Main 或多页的 Layout）注入以下 Props，无需手动从 SDK 获取：
    </p>
    <ul className={style[bem.e('list')]}>
      <li><code>state</code>: 全局应用状态 (由 logic.jsx 管理)</li>
      <li><code>dispatch</code>: 发送 Action 更新状态的函数</li>
      <li><code>navigate</code>: 路由跳转函数 (仅多页应用)</li>
      <li><code>pid</code>: 当前进程 ID</li>
    </ul>

    <h4 className={style[bem.e('subtitle')]}>API 列表</h4>
    <ul className={style[bem.e('list')]}>
      <li><code>AppSDK.React</code>: React 18 核心对象</li>
      <li><code>AppSDK.ReactDOM</code>: ReactDOM 对象</li>
      <li><code>AppSDK.API.openApp(appId)</code>: 打开其他应用</li>
      <li><code>AppSDK.API.fs</code>: 文件系统访问接口</li>
    </ul>
  </div>
)

const BundleSection = () => (
    <div className={style[bem.e('section')]}>
      <h2 className={style[bem.e('title')]}>多页应用机制 (Level 1)</h2>
      <p className={style[bem.e('text')]}>
        系统Worker会自动注入路由状态 <code>state.router.path</code>。
        当检测到是多页应用(Bundle)时，系统会自动初始化路由为 <code>home</code>。
      </p>

      <h4 className={style[bem.e('subtitle')]}>文件结构规范</h4>
      <ul className={style[bem.e('list')]}>
        <li><code>layout.jsx</code> (必须): 根容器，接收 <code>PageComponent</code> 属性。</li>
        <li><code>logic.jsx</code> (可选): 定义 Reducer。注意：Worker 会自动拦截 <code>NAVIGATE</code> 动作更新路由。</li>
        <li><code>home.jsx</code> (推荐): 默认首页文件。</li>
        <li><code>*.jsx</code>: 其他页面文件，文件名即为路由路径。</li>
      </ul>

      <h4 className={style[bem.e('subtitle')]}>系统级导航</h4>
      <p className={style[bem.e('text')]}>
        Layout 组件会自动接收 <code>navigate</code> 函数作为 Prop。
      </p>
      <pre className={style[bem.e('code')]}>
{`// layout.jsx
const { Button } = AppSDK.Components;

// 系统自动注入 navigate, state, dispatch
export default ({ PageComponent, navigate, state, dispatch }) => {

  return (
    <div className="app-container">
      <nav>
        {/* 切换到 home.jsx */}
        <Button onClick={() => navigate('home')}>首页</Button>
        {/* 切换到 about.jsx */}
        <Button onClick={() => navigate('about')}>关于</Button>
      </nav>
      <main>
        {/* 系统根据 state.router.path 自动注入对应的组件 */}
        {/* PageComponent 也会自动接收 state, dispatch, navigate */}
        <PageComponent />
      </main>
    </div>
  );
};`}
      </pre>
    </div>
  )

const PatternSection = () => (
    <div className={style[bem.e('section')]}>
      <h2 className={style[bem.e('title')]}>内部组件与多级路由 (Level 2)</h2>
      <p className={style[bem.e('text')]}>
        虽然系统路由（navigate）处理的是文件层级的跳转，但你完全可以在单个文件内利用 React 的组件化特性
        实现更细粒度的拆分和多级嵌套路由。
      </p>

      <h4 className={style[bem.e('subtitle')]}>1. 定义内部组件</h4>
      <p className={style[bem.e('text')]}>
        解析器支持在同一个 JSX 文件中定义多个函数组件，仅将主组件 export default。
        这有助于保持代码内聚。
      </p>
      <pre className={style[bem.e('code')]}>
{`// settings.jsx 内部

// 子组件：个人资料
const ProfileView = () => <div>用户资料...</div>;

// 子组件：安全设置
const SecurityView = () => <div>密码修改...</div>;

// 默认导出：主视图
export default ({ state }) => { ... }`}
      </pre>

      <h4 className={style[bem.e('subtitle')]}>2. 实现二级路由</h4>
      <p className={style[bem.e('text')]}>
        使用 <code>useState</code> 在组件内部控制渲染逻辑，实现视觉上的多级路由。
      </p>
      <pre className={style[bem.e('code')]}>
{`// settings.jsx
const { useState } = AppSDK;

// 定义子视图
const Profile = () => <div>Profile Content</div>;
const Security = () => <div>Security Content</div>;

export default ({ navigate }) => {
    // 内部路由状态，默认显示 profile
    const [subTab, setSubTab] = useState('profile');

    return (
        <div className="settings-page">
            <div className="sidebar">
                <button onClick={() => setSubTab('profile')}>个人资料</button>
                <button onClick={() => setSubTab('security')}>安全设置</button>
                <button onClick={() => navigate('home')}>返回首页</button>
            </div>

            <div className="content">
                {/* 根据 State 渲染不同内部组件 */}
                {subTab === 'profile' && <Profile />}
                {subTab === 'security' && <Security />}
            </div>
        </div>
    );
};`}
      </pre>
    </div>
  )

const FullExampleSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>综合示例：系统设置中心</h2>
    <p className={style[bem.e('text')]}>
      本示例展示了一个完整的应用结构，包含：
      1. <strong>logic.jsx</strong>: 全局状态管理
      2. <strong>layout.jsx</strong>: 系统级路由导航 (Level 1)
      3. <strong>account.jsx</strong>: 内部多级路由 (Level 2)
    </p>

    <h4 className={style[bem.e('subtitle')]}>1. 逻辑层 (logic.jsx)</h4>
    <pre className={style[bem.e('code')]}>
{`export const initialState = {
  theme: 'light',
  user: { name: 'Admin', role: 'root' }
};

export function reducer(state, action) {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return { ...state, theme: state.theme === 'light' ? 'dark' : 'light' };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    default:
      return state;
  }
}`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>2. 布局层 (layout.jsx)</h4>
    <pre className={style[bem.e('code')]}>
{`// 导出样式，每个组件的页面style，单个文件只有一个style,系统会自动注入并添加作用域隔离
export const style = \`
  .app-container { display: flex; height: 100%; font-family: sans-serif; }
  .sidebar { width: 200px; background: #f5f5f5; border-right: 1px solid #ddd; padding: 10px; }
  .content { flex: 1; padding: 20px; }
  .menu-btn { display: block; width: 100%; padding: 10px; margin-bottom: 5px; text-align: left; border: none; background: none; cursor: pointer; }
  .menu-btn:hover { background: #e0e0e0; }
\`;

const { Button } = AppSDK.Components;

// 系统自动注入 state, dispatch, navigate
export default ({ PageComponent, navigate, state, dispatch }) => {
  return (
    <div className={\`app-container \${state.theme}\`}>
      {/* Level 1: 侧边栏导航 (文件级) */}
      <div className="sidebar">
        <h3>设置中心</h3>
        <button className="menu-btn" onClick={() => navigate('home')}>
           通用设置
        </button>
        <button className="menu-btn" onClick={() => navigate('account')}>
           账户管理
        </button>

        <div style={{ marginTop: 20 }}>
          <Button onClick={() => dispatch({ type: 'TOGGLE_THEME' })}>
            切换主题: {state.theme}
          </Button>
        </div>
      </div>

      {/* 内容区域：渲染子页面 */}
      <div className="content">
        <PageComponent />
      </div>
    </div>
  );
};`}
    </pre>

    <h4 className={style[bem.e('subtitle')]}>3. 页面层 (account.jsx)</h4>
    <pre className={style[bem.e('code')]}>
{`const { useState } = AppSDK;
const { Input, Button } = AppSDK.Components;

// --- 内部组件：基本信息 ---
const BasicInfo = ({ user, dispatch }) => {
  const [name, setName] = useState(user.name);
  return (
    <div>
      <h3>基本信息</h3>
      <div style={{ marginBottom: 10 }}>
        <label>用户名: </label>
        <Input value={name} onChange={e => setName(e.target.value)} />
      </div>
      <Button onClick={() => dispatch({ type: 'UPDATE_USER', payload: { name } })}>
        保存更改
      </Button>
    </div>
  );
};

// --- 内部组件：安全设置 ---
const Security = () => (
  <div>
    <h3>安全设置</h3>
    <p>当前密码强度: <span style={{ color: 'green' }}>高</span></p>
    <Button type="danger">重置密码</Button>
  </div>
);

// --- 主导出组件 ---
// 自动接收 state, dispatch, navigate
export default ({ state, dispatch, navigate }) => {
  // Level 2: 内部路由状态
  const [activeTab, setActiveTab] = useState('basic');

  const tabStyle = (isActive) => ({
    padding: '8px 16px',
    marginRight: 10,
    cursor: 'pointer',
    borderBottom: isActive ? '2px solid blue' : 'none',
    fontWeight: isActive ? 'bold' : 'normal'
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>账户管理</h2>
        <button onClick={() => navigate('home')}>返回通用</button>
      </div>

      {/* 顶部 Tab 切换 */}
      <div style={{ marginBottom: 20, borderBottom: '1px solid #eee' }}>
        <span style={tabStyle(activeTab === 'basic')} onClick={() => setActiveTab('basic')}>
          基本信息
        </span>
        <span style={tabStyle(activeTab === 'security')} onClick={() => setActiveTab('security')}>
          安全设置
        </span>
      </div>

      {/* 根据内部状态渲染对应子组件 */}
      <div className="tab-content">
        {activeTab === 'basic' && <BasicInfo user={state.user} dispatch={dispatch} />}
        {activeTab === 'security' && <Security />}
      </div>
    </div>
  );
};`}
    </pre>
  </div>
)

const AdminSection = () => (
  <div className={style[bem.e('section')]}>
    <h2 className={style[bem.e('title')]}>系统应用扩展 (adminAppSdk)</h2>
    <p className={style[bem.e('text')]}>
      系统级应用拥有更高的权限，通过 <code>adminAppSdk</code> 暴露。
      它继承了基础 SDK 的所有功能，并增加了管理权限。
    </p>

    <h4 className={style[bem.e('subtitle')]}>扩展能力</h4>
    <ul className={style[bem.e('list')]}>
      <li><strong>rootSeed:</strong> 生成系统级唯一 ID 种子</li>
      <li><strong>Components.Developer:</strong> 开发者中心组件</li>
      <li><strong>kernel:</strong> 直接访问系统内核 (慎用)</li>
    </ul>

    <pre className={style[bem.e('code')]}>
{`export const adminAppSdk = {
  ...devAppSdk,
  API: {
    ...devAppSdk.API,
    rootSeed: generateShortSeed,
  },
  // ... 系统组件
};`}
    </pre>
  </div>
)

const CompilerSection = () => (
    <div className={style[bem.e('section')]}>
        <h2 className={style[bem.e('title')]}>编译原理 (Babel)</h2>
        <p className={style[bem.e('text')]}>
            为了适应沙箱环境，Babel 配置经过了特殊定制。
            所有的 JSX 标签不会转换为标准的 <code>React.createElement</code>，
            而是转换为 <code>AppSDK.React.createElement</code>。
        </p>
        <p className={style[bem.e('text')]}>
            这意味着在编写组件时，无需显式引入 React，但必须确保代码在 SDK 上下文中执行。
        </p>
    </div>
)

const CodeSpecSection = () => (
    <div className={style[bem.e('section')]}>
        <h2 className={style[bem.e('title')]}>代码规范与最佳实践</h2>

        <h4 className={style[bem.e('subtitle')]}>组件导出</h4>
        <p className={style[bem.e('text')]}>
            每个 <code>.jsx</code> 文件必须导出一个默认函数组件。
        </p>
        <pre className={style[bem.e('code')]}>
{`// 正确
export default ({ state, dispatch }) => {
  return <div>App Content</div>;
};

// 错误
export const App = ...`}
        </pre>

        <h4 className={style[bem.e('subtitle')]}>样式隔离</h4>
        <p className={style[bem.e('text')]}>
            推荐使用 <code>export const style = `...`</code> 导出 CSS 字符串。
            系统会自动对其进行 Scoped 处理，防止污染全局样式。
        </p>
    </div>
)

const NetworkSection = () => (
    <div className={style[bem.e('section')]}>
        <h2 className={style[bem.e('title')]}>网络请求与安全沙箱</h2>
        <p className={style[bem.e('text')]}>
            为了确保系统安全和数据隔离，应用运行在一个受限的沙箱环境中。
            所有的网络请求都必须经过系统内核的代理，禁止直接访问原生浏览器接口。
        </p>

        <h4 className={style[bem.e('subtitle')]}>使用说明</h4>
        <ul className={style[bem.e('list')]}>
            <li><strong>自动注入：</strong>你无需 import，系统已经自动将安全的 <code>fetch</code> 函数注入到全局作用域。</li>
            <li><strong>禁用 API：</strong>直接访问 <code>window.fetch</code>、<code>XMLHttpRequest</code>、<code>self.fetch</code> 等会被系统拦截并报错。</li>
            <li><strong>请求头增强：</strong>所有的请求会自动附带 <code>x-kernel-process-id</code> 头，用于服务端识别应用身份。</li>
        </ul>

        <h4 className={style[bem.e('subtitle')]}>代码示例</h4>
        <p className={style[bem.e('text')]}>
            直接像平常一样使用 <code>fetch</code> 即可。
        </p>
        <pre className={style[bem.e('code')]}>
{`// 正确写法
const fetchData = async () => {
    try {
        // 直接使用 fetch，无需 AppSDK.API.fetch
        const res = await fetch('https://api.example.com/data');
        const data = await res.json();
        console.log(data);
    } catch (err) {
        console.error('请求失败', err);
    }
};

// 错误写法 (会被沙箱拦截)
const badRequest = () => {
    //会被沙箱拦截无法发出.
    window.fetch('...');
    //xhr被禁用
    const xhr = new XMLHttpRequest();
};`}
        </pre>
        <div className={style[bem.e('tip')]}>
            注意：虽然 <code>AppSDK.API.fetch</code> 也是可用的，但为了代码简洁性，我们推荐直接使用全局的 <code>fetch</code>。
        </div>
    </div>
)

const docSections = [
  {
    id: 'intro',
    label: '开发概览',
    icon: <DescriptionIcon />,
    component: IntroSection
  },
  {
    id: 'sdk',
    label: '基础 SDK',
    icon: <ExtensionIcon />,
    component: SDKSection
  },
  {
    id: 'network',
    label: '网络请求',
    icon: <PublicIcon />,
    component: NetworkSection
  },
  {
    id: 'bundle',
    label: '系统路由',
    icon: <FolderZipIcon />,
    component: BundleSection
  },
  {
    id: 'pattern',
    label: '多级路由',
    icon: <AccountTreeIcon />,
    component: PatternSection
  },
  {
    id: 'example',
    label: '综合示例',
    icon: <WebIcon />,
    component: FullExampleSection
  },
  {
    id: 'compiler',
    label: '编译配置',
    icon: <BuildIcon />,
    component: CompilerSection
  },
  {
    id: 'admin',
    label: '系统权限',
    icon: <SecurityIcon />,
    component: AdminSection
  },
  {
    id: 'code',
    label: '代码规范',
    icon: <CodeIcon />,
    component: CodeSpecSection
  }
];

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
        </div>
        <div className={style[bem.e('nav')]}>
          {docSections.map(item => (
            <div
              key={item.id}
              className={[
                style[bem.e('nav-item')],
                style[bem.is('active',activeTabId === item.id)]
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
}

export default Helper;
