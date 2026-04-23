export const style = `
  .about { text-align: center; color: #dc3545; }
`;

export default ({ state, dispatch }) => (
  <div className="about">
    <div>第一次测试检查</div>
    <div>第二次测试检查</div>
    <button onClick={() => dispatch({ type: 'INCREMENT' })}>+1</button>
  </div>
);
