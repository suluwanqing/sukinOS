import React, { useState, useEffect, useRef } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import CheckIcon from '@mui/icons-material/Check';

const bem = createNamespace('br-select');

function CustomSelect({ options = [], value, onCommit, onClose, placeholder = "搜索选项...", showSearch = true }) {
  const [search, setSearch] = useState('');
  const popoverRef = useRef(null);

  const filtered = options.filter(o => {
    const label = typeof o === 'string' ? o : o.label;
    return String(label).toLowerCase().includes(search.toLowerCase());
  });

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onClose]);

  return (
    <div className={style[bem.b()]} ref={popoverRef} onMouseDown={e => e.stopPropagation()}>
      {showSearch && (
        <input
          className={style[bem.e('search')]}
          autoFocus
          placeholder={placeholder}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      )}
      <div className={style[bem.e('list')]}>
        {filtered.map((opt, idx) => {
          const label = typeof opt === 'string' ? opt : opt.label;
          const val = typeof opt === 'string' ? opt : opt.value;
          const color = typeof opt === 'object' ? opt.color : null;
          const isSelected = String(value) === String(val);

          return (
            <div key={idx} className={style[bem.e('item')]} onClick={() => { onCommit(val); onClose(); }}>
              {color && <div className={style[bem.e('dot')]} style={{ backgroundColor: color }} />}
              <span>{label}</span>
              {isSelected && <CheckIcon sx={{ fontSize: 14, marginLeft: 'auto', color: '#3b82f6' }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CustomSelect;
