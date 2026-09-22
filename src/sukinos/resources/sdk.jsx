import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Developer from '@/sukinos/resources/developer/layout';
import _kernel  from "@/sukinos/utils/process/kernel";
import FileSystem from "@/sukinos/resources/fileSystem/layout"
import NoteBook from "@/sukinos/resources/notebook/layout"
import Setting from '@/sukinos/resources/setting/layout';
import Start from "@/sukinos/resources/start/layout"
import Store from '@/sukinos/resources/store/layout';
import LocalDev from "@/sukinos/resources/localDev/layout"
import SystemDashboard from "@/sukinos/resources/systemManage/layout"
import DrawBoard from "@/sukinos/resources/drawBoard/layout"
import Sheet from "@/sukinos/resources/sheet/layout"
/*公共组件*/
import  * as AllComponent from "@/component/main"
import * as hooks from "@/sukinos/hooks/main"


import * as middleware from "@/sukinos/middleware/main"
// 从抽离出的安全模块统一引入
import {
  createStorageProxy,
  createIndexedDBProxy,
  generateShortSeed,
  safeDeepFreeze,
  createSecureFetch,
  createReadonlySDKProxy
} from '@/sukinos/utils/security'

// --- SDK 模板定义 ---

export const devAppSdk = {
  // 提供了完整的React核心库和常用Hooks
  React: React,
  useState: useState,
  useEffect: useEffect,
  useRef: useRef,
  useCallback: useCallback,
  useMemo: useMemo,
  API: {},
  Components: {
    ...AllComponent
  },
  kernel: {
    // 这两个方法内部要用 this 取 lifecycle/registry，从对象字面量抄引用会脱绑，调用即 TypeError
    evokeApp: _kernel.evokeApp.bind(_kernel),
    getTypeApps: _kernel.getTypeApps.bind(_kernel),
  },
  hooks: {
      useFileSystem:hooks.useFileSystem
  },
  middleware
};

export const adminAppSdk = {
  ...devAppSdk,
  API: {
    ...devAppSdk.API,
    rootSeed: generateShortSeed, // 额外添加高权限的rootSeed函数
  },
  Components: {
    ...devAppSdk.Components,
    Developer,
    FileSystem,
    NoteBook,
    Setting,
    Start,
    Store,
    LocalDev,
    SystemDashboard,
    DrawBoard,
    Sheet,
  },
  hooks,
  kernel:_kernel //对于系统级别直接暴露全部
};

// --- SDK 工厂函数 ---

// 预览/无窗口外壳环境的窗口控制兜底：同步调用绝不抛错，给可诊断日志
const noopWindowControls = {
  close: () => console.warn('[AppSDK] window.close() 不可用：当前环境无窗口外壳'),
  hibernate: () => console.warn('[AppSDK] window.hibernate() 不可用：当前环境无窗口外壳'),
  toggleMaximize: () => console.warn('[AppSDK] window.toggleMaximize() 不可用：当前环境无窗口外壳'),
  setRect: () => console.warn('[AppSDK] window.setRect() 不可用：当前环境无窗口外壳'),
  getRect: () => null,
};

/**
 * 动态创建并返回一个为特定进程实例定制的、完全隔离和安全的 SDK。
 * @param {function} dispatch - 用于与主应用状态通信的 dispatch 函数
 * @param {string} pid - 当前应用的进程 ID
 * @param {boolean} isSystemApp - 标记是否为高权限的系统应用
 * @param {object} [windowControls] - 宿主窗口外壳注入的窗口控制 API（close/hibernate/toggleMaximize/setRect/getRect），无窗口外壳时使用 no-op 兜底
 * @returns {object} 一个完全配置好并深度冻结的 SDK 对象
 */
export const createSdkForInstance = (dispatch, pid, isSystemApp, windowControls) => {
  const privateScope = (() => {
    // 调用安全模块的高阶拦截器，保证此处 fetch 也能注入 pid
    const secureFetch = createSecureFetch(window.fetch, pid);
    Object.freeze(secureFetch); // 彻底冻结防篡改

    return {
      fetch: secureFetch,
      // 纯粹的路由分发逻辑
      navigate: (path) => dispatch({ type: 'NAVIGATE', payload: path }),
      pid,
      // 窗口控制 API：hideHeader 等场景下由 APP 自行实现窗口操作
      window: windowControls || noopWindowControls,
    };
  })();

  const baseSdk = isSystemApp ? adminAppSdk : devAppSdk;

  // 创建并注入基于 PID 隔离的系统 API 代理
  const systemApis = {
      localStorage: createStorageProxy(window.localStorage, pid),
      sessionStorage: createStorageProxy(window.sessionStorage, pid),
      indexedDB: createIndexedDBProxy(window.indexedDB, pid),
  };

  // 注意注入的变量是 AppSDK
  const AppSDK = {
    ...baseSdk,
    API: { ...baseSdk.API, ...privateScope },
    System: systemApis, // 将代理后的 API 挂载到 SDK.System
  };

  // 只冻结关键的 API 和 System 部分，防止应用通过这些 API 侵入主进程
  // 不冻结 Components 和 React 相关对象，避免不必要的错误
  safeDeepFreeze(AppSDK.API);
  safeDeepFreeze(AppSDK.System);

  if (AppSDK.Components && !Object.isFrozen(AppSDK.Components)) {
    try {
      Object.freeze(AppSDK.Components);
    } catch (error) {
      console.warn('Failed to freeze Components:', error);
    }
  }

  // 通过独立出来的 security 代理生成器，包裹并防御 [Symbol.iterator] 和 恶意覆写
  return createReadonlySDKProxy(AppSDK);
};
