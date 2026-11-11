import { useEffect, useLayoutEffect, useRef } from 'react'
import { createNamespace } from '/utils/js/classcreate'
import VfsImage from '@/sukinos/middleware/VfsImage/main.jsx'
import { ENV_KEY_NAME, SUKIN_EXT, SUKIN_PRE } from '@/sukinos/utils/config'
import style from '../style.module.css'

const bem = createNamespace('deskbook')


const applyExitMotion = (cardEl) => {
  cardEl.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease';
  cardEl.style.willChange = 'transform, opacity';
  cardEl.style.transform = 'translateY(-125%) scale(0.82)';
  cardEl.style.opacity = '0';
};

// 标题与真实窗口同属卡片：上滑只改卡片一次 transform
function MobileTaskCard({ app, windowSlotsRef, onSelect, onClose, onReleaseSlot, exiting }) {
  const cardRef = useRef(null);
  const previewHostRef = useRef(null);
  const gestureRef = useRef(null);
  const suppressClickRef = useRef(false);

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 375;
  const screenH = typeof window !== 'undefined' ? window.innerHeight : 667;

  const cardWidth = Math.min(screenW * 0.72, 280);
  const cardHeight = screenH * (cardWidth / screenW);

  useLayoutEffect(() => {
    const host = previewHostRef.current;
    const slot = windowSlotsRef?.current?.get(app.pid);
    if (!host || !slot) return;
    // 槽保持整屏尺寸再整体缩放，窗口内部布局不用感知卡片尺寸
    slot.style.cssText = [
      'display:block',
      'position:absolute',
      'top:0',
      'left:0',
      `width:${screenW}px`,
      `height:${screenH}px`,
      'transform-origin:top left',
      `transform:scale(${cardWidth / screenW})`,
      'pointer-events:none',
      'overflow:hidden',
    ].join(';');
    // moveBefore 搬迁时保留 iframe 等子树的运行状态，避免预览切换触发应用重载
    if (slot.isConnected && typeof host.moveBefore === 'function') {
      try { host.moveBefore(slot, null) } catch { host.appendChild(slot) }
    } else {
      host.appendChild(slot);
    }
    return () => onReleaseSlot(app.pid);
  }, [app.pid, windowSlotsRef, screenW, screenH, cardWidth, onReleaseSlot]);

  const applyMotion = (dy) => {
    const cardEl = cardRef.current;
    if (!cardEl) return;
    cardEl.style.transform = `translateY(${dy}px)`;
    cardEl.style.opacity = String(Math.max(0.15, 1 - Math.abs(dy) / 220));
  };

  // 只清内联样式，让 CSS 自带的过渡把卡片带回原位
  const resetMotion = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;
    cardEl.style.transition = '';
    cardEl.style.willChange = '';
    cardEl.style.transform = '';
    cardEl.style.opacity = '';
  };


  useEffect(() => {
    if (!exiting || !cardRef.current) return;
    applyExitMotion(cardRef.current);
  }, [exiting]);

  const handlePerformClose = () => {
    if (exiting) return;
    if (cardRef.current) applyExitMotion(cardRef.current);
    onClose(app.pid);
  };

  const handleTouchStart = (e) => {
    if (exiting) return;
    const touch = e.touches[0];
    suppressClickRef.current = false;
    gestureRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      axis: null,
      dy: 0,
    };
  };

  // 横向交给原生滚动，纵向才进入上滑收起，避免横拖时被纵向抖动抽起
  const handleTouchMove = (e) => {
    const gesture = gestureRef.current;
    if (!gesture || exiting) return;
    const touch = e.touches[0];
    const dx = touch.clientX - gesture.startX;
    const dy = touch.clientY - gesture.startY;

    if (!gesture.axis) {
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      if (ax < 8 && ay < 8) return;
      // 横向优先：轻微偏斜仍视为横滑，交给原生滚动
      if (ax >= 8 && ax > ay * 1.2) {
        gesture.axis = 'x';
        suppressClickRef.current = true;
        return;
      }
      // 纵向必须又向上又明显垂直，斜向起手保持未定，避免误抬卡片
      if (dy <= -12 && ay > ax * 1.5) {
        gesture.axis = 'y';
        suppressClickRef.current = true;
        const cardEl = cardRef.current;
        if (cardEl) {
          cardEl.style.transition = 'none';
          cardEl.style.willChange = 'transform, opacity';
        }
      } else {
        return;
      }
    }

    if (gesture.axis !== 'y') return;
    if (dy >= 0) {
      // 回拖到起点以下：立即归位，避免卡片停在旧位移直到松手
      gesture.dy = 0;
      const cardEl = cardRef.current;
      if (cardEl) {
        cardEl.style.transition = 'none';
        cardEl.style.transform = 'translateY(0)';
        cardEl.style.opacity = '1';
      }
      return;
    }
    gesture.dy = dy;
    applyMotion(dy);
  };

  const handleTouchEnd = () => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (!gesture || gesture.axis !== 'y') return;
    if (gesture.dy < -(screenH * 0.18)) {
      handlePerformClose();
      return;
    }
    resetMotion();
  };

  const handleTouchCancel = () => {
    const gesture = gestureRef.current;
    gestureRef.current = null;
    if (gesture?.axis === 'y') resetMotion();
  };

  const appName = app?.[ENV_KEY_NAME]?.replace(SUKIN_EXT, '')?.replace(SUKIN_PRE, '') || '应用';

  return (
    <div
      ref={cardRef}
      className={[
        style[bem.e('mobile-card')],
        style[bem.is('mobile-card-exiting', exiting)]
      ].join(' ')}
      style={{ width: `${cardWidth}px` }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={(e) => {
        e.stopPropagation();
        if (suppressClickRef.current) {
          suppressClickRef.current = false;
          return;
        }
        if (exiting) return;
        onSelect(app.pid);
      }}
    >
      <div className={style[bem.e('mobile-card-header')]}>
        <div className={style[bem.e('mobile-card-meta')]}>
          <VfsImage app={app} className={style[bem.e('mobile-card-icon')]} />
          <span className={style[bem.e('mobile-card-title')]}>{appName}</span>
        </div>
        <button
          type="button"
          disabled={exiting}
          className={style[bem.e('mobile-card-close')]}
          onTouchStart={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            handlePerformClose();
          }}
        >
          ×
        </button>
      </div>

      <div
        ref={previewHostRef}
        className={style[bem.e('mobile-card-preview-host')]}
        style={{
          width: `${cardWidth}px`,
          height: `${cardHeight}px`,
        }}
      />
    </div>
  );
}

export default MobileTaskCard
