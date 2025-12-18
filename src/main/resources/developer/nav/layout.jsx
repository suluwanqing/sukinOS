import { memo } from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';

const bem = createNamespace('nav');

function Nav({ navItems = [],currentView }) {
  return (
    <div className={style[bem.b()]}>
      {navItems.map((item) => (
        <div
          className={[style[bem.e('item')],style[bem.is('active',item.label===currentView)]].join(' ')}
          key={item.id}
          onClick={item.onClick}
          title={item.title}
        >
          <span className={style[bem.e('icon')]}>
            {item.icon}
          </span>
          <span className={style[bem.e('text')]}>
            {item.title}
          </span>
        </div>
      ))}
    </div>
  );
}

export default memo(Nav);
