export const style = `
  .win-demo { position: relative; display: flex; flex-direction: column; height: 100%; min-height: 240px; }
  .win-bar { display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #0f172a; color: #e2e8f0; cursor: move; user-select: none; touch-action: none; }
  .win-bar .win-tip { flex: 1; font-size: 12px; color: #94a3b8; }
  .win-bar button { border: 0; background: #334155; color: #e2e8f0; border-radius: 4px; padding: 2px 8px; cursor: pointer; font-size: 12px; }
  .win-bar button:hover { background: #475569; }
  .win-body { flex: 1; padding: 12px; overflow: auto; font-size: 13px; line-height: 1.7; }
  .win-body dl { margin: 0 0 10px; display: grid; grid-template-columns: 96px 1fr; gap: 2px 8px; }
  .win-body dt { color: #64748b; }
  .win-body dd { margin: 0; }
  .win-resize { position: absolute; right: 0; bottom: 0; width: 16px; height: 16px; cursor: nwse-resize; touch-action: none; background: linear-gradient(135deg, transparent 50%, #64748b 50%); }
`;

// 窗口控制演示：需要在「设置 / 元数据 → 隐藏标题栏（hideHeader）」里勾上才有意义。
// 勾上后系统标题栏整体不渲染，窗口的拖动、缩放、最大化、关闭全部由本页面自己实现，
// 走的是 AppSDK.API.window —— 沙箱以形参注入，不用 import，且按约定在组件内部解构。
//
// getRect() 返回 { x, y, w, h }；预览等无窗口外壳的环境返回 null，所以先判空。
// setRect() 走的是宿主的直接 DOM 写入（含尺寸下限与视口安全区 clamp），
// 途中不触发 React 重渲染，因此可以放心放在 pointermove 里逐帧调用。
export default () => {
  const { window: winApi } = AppSDK.API;
  const [rect, setRectView] = useState(null);
  const dragRef = useRef(null);

  const readRect = () => setRectView(winApi.getRect());

  const startDrag = type => e => {
    // 标题栏里的按钮不参与拖拽：一旦 setPointerCapture，click 会被这条栏接管，按钮就点不动了
    if (e.target.closest('button')) return;
    const origin = winApi.getRect();
    // 预览等无窗口外壳的环境：getRect 返回 null，拖动直接不接管，页面照常可编辑
    if (!origin) return;
    dragRef.current = { type, origin, startX: e.clientX, startY: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onDragMove = e => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.type === 'move') {
      winApi.setRect({ ...drag.origin, x: drag.origin.x + dx, y: drag.origin.y + dy });
    } else {
      winApi.setRect({ ...drag.origin, w: drag.origin.w + dx, h: drag.origin.h + dy });
    }
  };

  const endDrag = e => {
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div className="win-demo">
      {/* 自绘标题栏：按住空白处拖动整窗，右下角斜角缩放 */}
      <div
        className="win-bar"
        onPointerDown={startDrag('move')}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
      >
        <span className="win-tip">windowDemo — 拖动我这条黑栏移动窗口</span>
        <button onClick={() => winApi.toggleMaximize()}>最大化/还原</button>
        <button onClick={() => winApi.hibernate()}>挂起</button>
        <button onClick={() => winApi.close()}>关闭</button>
      </div>

      <div className="win-body">
        <p>
          本页演示 <code>AppSDK.API.window</code> 五个方法，配合元数据里的「隐藏标题栏」使用。
          没勾隐藏时系统标题栏仍在，这里的按钮同样生效（等于双份操作入口）。
        </p>
        <dl>
          <dt>getRect()</dt><dd>读取窗口几何，返回 {'{ x, y, w, h }'}；无窗口外壳时返回 null</dd>
          <dt>setRect(rect)</dt><dd>写入几何，允许只传部分字段，越界与过小会被自动 clamp</dd>
          <dt>toggleMaximize()</dt><dd>最大化与还原，还原基准会跟随最近一次 setRect</dd>
          <dt>hibernate()</dt><dd>挂起窗口（保留进程与状态，收起而非销毁）</dd>
          <dt>close()</dt><dd>关闭当前进程，等价于点系统标题栏的关闭</dd>
        </dl>
        <button onClick={readRect}>读取当前几何</button>
        <p>{rect ? `x=${rect.x} y=${rect.y} w=${rect.w} h=${rect.h}` : '尚未读取（无窗口外壳时会是 null）'}</p>
      </div>

      <div
        className="win-resize"
        onPointerDown={startDrag('resize')}
        onPointerMove={onDragMove}
        onPointerUp={endDrag}
      />
    </div>
  );
};
