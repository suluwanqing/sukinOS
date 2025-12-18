import { createRoot } from 'react-dom/client';
import MenuHost from './MenuHost';

// 直接创建新的 manager 实例[不再检查使用热更新模块]
const manager = {
  host: null,
  root: null,
  container: null,
  metaInfo:null,
  ensureHostMounted() {
    // 检查 this.container 是否仍然存在于 DOM 中
    if (this.root && document.body.contains(this.container)) {
      return;
    }

    this.container = document.createElement('div');
    this.container.id = 'context-menu-host-container';
    document.body.appendChild(this.container);

    this.root = createRoot(this.container);

    this.root.render(
      <MenuHost
        onReady={(hostInstance) => {
          this.host = hostInstance;
        }}
      />
    );
  },

  showMenu(payload) {
    //这个payload是进入的所有信息包括metaInfo
    this.ensureHostMounted();
    setTimeout(() => {
      this.metaInfo=payload.metaInfo //无论怎样都刷新一下
      if (this.host && typeof this.host.show === 'function') {
        this.host.show(payload); //由于创建的时候需要定位,这里传输所有信息
      } else {
        // consolee.rror("nav传输失败");
      }
    }, 0);
  },

  hideMenu() {
    //由于是单例这里不再传输数据,和检测
    if (this.host && typeof this.host.hide === 'function') {
      this.host.hide(this.metaInfo);
    }
  }
};

export default manager;
