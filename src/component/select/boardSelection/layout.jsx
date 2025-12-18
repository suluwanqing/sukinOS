import React from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';

const bem = createNamespace('board-selection');

function BoardSelection({
  visible = false,
  title = "选择打开方式",
  options = [],
  onSelect,
  onClose
}) {
  if (!visible) return null;
  return (
    <div className={style[bem.b()]} onClick={onClose}>
      <div className={style[bem.e('container')]} onClick={(e) => e.stopPropagation()}>
        <div className={style[bem.e('header')]}>
          {title}
        </div>
        <div className={style[bem.e('list')]}>
          {options.length > 0 ? (
            options.map((item) => (
              <div
                key={item.id}
                className={style[bem.e('item')]}
                onClick={() => onSelect && onSelect(item)}
              >
                <div className={style[bem.e('icon')]}>
                  {item.icon || <div className={style[bem.e('icon-placeholder')]} />}
                </div>
                <div className={style[bem.e('label')]}>
                  {item.label}
                </div>
              </div>
            ))
          ) : (
            <div className={style[bem.e('empty')]}>无可用应用</div>
          )}
        </div>
        <div className={style[bem.e('footer')]} onClick={onClose}>
          取消
        </div>
      </div>
    </div>
  );
}

export default BoardSelection;
