// 深层共享组件：位于 components/ui/ 文件夹，被 Counter 通过相对路径导入
// 验证嵌套模块化（require 链：home -> Counter -> Button）
// 使用 CSS Modules：import styles from './Button.module.css'，类名按所在文件加后缀，只能从 styles 映射取值
import styles from './Button.module.css';

export const Button = ({ onClick, children, primary }) => (
  <button
    className={primary ? styles.btnPrimary : styles.btn}
    onClick={onClick}
  >
    {children}
  </button>
);