import React from 'react';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('check');

export const Check=({
  checked = false,
  onChange,
  disabled = false,
  type = 'default',
  size = 'medium',
  plain = false,
  round = false,
  dot = false,
  className = '',
  style: inlineStyle = {}
})=>{
  const handleClick = (e) => {
    e.stopPropagation();
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  const classNames = [
    style[bem.b()],
    style[bem.is('active', checked)],
    style[bem.is('disabled', disabled)],
    style[bem.is('plain', plain)],
    style[bem.is('round', round)],
    style[bem.is('dot', dot)],
    style[bem.m(type)],
    style[bem.m(size)],
    className
  ].filter(Boolean).join(' ');

  return (
    <div
      className={classNames}
      onClick={handleClick}
      style={inlineStyle}
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
    >
      <div className={style[bem.e('toggle-switch')]}>
        <div className={style[bem.e('toggle-knob')]} />
      </div>
    </div>
  );
}

export default React.memo(Check);
