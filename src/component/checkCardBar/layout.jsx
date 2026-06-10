import React from 'react';
import Check from '../check/layout';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('check-card-bar');

export const CheckCardBar=(props)=>{
  const {
    options = [],    // 配置清单
    values = {},     // 外部状态对象 { key: value }
    onUpdate,        // 统一回调 (key, newValue) => {}
    className = '',
    style: customStyle = {}
  } = props;

  /**
   * 处理组内逻辑 (多选/单选)
   */
  const handleGroupLogic = (item, optValue) => {
    const currentVal = values[item.key] || [];
    const isExists = currentVal.includes(optValue);
    let nextVal = [];

    if (item.mode === 'single') {
      if (isExists && item.min === 1) return;
      nextVal = isExists ? [] : [optValue];
    } else {
      if (isExists) {
        if (item.min !== undefined && currentVal.length <= item.min) return;
        nextVal = currentVal.filter(v => v !== optValue);
      } else {
        if (item.max !== undefined && currentVal.length >= item.max) return;
        nextVal = [...currentVal, optValue];
      }
    }
    onUpdate?.(item.key, nextVal);
  };

  /**
   * 渲染基础行布局 (Switch 或 Group 中的子项)
   */
  const renderRow = ({
    label, desc, icon, checked, disabled, type, onClick, isSubItem = false
  }) => {
    const rowClass = [
      style[bem.e('row')],
      style[bem.is('checked', checked)],
      style[bem.is('disabled', disabled)],
      style[bem.is('sub', isSubItem)]
    ].join(' ');

    return (
      <div className={rowClass} onClick={onClick}>
        <div className={style[bem.e('info')]}>
          <div className={style[bem.e('title-box')]}>
            {icon && (
              <span className={style[bem.e('icon')]} style={{ color: checked ? `var(--su-${type}-500)` : '' }}>
                {icon}
              </span>
            )}
            <span className={style[bem.e('label')]}>{label}</span>
          </div>
          {desc && <p className={style[bem.e('desc')]}>{desc}</p>}
        </div>
        <div className={style[bem.e('action')]}>
          <Check checked={checked} type={type} disabled={disabled} round={true} size="medium" />
        </div>
      </div>
    );
  };

  return (
    <div className={[style[bem.b()], className].join(' ')} style={customStyle}>
      {options.map((item, index) => {
        const isLast = index === options.length - 1;

        // --- 模式 A：独立开关 (switch) ---
        if (!item.type || item.type === 'switch') {
          return (
            <React.Fragment key={item.key}>
              {renderRow({
                label: item.label,
                desc: item.desc,
                icon: item.icon,
                checked: !!values[item.key],
                disabled: item.disabled,
                type: item.theme || 'primary',
                onClick: () => onUpdate?.(item.key, !values[item.key])
              })}
              {!isLast && <div className={style[bem.e('divider')]} />}
            </React.Fragment>
          );
        }

        // --- 模式 B：选项组 (group) ---
        if (item.type === 'group') {
          return (
            <React.Fragment key={item.key}>
              <div className={style[bem.e('group-header')]}>
                {item.icon && <span className={style[bem.e('group-icon')]}>{item.icon}</span>}
                <span className={style[bem.e('group-title')]}>{item.label}</span>
              </div>
              <div className={style[bem.e('group-content')]}>
                {item.subOptions?.map((opt, subIdx) => {
                  const optItem = typeof opt === 'string' ? { value: opt, label: opt } : opt;
                  return (
                    <React.Fragment key={optItem.value}>
                      {renderRow({
                        label: optItem.label,
                        desc: optItem.desc,
                        icon: optItem.icon,
                        checked: (values[item.key] || []).includes(optItem.value),
                        disabled: item.disabled || optItem.disabled,
                        type: item.theme || 'primary',
                        isSubItem: true,
                        onClick: () => handleGroupLogic(item, optItem.value)
                      })}
                      {subIdx < item.subOptions.length - 1 && <div className={style[bem.e('sub-divider')]} />}
                    </React.Fragment>
                  );
                })}
              </div>
              {!isLast && <div className={style[bem.e('divider')]} />}
            </React.Fragment>
          );
        }

        return null;
      })}
    </div>
  );
}

export default CheckCardBar;
