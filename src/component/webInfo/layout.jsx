import styles from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';

const bem = createNamespace('footer');

export default function WebInfo() {
  return (
    <footer className={styles[bem.b()]}>
      <div className={styles[bem.e('container')]}>
        <p>© 2026 Sukin · <a href="https://beian.miit.gov.cn" target="_blank">豫ICP备2025146712号-1</a>
        </p>
        {/* <div className={styles[bem.e('links')]}>
          <a href="#">隐私政策</a>
          <a href="#">使用条款</a>
          <a href="#">联系我们</a>
        </div> */}
      </div>
    </footer>
  );
}
