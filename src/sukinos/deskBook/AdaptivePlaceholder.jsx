import { memo } from 'react'

/**
 * AdaptiveWindowPlaceholder — 后台窗口的轻量占位组件
 *
 * 当应用的 custom.adaptiveMount 开启且窗口不可见（非焦点、非调度器显示）时，
 * 使用此组件替代完整的 ProcessWindow（包含 iframe/DynamicRenderer/header/8 个 resize handle）。
 *
 * 每个占位仅消耗一个绝对定位的 <div>（display: none），
 * 相比完整窗口节省约 10-30MB（物理沙箱 iframe）的大量内存和 GPU 层。
 *
 * 唤醒时序:
 *   1. onFocus(pid) 触发父组件状态更新
 *   2. DeskBook 检测到 pid 不再是 placeholder → 移除占位，挂载完整 ProcessWindow
 *   3. useProcessBridge 从 commHub.stateCache 恢复最新状态
 *   4. 窗口出现在离眼前的最后位置
 */
const AdaptiveWindowPlaceholder = ({ pid, app, zIndex }) => {
  return (
    <div
      data-pid={pid}
      data-placeholder="true"
      style={{
        position: 'absolute',
        zIndex: zIndex || 10,
        display: 'none',
        pointerEvents: 'none',
      }}
    />
  )
}

export default memo(AdaptiveWindowPlaceholder)
