import { createSlice, configureStore } from '@reduxjs/toolkit'
import { createSelector } from '@reduxjs/toolkit'
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist'
import sessionStorage from 'redux-persist/lib/storage/session'

/*=========================================持久化配置====================================================*/
const persistConfig = {
  key: 'admin',
  storage: sessionStorage,
  whitelist: ['userInfo', 'seting'],
  timeout: 1000,
}

/*=========================================初始化切片数据====================================================*/
const initialState = {
  userInfo: null,
  seting: {
    isDisplay: true
  },
  developer: {
    appList: [],
    code: {
      content: '',
      logic: ''
    },
    isBundle: false,
    name: '未命名',
    metaInfo: {
      name: '未命名',
      icon: null,
      initialSize: { w: 500, h: 400, x: 0, y: 0 }
    }
  }
}

/*===========================================切片主体===============================================*/
const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {
    setUserInfo: (state, action) => {
      state.userInfo = {
        ...state.userInfo,
        ...action.payload
      }
    },
    clearUserInfo: (state) => {
      state.userInfo = {}
    },
    updateSeting: (state, action) => {
      const { key, value } = action.payload
      if (state.seting[key] !== undefined) {
        state.seting[key] = value
      }
    },
    resetAdminState: () => initialState
  },
})

/*===========================================创建持久化reducer===============================================*/
const persistedReducer = persistReducer(persistConfig, adminSlice.reducer)

/*===========================================创建store===============================================*/
export const store = configureStore({
  reducer: {
    admin: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
})

export const persistor = persistStore(store)

/*===========================================选择器===============================================*/
const admin = (store) => {
  const adminState = store?.admin || initialState
  const { _persist, ...cleanState } = adminState
  return cleanState
}

export const adminActions = adminSlice.actions
export const selectorSeting = createSelector([admin], (admin) => admin.seting)
export const selectorUserInfo = createSelector([admin], (admin) => admin.userInfo)
export const selectorIsDisplay = createSelector([admin], (admin) => admin.seting.isDisplay)
export const selectorDeveloper = createSelector([admin], (admin) => admin.developer)

export default store
