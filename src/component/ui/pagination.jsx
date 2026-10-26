import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Select from './select';
import { cn } from '@/lib/utils';

const Elevator = ({ current, totalPages, onPageChange }) => {
  const [val, setVal] = useState(String(current));

  useEffect(() => {
    setVal(String(current));
  }, [current]);

  const handleChange = (e) => {
    // 过滤非数字字符，杜绝字母或非法符号输入
    const numericVal = e.target.value.replace(/\D/g, '');
    setVal(numericVal);
  };

  const triggerChange = () => {
    let p = parseInt(val, 10);
    if (Number.isNaN(p)) {
      setVal(String(current));
      return;
    }
    if (p < 1) p = 1;
    if (p > totalPages) p = totalPages;
    setVal(String(p));
    if (p !== current) {
      onPageChange(p);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      triggerChange();
      e.target.blur();
    }
  };

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap">
      <span>跳转至</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label="跳转至指定页"
        className="h-8 w-11 box-border rounded-md border border-input bg-transparent text-center text-xs font-semibold text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        value={val}
        onChange={handleChange}
        onKeyDown={handleKey}
        onBlur={triggerChange}
      />
      <span>页</span>
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
  className,
  onPageChange = () => {},
  onPageSizeChange = () => {}
}) => {
  const parsedPageSize = Number(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(total / parsedPageSize));

  const handleScroll = () => {
    if (!scrollTo || scrollTo === 'none') return;
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

  const handlePageSizeChange = (newSize) => {
    const nextSize = Number(newSize);
    onPageSizeChange(nextSize);
    const newTotalPages = Math.max(1, Math.ceil(total / nextSize));
    if (current > newTotalPages) {
      onPageChange(1);
    }
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

  const cellCls = 'flex h-8 min-w-8 box-border items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none select-none';
  const cellIdle = 'cursor-pointer border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground';
  const cellActive = 'cursor-pointer border-primary bg-primary text-primary-foreground shadow-xs font-semibold';
  const cellEllipsis = 'cursor-default border-none bg-transparent text-muted-foreground';
  const cellNav = 'cursor-pointer border-input bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-30';

  return (
    <div className={cn(
      'flex select-none flex-wrap items-center gap-2.5 text-xs',
      className
    )}>
      {showTotal && (
        <div className="whitespace-nowrap text-xs text-muted-foreground">
          共 <span className="font-semibold text-foreground">{total}</span> 条
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label="上一页"
          className={cn(cellCls, cellNav)}
          disabled={current <= 1}
          onClick={() => internalPageChange(current - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          {generatePageNumbers().map((p, i) => {
            const isActive = p === current;
            const isEllipsis = p === '...';
            return (
              <div
                key={`${p}_${i}`}
                className={cn(cellCls, isEllipsis ? cellEllipsis : isActive ? cellActive : cellIdle)}
                onClick={() => p !== '...' && internalPageChange(p)}
                role={isEllipsis ? undefined : 'button'}
                tabIndex={isEllipsis ? undefined : 0}
                aria-current={isActive ? 'page' : undefined}
                aria-label={isEllipsis ? undefined : `第 ${p} 页`}
                onKeyDown={(e) => {
                  if (isEllipsis) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    internalPageChange(p);
                  }
                }}
              >
                {isEllipsis ? '•••' : p}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="下一页"
          className={cn(cellCls, cellNav)}
          disabled={current >= totalPages}
          onClick={() => internalPageChange(current + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="min-w-[96px]">
        <Select
          size="small"
          value={parsedPageSize}
          options={sizeOptions.map(s => ({ label: `${s} 条/页`, value: Number(s) }))}
          onChange={handlePageSizeChange}
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
