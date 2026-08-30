export const style = `
  .home { text-align: center; }
  .title { color: #2563eb; }
  .counter { margin-top: 12px; }
  .counter button { margin: 0 4px; padding: 4px 12px; cursor: pointer; }
`;

// 首页：位于 pages/home/ 文件夹，通过相对路径导入共享组件
import { Counter } from '../../components/Counter';
// 导入 .js 工具模块（命名导入 + 默认导入），验证 .js 文件的模块化处理
import { formatCount, greeting } from '../../utils/format';
import formatUtils from '../../utils/format';

export default ({ state, dispatch }) => (
  <div className="home">
    <h2 className="title">Welcome to Home Page</h2>
    <p>当前路由：home（pages/home/index.jsx）</p>
    <p>{greeting('Sukin')} 计数显示：{formatCount(state.count)}（默认导出：{formatUtils.formatCount(state.count)}）</p>
    <Counter state={state} dispatch={dispatch} />
  </div>
);