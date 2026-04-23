import { configureStore, combineReducers, createDynamicMiddleware } from "@reduxjs/toolkit";
import SukinOsReducer from "@/sukinos/store.jsx"
// 我们拆分是为了精细化管理,因为有的只是一个需要
const isDevelopment = import.meta.env.VITE_DEV=='true';

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  createTransform
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import sessionStorage from "redux-persist/es/storage/session";

// 创建动态中间件实例
const dynamicMiddleware = createDynamicMiddleware();

// 中间件配置存储
const middlewareConfig = {
  educationApi: { enabled: true, middleware: null },
  educationTerminal: { enabled: true, middleware: null },
};

// 动态reducer存储
const asyncReducers = {};


const educationPersistConfig = {
  key: 'education',
  storage: storage,
  blacklist: ['file', 'terminal'], // 不持久化文件和终端模块
  // transforms
};

const sukinOsPersistConfig = {
  key: 'sukinos',
  storage: storage,
};


// 初始静态reducer
const staticReducers = {
  sukinos: persistReducer(sukinOsPersistConfig, SukinOsReducer),
};

// 创建组合reducer工厂函数 (支持静态和动态组合)
const createRootReducer = () => {
  return combineReducers({
    ...staticReducers,
    ...asyncReducers
  });
};




// 开关包装器中间件
const createSwitchableMiddleware = (innerMiddleware, configKey) => {
  // innerMiddleware这个正常的中间件书写
  return (store) => (next) => (action) => {
    if (!middlewareConfig[configKey]?.enabled) {
      return next(action);
    }
    return innerMiddleware(store)(next)(action);
  };
};

export const store = configureStore({
  reducer: createRootReducer(),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER'],
        ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
        ignoredPaths: ['items.dates'],
        warnAfter: 100, // 只在开发环境下显示警告
      },
      immutableCheck: isDevelopment, // 简化表达
    }).concat(dynamicMiddleware.middleware) // 注入动态中间件实例
});


const initializeSwitchableMiddleware = () => {
  // // Education API 中间件
  // const switchableApi = createSwitchableMiddleware(EducationApiMiddleware(), 'educationApi');
  // middlewareConfig.educationApi.middleware = switchableApi;
  // // Education Terminal 中间件
  // const switchableTerminal = createSwitchableMiddleware(EducationTerminalMiddleware(), 'educationTerminal');
  // middlewareConfig.educationTerminal.middleware = switchableTerminal;

  // // 添加所有初始的开关中间件到动态管理器
  // dynamicMiddleware.addMiddleware(switchableApi, switchableTerminal);
  // 这里已经被移植到只有进入相关的才会注册
};

// 执行中间件初始化
initializeSwitchableMiddleware();


// 动态注入reducer
store.injectReducer = (key, reducer) => {
  if (asyncReducers[key]) {
    return;
  }

  asyncReducers[key] = reducer;
  store.replaceReducer(createRootReducer());//缺点会丢失这个reducer的状态为重置的[即使进行了持久化等,可以优化的方案就是这个create可以做一个缓存]
};

// 移除动态reducer
store.removeReducer = (key) => {
  if (!asyncReducers[key]) {
    return;
  }

  delete asyncReducers[key];
  store.replaceReducer(createRootReducer());
};

// 动态注入中间件 - 使用开关模式
store.injectMiddleware = (name, middlewareFactory) => {
  if (middlewareConfig[name]) {
    return false;
  }

  middlewareConfig[name] = { enabled: true, middleware: null };
  const switchableMw = createSwitchableMiddleware(middlewareFactory(), name);
  middlewareConfig[name].middleware = switchableMw;

  dynamicMiddleware.addMiddleware(switchableMw);
  return true;
};

// 启用中间件
store.enableMiddleware = (name) => {
  if (!middlewareConfig[name]) {
    return false;
  }

  middlewareConfig[name].enabled = true;
  return true;
};

// 禁用中间件
store.disableMiddleware = (name) => {
  if (!middlewareConfig[name]) {
    return false;
  }
  middlewareConfig[name].enabled = false;
  return true;
};

// 检查中间件状态
store.isMiddlewareEnabled = (name) => {
  return middlewareConfig[name]?.enabled || false;
};

// 获取中间件配置
store.getMiddlewareConfig = () => {
  return Object.keys(middlewareConfig).reduce((acc, key) => {
    acc[key] = { enabled: middlewareConfig[key].enabled };
    return acc;
  }, {});
};




export const persistore = persistStore(store);

export default store;
