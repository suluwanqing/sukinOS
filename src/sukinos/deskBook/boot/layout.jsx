import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import { memo } from "react"

const bem = createNamespace('boot')

const features = [
  {
    title: "PWA_READY",
    description: "桌面级体验 / 渐进式架构"
  },
  {
    title: "LOCAL_SECURE",
    description: "Worker即服务 / 内网隔离环境"
  },
  {
    title: "FETCH_MODE",
    description: "允许从指定服务器拉取资源"
  },
  {
    title: "EXT_MODULES",
    description: "灵活配置 / 按需热插拔扩展"
  }
];

function Boot({ boot, loading }) {
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('container')]}>
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('logo-box')]}>OS</div>
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
          <span className={style[bem.e('version')]}>VER: 0.0.1</span>
          <span className={style[bem.e('separator')]}>//</span>
          <span className={style[bem.e('status')]}>BETA_BUILD</span>
        </div>

        <button
          onClick={boot}
          disabled={loading}
          className={style[bem.e('button')]}
        >
          {loading ? (
            <div className={style[bem.e('loading-wrap')]}>
              <span className={style[bem.e('button-spinner')]}></span>
              SYSTEM BOOTING...
            </div>
          ) : 'INITIALIZE SYSTEM'}
        </button>

        <div className={style[bem.e('footer')]}>
          <p className={style[bem.e('hint')]}>READY TO LAUNCH</p>
        </div>
      </div>
    </div>
  )
}

export default memo(Boot)
