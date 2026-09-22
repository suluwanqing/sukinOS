// 主逻辑入口（默认文件名 logic.jsx）：安装期与页面模块走同一套预编译，
// 因此可以正常写 import —— 编译后就是内核注入的 require。
// 唯一限制：本块自身严禁 export。initialState / reducer / init 由内核按名字识别，
// 需要导出的代码请写成普通模块文件（例如 store/counter.js），在这里 import 它。
//
// 如果希望某个被 import 的模块只属于逻辑层、不在 UI 侧再执行一遍副作用，
// 到「设置 → 入口约定 → 逻辑入口」给它加一条规则（例如 store/**）；
// 不加也能取到值，代价是同一份模块在 UI 与 worker 各求值一次。
// 注意列表顺序：命中的第一个文件是主逻辑入口（保持 logic.jsx 在最前），其余才是辅逻辑。
import { step, nextCount } from './store/counter';

const initialState = {
  count: 0,
  message: 'Hello World'
};

function reducer(state, action) {
  switch(action.type) {
    case 'INCREMENT':
      return { ...state, count: nextCount(state.count) };
    case 'DECREMENT':
      return { ...state, count: nextCount(state.count, -step) };
    default:
      return state;
  }
}

// init 可选：收到 INIT 后执行一次，首屏取数 / 订阅 / 定时任务写这里。
// 注意 state 会被内核持久化，别在这里重置它。
function init(dispatch, state) {
  console.log('[logic] init', state.message);
}
