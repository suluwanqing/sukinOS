import { memo } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';

const bem = createNamespace('nav');

function Nav({ navItems = [], currentSidebar, currentMain }) {
  const isActive = (id) => id === currentSidebar || id === currentMain;
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('top-items')]}>
        {navItems.map((item) => (
          <div className={[style[bem.e('item')], style[bem.is('active', isActive(item.id))]].join(' ')} key={item.id} onClick={item.onClick} title={item.title}>
            <span className={style[bem.e('icon')]}>{item.icon}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
export default memo(Nav);
