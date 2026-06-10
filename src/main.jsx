import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import store,{persistore } from './store/main.jsx'
import { PersistGate } from 'redux-persist/integration/react'
import { RouterProvider } from 'react-router-dom'
import router from './router/main.jsx'
import AlertProvider from "./component/alert/layout.jsx"
import ConfirmProvider from './component/confirm/layout.jsx'
import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
loader.config({ monaco });

import('/utils/js/installSw.js').then(module => {
  module.default();
});

const root = createRoot(document.getElementById('root'))
root.render(
  // <StrictMode>
    <Provider store={store}>
      <PersistGate
        loading={null}
        persistor={persistore}
      >


                          <AlertProvider />
                          <ConfirmProvider/>


        <RouterProvider
          router={router}
          fallbackElement={<div>加载中...</div>}
        />
      </PersistGate>
    </Provider>
  // </StrictMode>
)
