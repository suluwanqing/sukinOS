import { useCallback, useEffect, useRef } from 'react';
import menuManager from './manager';

export const ContextMenu = ({
  children,
  metaInfo,
  menuItems = [],
  onShow = (metaInfo) => {},
  onHide = (metaInfo) => {},
  className = ''
}) => {
  // 使用 useRef 生成一个简单的标识，用于确认当前菜单是否是由本组件触发的
  const isMenuOpenRef = useRef(false);

  const handleContextMenu = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();

    // 标记当前组件打开了菜单
    isMenuOpenRef.current = true;

    // 当右键点击时，调用全局管理器的 showMenu 命令
    menuManager.showMenu({
      x: e.pageX,
      y: e.pageY,
      menuItems,
      onShow: (info) => {
        // 劫持 onShow，确保状态同步
        isMenuOpenRef.current = true;
        if (onShow) onShow(info);
      },
      onHide: (info) => {
        // 劫持 onHide，菜单关闭时重置状态
        isMenuOpenRef.current = false;
        if (onHide) onHide(info);
      },
      className,
      metaInfo
    });
  }, [menuItems, onShow, onHide, className, metaInfo]);
  useEffect(() => {
    // 组件挂载时不做事
    // 组件卸载时（页面切换、路由跳转、父组件不再渲染此元素等）
    return () => {
      // 只有当菜单是由当前这个组件打开的时候，才在卸载时去关闭它
      // 这样可以避免误关闭其他组件打开的菜单
      if (isMenuOpenRef.current) {
        menuManager.hideMenu();
        isMenuOpenRef.current = false;
      }
      // 简化:menuManager.hideMenu();
    };
  }, []);

  // 使用一个 div 包裹子元素来捕获右键事件。
  // style={{ display: 'contents' }} 确保这个 div 不会影响现有的 CSS 布局。
  return (
    <div onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
      {children}
    </div>
  );
};

export default ContextMenu;
