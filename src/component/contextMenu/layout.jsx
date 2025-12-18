import { useCallback } from 'react';
import menuManager from './manager';

const ContextMenu = ({
  children,
  metaInfo,
  menuItems = [],
  onShow = (metaInfo) => {},
  onHide = (metaInfo) => {},
  className = ''
}) => {
  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    // 当右键点击时，调用全局管理器的 showMenu 命令
    menuManager.showMenu({
      x: e.pageX,
      y: e.pageY,
      menuItems,
      onShow,
      onHide,
      className,
      metaInfo
    });
  }, [menuItems, onShow, onHide, className]);

  // 使用一个 div 包裹子元素来捕获右键事件。
  // style={{ display: 'contents' }} 确保这个 div 不会影响现有的 CSS 布局。
  return (
    <div onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
      {children}
    </div>
  );
};

export default ContextMenu;
