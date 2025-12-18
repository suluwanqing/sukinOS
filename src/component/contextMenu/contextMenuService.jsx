import { createRoot } from 'react-dom/client';
import MenuHost from './MenuHost';

const menuManager = {
  host: null,        // 将在 MenuHost 挂载并通过 onReady 注入
  root: null,
  container: null,

  // 确保单例 MenuHost 已经挂载
  ensureHostMounted() {
    if (this.root) return;
    this.container = document.createElement('div');
    document.body.appendChild(this.container);
    this.root = createRoot(this.container);
    // 将 MenuHost 挂载一次，MenuHost 会通过 onReady 把操作接口暴露回来
    this.root.render(<MenuHost onReady={(host) => { this.host = host; }} />);
  },

  // 显示菜单（payload 包含 menuItems, x, y, className, onItemClick, onShow, onHide.meta）
  showMenu(payload) {
    this.ensureHostMounted();
    // 先让当前 host 隐藏，保证只有一个菜单被渲染
    if (this.host && typeof this.host.hide === 'function') {
      this.host.hide(); // 关闭已有菜单
    }
    if (this.host && typeof this.host.show === 'function') {
      this.host.show(payload);
    }
  },

  hideMenu() {
    if (this.host && typeof this.host.hide === 'function') {
      this.host.hide();
    }
  }
};

export default menuManager;
