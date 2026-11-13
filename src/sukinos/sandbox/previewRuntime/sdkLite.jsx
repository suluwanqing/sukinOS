import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useContext,
  useReducer,
  Fragment
} from "react";
import { publicSdkComponents } from "@/sukinos/resources/sdkComponents";
import { createReadonlySDKProxy, safeDeepFreeze } from "@/sukinos/utils/security";
import { createMemoryStorage, createUnavailableIndexedDB, denyFetch } from "./shims";

const noopWindowControls = {
  close: () => {},
  hibernate: () => {},
  toggleMaximize: () => {},
  setRect: () => {},
  getRect: () => null
};

/**
 * 隔离预览版 SDK 工厂：签名与主 SDK 一致，但只给 dev 形状。
 * 不带主 _kernel、middleware 与实际网络能力，避免把管理端权限带进未审核代码。
 */
export const createSdkForInstance = (dispatch, pid, isSystemApp, windowControls) => {
  const privateScope = {
    fetch: denyFetch,
    navigate: (path) => dispatch({ type: "NAVIGATE", payload: path }),
    pid,
    focus: () => {},
    window: windowControls || noopWindowControls
  };

  const AppSDK = {
    React,
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
    useContext,
    useReducer,
    Fragment,
    API: privateScope,
    Components: { ...publicSdkComponents },
    System: {
      localStorage: createMemoryStorage(),
      sessionStorage: createMemoryStorage(),
      indexedDB: createUnavailableIndexedDB()
    },
    kernel: {
      evokeApp: () => Promise.resolve(null),
      getTypeApps: () => []
    },
    hooks: {},
    middleware: {}
  };

  safeDeepFreeze(AppSDK.API);
  safeDeepFreeze(AppSDK.System);
  try {
    Object.freeze(AppSDK.Components);
  } catch (error) {
    console.warn("Failed to freeze preview SDK Components:", error);
  }

  return createReadonlySDKProxy(AppSDK);
};
