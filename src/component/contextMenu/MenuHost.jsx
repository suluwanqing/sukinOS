import  { useState, useEffect, useCallback } from 'react';
import { createNamespace } from '@/utils/js/classcreate';
import { confirm } from '../confirm/layout';
import style from './style.module.css';

const bem = createNamespace('context-menu');

const MenuHost = ({ onReady }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [menuData, setMenuData] = useState({
    menuItems: [],
    position: { x: 0, y: 0 },
    className: '',
    onShow: () => {},
    onHide: () => {},
  });

  // 定义 show 和 hide 方法
  const show = useCallback((payload) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200; // 估算值，可以根据实际情况调整
    const menuHeight = 300; // 估算值

    const adjustedX = payload.x + menuWidth > viewportWidth ? viewportWidth - menuWidth : payload.x;
    const adjustedY = payload.y + menuHeight > viewportHeight ? viewportHeight - menuHeight : payload.y;

    setMenuData({
      ...payload,
      position: { x: adjustedX, y: adjustedY },
    });
    setIsVisible(true);
    payload.onShow?.(payload.metaInfo);
  }, []);

  const hide = useCallback((metaInfo) => {
    if (isVisible) {
      setIsVisible(false);
      menuData.onHide?.(metaInfo);
    }
  }, [isVisible, menuData]);

  // 组件挂载后，将操作 API 通过 onReady 回调传递给 manager
  useEffect(() => {
    onReady({ show, hide });
  }, [onReady, show, hide]);

  const handleMenuItemClick = useCallback(async (e, item) => {
    e.stopPropagation();
    hide();
    if (item.disabled) return;
    if (item.func && item.func.isNext) {
      try {
       confirm.show({
          title: item.func.confirm?.title || '确认操作',
          content: item.func.confirm?.content || '您确定要执行此操作吗？',
          onConfirm: () => item.func.confirm?.onConfirm?.(menuData.metaInfo), //这里无需传输,因为这里的e是弹窗组件,点击后就死亡了
          onCancel: () => item.func.confirm?.onCancel?.(menuData.metaInfo),
        });
      } catch (error) {
        console.log('操作已取消');
      }
    } else if (item.onClick) {
      item.onClick(menuData.metaInfo);
    }
  }, [hide]);

  // 全局事件监听，用于处理点击外部或按 Esc 键关闭菜单
  useEffect(() => {
    const handleClickOutside = (e) => {
      // 检查点击事件是否发生在菜单内部
      const menuElement = document.querySelector(`.${style[bem.b()]}`);
      if (menuElement && !menuElement.contains(e.target)) {
        hide();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        hide();
      }
    };

    const handleScroll = () => {
        hide();
    };

    if (isVisible) {
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('scroll', handleScroll, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, hide]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`${style[bem.b()]} ${menuData.className}`}
      style={{
        position: 'fixed',
        left: menuData.position.x,
        top: menuData.position.y,
        zIndex: 9999,
      }}
    >
      <div className={style[bem.e('content')]}>
        {menuData.menuItems.map((item, index) =>
          item.type === 'divider' ? (
            <div key={`divider-${index}`} className={style[bem.e('divider')]} />
          ) : (
            <div
              key={item.id || index}
              className={`${style[bem.e('item')]} ${item.disabled ? style[bem.m('disabled')] : ''} ${item.danger ? style[bem.m('danger')] : ''}`}
              onClick={(e) => handleMenuItemClick(e,item)}
            >
              {item.icon && <span className={[style[bem.e('icon')], `iconfont ${item.icon}`].join(' ')} />}
              <span className={style[bem.e('label')]}>{item.label}</span>
              {item.func?.isNext && <span className={style[bem.e('next-indicator')]}>›</span>}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default MenuHost;
