import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';
const bem = createNamespace('roolWrapper');
export const  RoolWrapper=()=>{
  return (
    <div className={style[bem.b()]}>

    </div>
  )
}
export default RoolWrapper
