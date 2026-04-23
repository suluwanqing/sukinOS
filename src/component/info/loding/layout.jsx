import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';
const bem = createNamespace('loading');
export const Loading=({ text = "System Loading" }) =>{
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('content')]}>
        <div className={style[bem.e('morpher')]}></div>
        <div className={style[bem.e('shadow')]}></div>
        <div className={style[bem.e('footer')]}>
          <span className={style[bem.em('text', 'active')]}>{text}</span>
          <div className={style[bem.e('baseplate')]}></div>
        </div>
      </div>
    </div>
  );
}

export default Loading;
