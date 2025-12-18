import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import React from "react";
const bem = createNamespace('shortcut');
function Shortcut({ app }) {
  const iconUrl = "/logo.jpg";
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('icon-wrapper')]}>
        <img src={iconUrl} alt="" className={style[bem.e('icon')]} />
      </div>
      <span className={style[bem.e('label')]}>{app.label}</span>
    </div>
  );
}
export default React.memo(Shortcut);
