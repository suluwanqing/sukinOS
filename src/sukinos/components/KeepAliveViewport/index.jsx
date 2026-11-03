import { Children, isValidElement, memo, useRef } from 'react'
import { shouldAppKeepAlive } from '@/sukinos/utils/config'

/**
 * 宿主级视口保活容器
 * custom.keepAlive 或 custom.adaptiveMount=false 保留完整窗口，
 * 其余后台退居占位，彻底回收 DOM 与 GPU 资源。
 */
export const HostKeepAlive = memo(function HostKeepAlive({
  apps,
  activePids,
  renderWindow,
  renderPlaceholder,
}) {
  return (
    <>
      {apps.map(app => {
        const { pid } = app
        const isVisible = activePids.has(pid)
        const keepMounted = shouldAppKeepAlive(app)

        if (!isVisible && !keepMounted) {
          return renderPlaceholder ? renderPlaceholder(app) : null
        }
        return renderWindow(app, isVisible)
      })}
    </>
  )
})

// React.Children.toArray 会给显式 key 加上 ".$" 前缀，比较前还原成开发者写的值
const readChildKey = (child, index) => {
  const tabKey = child.props?.tabKey
  if (tabKey !== undefined && tabKey !== null) return String(tabKey)
  if (child.key !== undefined && child.key !== null) return String(child.key).replace(/^\.\$/, '')
  return String(index)
}

/**
 * 组件级轻量保活容器（AppSDK.Components.KeepAlive）
 * 只挂载访问过的面板，切换时用 display 隐藏，滚动位置与表单输入原地保留。
 * 面板标识优先取 tabKey，未提供时回退到 React key。
 */
export const KeepAlive = ({ activeKey, children, className, style }) => {
  const currentKey = activeKey === undefined || activeKey === null ? null : String(activeKey)
  const visitedKeysRef = useRef(new Set(currentKey === null ? [] : [currentKey]))
  if (currentKey !== null) visitedKeysRef.current.add(currentKey)

  return (
    <div
      className={className}
      style={{ width: '100%', height: '100%', position: 'relative', ...style }}
    >
      {Children.toArray(children).map((child, index) => {
        if (!isValidElement(child)) return null
        const key = readChildKey(child, index)
        if (!visitedKeysRef.current.has(key)) return null
        return (
          <div
            key={`${key}::${index}`}
            style={{
              width: '100%',
              height: '100%',
              display: key === currentKey ? 'block' : 'none',
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}
