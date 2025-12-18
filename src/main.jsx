import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { RouterProvider } from 'react-router-dom'
import router from './router/main.jsx'
import AlertProvider from "./component/alert/layout.jsx"
import ConfirmProvider from './component/confirm/layout.jsx'
import { store, persistor } from './store.jsx' // 直接从切片文件导入
import './main.css'
import "./utils/css/root.css"
import installSw from "@/utils/js/installSw"

const root = createRoot(document.getElementById('root'))
installSw()

root.render(
  // <StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AlertProvider />
        <ConfirmProvider />
        <RouterProvider
          router={router}
          fallbackElement={<div>加载中...</div>}
        />
      </PersistGate>
    </Provider>
  // </StrictMode>
)
