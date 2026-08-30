/**
 * ========================================================================================
 * MAPPER 策略注册表：源码格式编译策略统一分发
 *
 * 【架构说明】：
 * 为支持多种源码格式（jsx / js / 未来更多）的预编译，本模块定义了一个策略注册表。
 * 每种源码格式对应一个编译策略类，通过注册表按格式统一分发，便于后续扩展。
 *
 * 【双份存储语义】：
 * - ENV_KEY_CONTENT 保留原始源码（JSX 或 JS），供调试/反编译/提取
 * - ENV_KEY_CONTENT_PRECOMPILED 存预编译后的 JS 产物，运行时优先使用
 * - js 格式无需编译，直接透传（产物与原始一致）
 * ======================================================================================== */
import { BabelLoader } from './babelLoader'

/**
 * 支持的源码格式枚举
 * @type {{JSX: string, JS: string}}
 */
export const SOURCE_FORMATS = {
  JSX: 'jsx',
  JS: 'js',
}

/**
 * 根据文件后缀识别源码格式
 * @param {string} filename - 文件名或模块 key（如 'main.js' / 'App.js'）
 * @returns {string} SOURCE_FORMATS 中的源码格式，未知后缀默认按 jsx 处理
 */
export function detectSourceFormat(filename = '') {
  const ext = String(filename).split('.').pop()?.toLowerCase()
  if (ext === 'js') return SOURCE_FORMATS.JS
  return SOURCE_FORMATS.JSX
}

/**
 * 解析相对路径导入为模块 key
 * 支持 ./other、../components/Button、./pages/about/index 等相对路径，
 * 并自动补全扩展名（.jsx/.js）与 index 入口。
 * @param {string} fromKey - 当前模块 key（如 'pages/about/index'）
 * @param {string} importPath - 导入路径（如 './Button'、'../utils/helper'）
 * @param {string[]} availableKeys - 所有可用模块 key 列表
 * @returns {string} 解析后的模块 key；非相对路径（如 'react'）原样返回
 */
export function resolveModulePath(fromKey, importPath, availableKeys) {
  if (!importPath || !importPath.startsWith('.')) return importPath
  const keySet = new Set(availableKeys)
  // 计算当前模块所在目录
  const baseDir = fromKey.includes('/') ? fromKey.substring(0, fromKey.lastIndexOf('/')) : ''
  const baseParts = baseDir ? baseDir.split('/') : []
  const importParts = importPath.split('/')
  const resolved = [...baseParts]
  for (const part of importParts) {
    if (part === '.' || part === '') continue
    if (part === '..') resolved.pop()
    else resolved.push(part)
  }
  const base = resolved.join('/')
  // 尝试多种候选：原路径、补扩展名、index 入口
  // 支持 .jsx/.js 组件与工具模块，以及 .css/.module.css 样式模块
  const candidates = [
    base,
    `${base}.jsx`,
    `${base}.js`,
    `${base}.css`,
    `${base}.module.css`,
    `${base}/index`,
    `${base}/index.jsx`,
    `${base}/index.js`,
    `${base}/index.css`,
    `${base}/index.module.css`,
  ]
  for (const c of candidates) {
    if (keySet.has(c)) return c
  }
  return base
}

/**
 * 将路由路径（router.path）规范化为可匹配模块 key 的形式。
 * 兼容两种 key 格式：无前缀（pages/about/index）与带 ./ 前缀（./pages/about/index），
 * 并自动补全 index 入口。deskBook 与 renderProcess 共用此规则，保证路由解析一致。
 * @param {string} currentPath - 当前路由路径（如 'home'、'pages/about'、'./pages/about'）
 * @param {string[]} availableKeys - 所有可用模块 key 列表
 * @returns {string} 匹配到的模块 key；未匹配则返回规范化后的路径本身
 */
export function resolveModuleKey(currentPath, availableKeys) {
  if (!currentPath) return currentPath
  const keySet = new Set(availableKeys)
  // 规范化：去 ./ 前缀、去尾部斜杠、去扩展名
  let path = String(currentPath).replace(/^\.\//, '').replace(/\/+$/, '').replace(/\.(jsx|js)$/, '')
  const candidates = [
    path,
    `./${path}`,
    `${path}/index`,
    `./${path}/index`,
  ]
  for (const c of candidates) {
    if (keySet.has(c)) return c
  }
  return path
}

/**
 * 编译策略基类
 * 每个源码格式对应一个策略，实现 compile(code, options) 返回编译后的 JS 字符串。
 */
class SourceCompileStrategy {
  constructor(format) {
    this.format = format
  }

  /**
   * 编译入口（子类实现）
   * @param {string} code - 原始源码
   * @param {object} options - { module, filename }
   * @returns {Promise<string>} 编译后的 JS 字符串
   */
  async compile(code, options) {
    throw new Error(`[sourceMapper] ${this.format} 策略未实现 compile 方法`)
  }
}

/**
 * JSX 策略：调用 BabelLoader 将 JSX 编译为 JS
 */
class JsxCompileStrategy extends SourceCompileStrategy {
  constructor() {
    super(SOURCE_FORMATS.JSX)
  }

  async compile(code, options = {}) {
    await BabelLoader.load()
    return BabelLoader.transform(code, {
      type: SOURCE_FORMATS.JSX,
      module: options.module || 'component',
    })
  }
}

/**
 * JS 策略：无需编译，直接透传
 */
class JsCompileStrategy extends SourceCompileStrategy {
  constructor() {
    super(SOURCE_FORMATS.JS)
  }

  async compile(code) {
    return code
  }
}

/**
 * 策略注册表：格式 -> 策略实例
 */
const STRATEGY_REGISTRY = {
  [SOURCE_FORMATS.JSX]: new JsxCompileStrategy(),
  [SOURCE_FORMATS.JS]: new JsCompileStrategy(),
}

/**
 * 统一编译分发入口
 * 根据源码格式从注册表取出对应策略并执行编译。
 * @param {string} code - 原始源码
 * @param {object} [options] - { format, module, filename }
 * @returns {Promise<string>} 编译后的 JS 字符串
 */
export async function compileSource(code, options = {}) {
  const format = options.format || detectSourceFormat(options.filename || '')
  const strategy = STRATEGY_REGISTRY[format]
  if (!strategy) {
    throw new Error(`[sourceMapper] 不支持的源码格式: ${format}`)
  }
  return strategy.compile(code, options)
}