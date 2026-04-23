import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import React from "react"
import VfsImage from '@/sukinos/middleware/VfsImage.jsx'

const bem = createNamespace('shortcut')

function Shortcut({ app }) {
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('icon-wrapper')]}>
        <VfsImage
          app={app}
          className={style[bem.e('icon')]}
        />
      </div>
      <span className={style[bem.e('label')]}>{app.label}</span>
    </div>
  );
}

export default React.memo(Shortcut);
