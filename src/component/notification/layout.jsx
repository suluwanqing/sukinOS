import React from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';

const bem = createNamespace('notification');

export const Notification = ({
  position = 'top-right', // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center'
  title,
  icon,
  content,
  children,
  footer,
  showClose = true,
  onClose,
  onClick,
  className,
  style: customStyle,
  ...restProps
}) => {
  // 组合 BEM 类名与位置修饰符
  const rootClass = [
    style[bem.b()],
    style[bem.m(position)],
    className
  ].filter(Boolean).join(' ');

  // 默认的关闭图标 SVG
  const CloseIcon = (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );

  return (
    <div
      className={rootClass}
      style={customStyle}
      onClick={onClick}
      {...restProps}
    >
      {/* 标题栏层 */}
      {(title || icon || showClose) && (
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('header-left')]}>
            {icon && <span className={style[bem.e('icon')]}>{icon}</span>}
            {title && <span className={style[bem.e('title')]}>{title}</span>}
          </div>
          {showClose && (
            <span
              className={style[bem.e('close')]}
              onClick={(e) => {
                e.stopPropagation(); // 阻止冒泡触发 onClick
                onClose?.(e);
              }}
            >
              {CloseIcon}
            </span>
          )}
        </div>
      )}

      {/* 内容体层 (支持自定义 children 或纯文本 content) */}
      <div className={style[bem.e('body')]}>
        {children || content}
      </div>

      {/* 底边操作层 */}
      {footer && (
        <div className={style[bem.e('footer')]}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Notification;
