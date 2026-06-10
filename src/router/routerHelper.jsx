import  { lazy, Suspense, useMemo } from 'react'
import AuthGuard from '@/router/AuthGuard'
import Loading from '@/component/info/loding/layout'

/**
 * 全局懒加载组件缓存池
 * 用于解决匿名函数作为参数时引用不一致导致的重复挂载问题
 */
const lazyCache = new Map();

/**
 * 内部统一获取 lazy 组件的方法
 * 使用函数字符串作为标识符进行缓存映射
 */
const getLazyComponent = (importFunc) => {
  if (typeof importFunc !== 'function') return null;
  const key = importFunc.toString();
  if (!lazyCache.has(key)) {
    lazyCache.set(key, lazy(importFunc));
  }
  return lazyCache.get(key);
}

/**
 * 基础懒加载组件
 * 用法: <LazyComponent importFunc={() => import('./Component')} />
 */
export const LazyComponent = ({
  importFunc,
  fallback = <Loading />,
  ...props
}) => {
  // 使用缓存映射获取稳定的组件引用
  const Component = useMemo(() => getLazyComponent(importFunc), [importFunc]);

  return (
    <Suspense fallback={fallback}>
      {Component && <Component {...props} />}
    </Suspense>
  )
}

/**
 * 鉴权包装组件
 */
export const AuthWrapper = ({
  element,
  requireAuth = true,
  allowRoles = [],
  ...guardProps
}) => {
  if (!requireAuth) {
    return element
  }

  return (
    <AuthGuard
      element={element}
      allowRoles={allowRoles}
      {...guardProps}
    />
  )
}

/**
 * 懒加载 + 鉴权组合组件
 */
export const LazyAuthLoad = ({
  importFunc,
  fallback = <Loading />,
  requireAuth = true,
  allowRoles = [],
  guardProps = {},
  ...componentProps
}) => {
  // 同样使用缓存映射逻辑
  const Component = useMemo(() => getLazyComponent(importFunc), [importFunc]);

  const lazyElement = (
    <Suspense fallback={fallback}>
      {Component && <Component {...componentProps} />}
    </Suspense>
  )

  if (!requireAuth) {
    return lazyElement
  }

  return (
    <AuthGuard
      element={lazyElement}
      allowRoles={allowRoles}
      {...guardProps}
    />
  )
}

/**
 * 创建懒加载路由元素
 * @param {Function} importFunc - import() 函数
 * @param {Object} options - 配置选项
 */
export const createLazyRoute = (importFunc, options = {}) => {
  const {
    fallback = <Loading />,
    requireAuth = false,
    allowRoles = [],
    guardProps = {},
    ...componentProps
  } = options

  const LazyRouteElement = () => {
    // 确保在路由元素内部也使用相同的缓存逻辑
    const Component = useMemo(() => getLazyComponent(importFunc), []);

    const lazyElement = (
      <Suspense fallback={fallback}>
        {Component && <Component {...componentProps} />}
      </Suspense>
    )

    if (!requireAuth) {
      return lazyElement
    }

    return (
      <AuthGuard
        element={lazyElement}
        allowRoles={allowRoles}
        {...guardProps}
      />
    )
  }

  return <LazyRouteElement />
}

// 导出所有工具函数
export default {
  LazyComponent,
  AuthWrapper,
  LazyAuthLoad,
  createLazyRoute
}
