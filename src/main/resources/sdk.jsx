import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Developer from './developer/layout';
import kernel from "@/utils/process/kernel";
import FileSystem from "./fileSystem/layout"
import NoteBook from "./notebook/layout"
import Start from './start/layout';
//随机种子生成函数。
const generateShortSeed = (
  length = 8,
  seed = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  isNumber = false
) => {
  // 参数验证
  if (length <= 0 || !Number.isInteger(length)) {
    throw new Error('Length must be a positive integer')
  }
  // 如果只需要数字，使用数字字符集
  const characters = isNumber ? '0123456789' : seed
  if (characters.length === 0) {
    throw new Error('Character seed cannot be empty')
  }
  let result = ''
  try {
    // 优先使用 crypto API
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const values = new Uint32Array(length)
      crypto.getRandomValues(values)

      for (let i = 0; i < length; i++) {
        result += characters[values[i] % characters.length]
      }
    } else {
      // 降级方案：使用 Math.random
      for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)]
      }
    }
  } catch (error) {
    // 终极降级方案
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
  }

  return result
}
//注意注入的是变量是AppSDK

// 普通开发者SDK现在是“基础SDK”，包含了所有应用开发所需的基础功能。
export const devAppSdk = {
  // 提供了完整的React核心库和常用Hooks
  React: React,
  useState: useState,
  useEffect: useEffect,
  useRef: useRef,
  useCallback: useCallback,
  useMemo: useMemo,

  // 基础API命名空间
  API: {},
  // 基础组件命名空间
  Components: {}
};

// 系统应用专属SDK现在通过扩展devAppSdk来构建。
export const adminAppSdk = {
  ...devAppSdk,
  API: {
    ...devAppSdk.API, 
    rootSeed: generateShortSeed, // 额外添加高权限的rootSeed函数
  },
  // 扩展Components命名空间
  Components: {
    ...devAppSdk.Components, // 继承基础组件
    Developer,
    FileSystem,
    NoteBook,
    Start
  },
  //暂且认为只有系统拥有
  kernel
};
