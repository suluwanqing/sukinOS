// 深层共享组件：位于 components/ui/ 文件夹，被 Counter 通过相对路径导入
// 验证嵌套模块化（require 链：home -> Counter -> Button）
// 使用 CSS Modules：import styles from './Button.module.css'，styles.btn 返回 'btn'
import styles from './Button.module.css';

export const Button = ({ onClick, children, primary }) => (
  <button
    className={primary ? styles.btnPrimary : styles.btn}
    onClick={onClick}
  >
    {children}
  </button>
);