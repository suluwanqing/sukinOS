import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import React from "react";
const bem = createNamespace('boot');

const features = [
  {
    title: "PWA",
    description: "桌面般的体验"
  },
  {
    title: "本地安全",
    description: "worker即服务，适合内网使用"
  },
  {
    title: "可获取",
    description: "允许用户从指定服务器拉取服务"
  },
  {
    title: "模块扩展",
    description: "灵活配置，按需扩展"
  }
];

function Boot({ boot, loading }) {
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <h1 className={style[bem.e('title')]}>SukinOS</h1>
        <p className={style[bem.e('subtitle')]}>简约 · 高效 · 可拓展</p>
      </div>

      <div className={style[bem.e('features')]}>
        {features.map((feature, index) => (
          <div key={index} className={style[bem.e('feature')]}>
            <h3 className={style[bem.e('feature-title')]}>{feature.title}</h3>
            <p className={style[bem.e('feature-desc')]}>{feature.description}</p>
          </div>
        ))}
      </div>

      <div className={style[bem.e('info')]}>
        <span className={style[bem.e('version')]}>版本 ooo</span>
        <span className={style[bem.e('separator')]}>·</span>
        <span className={style[bem.e('status')]}>测试版</span>
      </div>

      <button
        onClick={boot}
        disabled={loading}
        className={style[bem.e('button')]}
      >
        {loading ? (
          <>
            <span className={style[bem.e('button-spinner')]}></span>
            正在启动...
          </>
        ) : '立即启动'}
      </button>

      <div className={style[bem.e('footer')]}>
        <p className={style[bem.e('hint')]}>轻点启动，即刻开始</p>
      </div>
    </div>
  )
}

export default React.memo(Boot)
