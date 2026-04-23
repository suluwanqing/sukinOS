import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';
const bem = createNamespace('code');
export const Code=()=>{
  return (
    <div className={style[bem.b()]}>

    </div>
  )
}
export default Code
