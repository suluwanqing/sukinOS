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
  const touchStartRef = useRef(0);
  const currentYRef = useRef(0);

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

  const beginMotion = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;
    cardEl.style.transition = 'none';
    cardEl.style.willChange = 'transform, opacity';
  };

  const settleMotion = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;
    cardEl.style.transition = '';
    cardEl.style.willChange = '';
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
    touchStartRef.current = e.touches[0].clientY;
    currentYRef.current = 0;
    beginMotion();
  };

  const handleTouchMove = (e) => {
    const dy = e.touches[0].clientY - touchStartRef.current;
    if (dy < 0) {
      currentYRef.current = dy;
      applyMotion(dy);
    }
  };

  const handleTouchEnd = () => {
    if (currentYRef.current < -(screenH * 0.18)) {
      handlePerformClose();
      return;
    }
    settleMotion();
    if (currentYRef.current !== 0) applyMotion(0);
  };

  const handleTouchCancel = () => {
    settleMotion();
    if (currentYRef.current !== 0) applyMotion(0);
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
