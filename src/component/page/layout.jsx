import { useState, useEffect } from 'react';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';
import { NavigateBefore, NavigateNext } from '@mui/icons-material';
import Select from '../select/drowSelection/layout';

const bem = createNamespace('page');
const bemElevator = createNamespace('page-elevator');

const Elevator = ({ current, totalPages, onPageChange }) => {
  const [val, setVal] = useState(String(current));

  useEffect(() => {
    setVal(String(current));
  }, [current]);

  const handleChange = (e) => {
    setVal(e.target.value);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      triggerChange();
      e.target.blur();
    }
  };

  const triggerChange = () => {
    let p = parseInt(val, 10);
    if (Number.isNaN(p)) {
      setVal(String(current));
      return;
    }
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    if (p !== current) {
      onPageChange(p);
    } else {
      setVal(String(current));
    }
  };

  return (
    <div className={style[bemElevator.b()]}>
      <span className={style[bemElevator.e('text')]}>跳转至</span>
      <input
        className={style[bemElevator.e('input')]}
        value={val}
        onChange={handleChange}
        onKeyDown={handleKey}
        onBlur={triggerChange}
      />
      <span className={style[bemElevator.e('text')]}>页</span>
    </div>
  );
};

export const Page = ({
  total = 0,
  pageSize = 10,
  current = 1,
  sizeOptions = [10, 20, 50, 100],
  showElevator = true,
  showTotal = true,
  scrollTo = 'top',
  onPageChange = () => {},
  onPageSizeChange = () => {}
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleScroll = () => {
    if (scrollTo === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (scrollTo === 'bottom') {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const internalPageChange = (p) => {
    if (p < 1 || p > totalPages || p === current) return;
    onPageChange(p);
    handleScroll();
  };

  const generatePageNumbers = () => {
    const pages = [];
    const max = 5;
    if (totalPages <= max) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      let start = Math.max(2, current - 1);
      let end = Math.min(totalPages - 1, current + 1);
      if (current <= 3) end = 4;
      if (current >= totalPages - 2) start = totalPages - 3;
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={style[bem.b()]}>
      {showTotal && (
        <div className={style[bem.e('total')]}>
          共 <span className={style[bem.e('count')]}>{total}</span> 条
        </div>
      )}
      <div className={style[bem.e('list')]}>
        <button
          className={style[bem.e('nav-btn')]}
          disabled={current <= 1}
          onClick={() => internalPageChange(current - 1)}
        >
          <NavigateBefore fontSize="inherit" />
        </button>
        <div className={style[bem.e('numbers')]}>
          {generatePageNumbers().map((p, i) => (
            <div
              key={i}
              className={[
                style[bem.e('item')],
                style[bem.is('active', p === current)],
                style[bem.is('ellipsis', p === '...')]
              ].join(' ')}
              onClick={() => p !== '...' && internalPageChange(p)}
            >
              {p === '...' ? '•••' : p}
            </div>
          ))}
        </div>
        <button
          className={style[bem.e('nav-btn')]}
          disabled={current >= totalPages}
          onClick={() => internalPageChange(current + 1)}
        >
          <NavigateNext fontSize="inherit" />
        </button>
      </div>
      <div className={style[bem.e('size-selector')]}>
        <Select
          value={pageSize}
          options={sizeOptions.map(s => ({ label: `${s} 条/页`, value: s }))}
          onChange={(s) => {
            onPageSizeChange(s);
            handleScroll();
          }}
          direction="top"
        />
      </div>
      {showElevator && (
        <Elevator current={current} totalPages={totalPages} onPageChange={internalPageChange} />
      )}
    </div>
  );
};

export default Page;
