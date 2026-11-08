import React from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import { Search as SearchIcon } from 'lucide-react';
import { Input } from '@/component/input/layout';

const bem = createNamespace('setting-sidebar');

function Sidebar({ items, activeId, onSelect }) {
  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <h2 className={style[bem.e('title')]}>设置</h2>
        <Input
          size="small"
          placeholder="查找设置"
          prefixIcon={<SearchIcon size={16} />}
        />
      </div>

      <div className={style[bem.e('list')]}>
        {items.map((item) => (
          <div
            key={item.id}
            className={[
              style[bem.e('item')],
              style[bem.is('active', activeId === item.id)]
            ].join(' ')}
            onClick={() => onSelect(item.id)}
          >
            <span className={style[bem.e('icon-box')]}>{item.icon}</span>
            <span className={style[bem.e('label')]}>{item.label}</span>
          </div>
        ))}
      </div>

      <div className={style[bem.e('footer')]}>
        <div className={style[bem.e('divider')]} />
        <div className={style[bem.e('system-status')]}>
          {/* <div className={style[bem.e('status-dot')]} /> */}
          {/* <span>系统内核已就绪</span> */}
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
