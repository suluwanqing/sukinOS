import React from "react";
import { createPortal } from "react-dom";
import { createNamespace } from "/utils/js/classcreate";
import style from "./style.module.css";

const bem = createNamespace("modal");

function Modal({ title, visible, onClose, children, width = 820, layout = "standard", minHeight }) {
  if (!visible) return null;

  return createPortal(
    <div className={style[bem.e("overlay")]} onClick={onClose}>
      <div
        className={style[bem.b()]}
        style={{
          width,
          maxWidth: "calc(100vw - 32px)",
          minHeight: minHeight || (layout === "split" ? 420 : 320),
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={style[bem.e("head")]}>
          <div className={style[bem.e("title")]}>{title}</div>
          <button className={style[bem.e("close")]} onClick={onClose}>×</button>
        </div>
        <div className={`${style[bem.e("body")]} ${style[bem.e(`body--${layout}`)]}`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Modal;
