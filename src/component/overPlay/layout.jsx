import { createNamespace } from '@/utils/js/classcreate';
import style from './style.module.css';
import React from 'react';

const bem = createNamespace('overplay');
function OverPlay({ children,
  style: customeStyle = {},
  styleC = {},
  closeFunc = () => { },
  isFixed = false,
  isBlur = false,
}) {

  return(
    <div
      className={
      [style[bem.b('container')],
        style[bem.is('fixed', isFixed)],style[bem.is('blur',isBlur)]].join(' ')}
      style={customeStyle ? customeStyle : undefined}
      onClick={(e) => { if (e.target == e.currentTarget) { closeFunc() } }}>
      <div className={style[bem.b()]} style={styleC ? styleC : undefined}>
        {React.cloneElement(children , { closeFunc })}
      </div>
    </div>
  )
}
export default OverPlay
