export const style = `
  .about { text-align: center; color: #dc2626; }
  .about ul { text-align: left; display: inline-block; }
`;

// 关于页：位于 pages/about/ 文件夹
export default ({ state, dispatch }) => (
  <div className="about">
    <h2>About Page</h2>
    <p>当前路由：about（pages/about/index.jsx）</p>
    <ul>
      <li>多文件夹结构示例</li>
      <li>支持相对路径导入（./ ../）</li>
      <li>支持嵌套路由（pages/xxx）</li>
    </ul>
    <button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</button>
  </div>
);