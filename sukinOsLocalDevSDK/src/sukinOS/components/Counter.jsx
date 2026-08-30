export const style = `
  .counter { margin-top: 12px; }
  .counter button { margin: 0 4px; padding: 4px 12px; cursor: pointer; }
`;

// 共享计数器组件：由 home-page 通过相对路径引用
// 命名导出，配合 `import { Counter }` 语法
// 嵌套导入 Button，验证 require 链：home -> Counter -> Button
// Button 使用 CSS Modules（styles.btn / styles.btnPrimary）
import { Button } from './ui/Button';

export const Counter = ({ state, dispatch }) => (
  <div className="counter">
    <p>Count: {state.count}</p>
    <Button primary onClick={() => dispatch({ type: 'INCREMENT' })}>+1</Button>
    <Button onClick={() => dispatch({ type: 'DECREMENT' })}>-1</Button>
  </div>
);