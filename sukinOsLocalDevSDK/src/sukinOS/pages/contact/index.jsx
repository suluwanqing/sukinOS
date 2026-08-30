export const style = `
  .contact { text-align: center; color: #059669; }
`;

// 联系页：位于 pages/contact/ 文件夹，演示更深层嵌套路由
export default ({ state, dispatch }) => (
  <div className="contact">
    <h2>Contact Page</h2>
    <p>当前路由：pages/contact（pages/contact/index.jsx）</p>
    <p>Count: {state.count}</p>
    <button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</button>
  </div>
);