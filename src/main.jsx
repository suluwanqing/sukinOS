import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import store,{persistore } from './store/main.jsx'
import { PersistGate } from 'redux-persist/integration/react'
import { RouterProvider } from 'react-router-dom'
import router from './router/main.jsx'
import AlertProvider from "./component/alert/layout.jsx"
import ConfirmProvider from './component/confirm/layout.jsx'

import AuthorInfoPrinter from './middleware/author-info/layout.jsx';
import RoutePermission from './middleware/routePermission/layout.jsx';
import './global.css'
// 注意引的是 themeMode.js 而不是 usePersonalization.jsx：后者传递依赖了 VFS / config
// 等一大串，从那里引会把整套依赖拖进入口 chunk。themeMode.js 是零依赖的几行同步逻辑。
import { bootstrapThemeMode } from './themeMode.js';

import('/utils/js/installSw.js').then(module => {
  module.default();
});

/* 深色模式首屏引导：必须在 createRoot().render() 之前同步执行。
   个性化配置存在 VFS 里、是异步加载的，不等它就会先按默认浅色画一帧再翻，
   刷新时能看到一次白屏闪烁。这里先读 localStorage 里的 themeMode 镜像把 .dark 挂对，
   之后 usePersonalization 的 effect 会以 VFS 里的真实配置为准校正过来。 */
bootstrapThemeMode();

const root = createRoot(document.getElementById('root'))
root.render(
  // <StrictMode>
    <Provider store={store}>
      <PersistGate
        loading={null}
        persistor={persistore}
      >


                          <AlertProvider />
                          <ConfirmProvider />
                          <AuthorInfoPrinter /> {/* 在顶级路由打印的信息 */}
                          <RoutePermission /> {/* 路由权限中间件，拦截越权 API 请求 */}


        <RouterProvider
          router={router}
          fallbackElement={<div>加载中...</div>}
      >
        </RouterProvider>
      </PersistGate>
    </Provider>
  // </StrictMode>
)
