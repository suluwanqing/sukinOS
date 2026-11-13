import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { Maximize2, Minimize2, X } from "lucide-react";
import { useViewportMode } from "@/sukinos/hooks/useViewportMode";
import style from "./PreviewWindow.module.css";

const MIN_W = 420;
const MIN_H = 320;
const EDGE = 16;
const KEEP_VISIBLE = 120;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const centeredRect = () => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const w = clamp(Math.round(vw * 0.94), Math.min(MIN_W, Math.max(240, vw - EDGE * 2)), 1400);
  const h = clamp(Math.round(vh * 0.9), Math.min(MIN_H, Math.max(240, vh - EDGE * 2)), 960);
  return { x: Math.round((vw - w) / 2), y: Math.round((vh - h) / 2), w, h };
};

/**
 * 独立预览窗口：嵌套 Dialog 提供焦点圈定与 Esc 关闭，面板自绘拖动/缩放。
 * 移动端直接铺满视口，不支持拖动缩放，避免和页面滚动抢手势。
 */
export default function PreviewWindow({ open, title, onClose, children }) {
  const { isMobile } = useViewportMode();
  const [rect, setRect] = useState(null);
  const [maximized, setMaximized] = useState(false);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  // rect 为空表示还没初始化：渲染阶段直接按居中算，关闭后再清空，下次打开不会闪跳
  const activeRect = useMemo(() => rect || centeredRect(), [rect]);

  useEffect(() => {
    if (open) return;
    setRect(null);
    setMaximized(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onViewportResize = () => {
      setRect((prev) => {
        const base = prev || centeredRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const w = Math.min(base.w, Math.max(240, vw - EDGE * 2));
        const h = Math.min(base.h, Math.max(240, vh - EDGE * 2));
        return {
          w,
          h,
          x: clamp(base.x, EDGE - w + KEEP_VISIBLE, vw - KEEP_VISIBLE),
          y: clamp(base.y, 0, vh - 48),
        };
      });
    };
    window.addEventListener("resize", onViewportResize);
    return () => window.removeEventListener("resize", onViewportResize);
  }, [open]);

  const panelStyle = useMemo(() => {
    if (isMobile) {
      return { left: 0, top: 0, width: "100%", height: "100%", borderRadius: 0 };
    }
    if (maximized) {
      return { left: 8, top: 8, width: "calc(100vw - 16px)", height: "calc(100dvh - 16px)" };
    }
    return { left: activeRect.x, top: activeRect.y, width: activeRect.w, height: activeRect.h };
  }, [isMobile, maximized, activeRect]);

  const endDrag = () => {
    dragRef.current = null;
  };

  const startDrag = (event) => {
    if (isMobile || maximized || event.button !== 0) return;
    if (event.target.closest("[data-no-drag]")) return;
    dragRef.current = {
      id: event.pointerId,
      sx: event.clientX,
      sy: event.clientY,
      rect: activeRect,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const dragMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const base = drag.rect;
    setRect({
      ...base,
      x: clamp(base.x + event.clientX - drag.sx, EDGE - base.w + KEEP_VISIBLE, window.innerWidth - KEEP_VISIBLE),
      y: clamp(base.y + event.clientY - drag.sy, 0, window.innerHeight - 48),
    });
  };

  const endResize = () => {
    resizeRef.current = null;
  };

  const startResize = (event) => {
    if (isMobile || maximized || event.button !== 0) return;
    event.stopPropagation();
    resizeRef.current = {
      id: event.pointerId,
      sx: event.clientX,
      sy: event.clientY,
      rect: activeRect,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const resizeMove = (event) => {
    const resize = resizeRef.current;
    if (!resize || resize.id !== event.pointerId) return;
    const base = resize.rect;
    const maxW = Math.max(240, window.innerWidth - base.x - EDGE);
    const maxH = Math.max(240, window.innerHeight - base.y - EDGE);
    setRect({
      ...base,
      w: clamp(base.w + event.clientX - resize.sx, Math.min(MIN_W, maxW), maxW),
      h: clamp(base.h + event.clientY - resize.sy, Math.min(MIN_H, maxH), maxH),
    });
  };

  const toggleMaximize = () => {
    setMaximized((prev) => !prev);
  };

  const handleDoubleClick = (event) => {
    if (isMobile) return;
    if (event.target.closest("[data-no-drag]")) return;
    toggleMaximize();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onClose?.(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={style.overlay} />
        <DialogPrimitive.Content
          className={style.panel}
          style={panelStyle}
          aria-describedby={undefined}
        >
          <div
            className={style.header}
            onPointerDown={startDrag}
            onPointerMove={dragMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onDoubleClick={handleDoubleClick}
          >
            <DialogPrimitive.Title className={style.title}>{title}</DialogPrimitive.Title>
            {!isMobile && (
              <button
                type="button"
                data-no-drag
                className={style.iconBtn}
                onClick={toggleMaximize}
                title={maximized ? "还原窗口" : "最大化"}
                aria-label={maximized ? "还原窗口" : "最大化"}
              >
                {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            )}
            <DialogPrimitive.Close
              data-no-drag
              className={style.iconBtn}
              title="关闭预览"
              aria-label="关闭预览"
            >
              <X size={16} />
            </DialogPrimitive.Close>
          </div>
          <div className={style.body}>{children}</div>
          {!isMobile && !maximized && (
            <span
              role="presentation"
              className={style.resizeHandle}
              onPointerDown={startResize}
              onPointerMove={resizeMove}
              onPointerUp={endResize}
              onPointerCancel={endResize}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
