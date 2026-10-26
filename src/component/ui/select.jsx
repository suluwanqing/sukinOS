import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cva } from 'class-variance-authority';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 20;


const triggerVariants = cva(
  'flex w-full min-w-[100px] cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow,border-color] outline-none data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:hover:bg-input/50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4',
  {
    variants: {
      size: {
        small: 'h-8 text-xs sm:text-[13px]',
        default: 'h-9 text-sm',
        large: 'h-10 text-base',
      },
    },
    defaultVariants: { size: 'default' },
  }
);


const dropdownPanelVariants = cva(
  'absolute left-0 z-50 flex w-full min-w-[120px] flex-col overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-150',
  {
    variants: {
      direction: {
        bottom: 'top-full mt-1',
        top: 'bottom-full mb-1',
      },
    },
    defaultVariants: { direction: 'bottom' },
  }
);

const itemVariants = cva(
  'flex w-full cursor-pointer items-center justify-between rounded-sm py-1.5 pr-2.5 pl-2 text-xs sm:text-sm outline-hidden select-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
);


const noScrollbarCls = '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]';

const cellPad = { small: 'px-2.5', default: 'px-3', large: 'px-3.5' };
const sizeKeyOf = (size) => (size === 'small' || size === 'large' ? size : 'default');

const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

export const Select = ({
  value,
  options = [],
  onChange = () => { },
  size = 'default',
  direction = 'bottom',
  placeholder = '请选择',
  boxStyle = {},
  dropdownStyle = {},
  optionStyle = {},
  searchable = false,
  optionsAsync = null,
  showTitle = false,
  maxHeight,
  hideScrollbar = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [asyncItems, setAsyncItems] = useState([]);
  const [asyncTotal, setAsyncTotal] = useState(0);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [asyncPage, setAsyncPage] = useState(1);
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const debounceTimer = useRef(null);

  const sizeKey = sizeKeyOf(size);
  const pad = cellPad[sizeKey];

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setSearchText('');
    setAsyncItems([]);
    setAsyncTotal(0);
    setAsyncPage(1);
  });

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const doAsyncSearch = useCallback((query, page = 1) => {
    if (!optionsAsync) return;
    setAsyncLoading(true);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      try {
        const result = await optionsAsync({ page, pageSize: PAGE_SIZE, searchQuery: query });
        if (page === 1) {
          setAsyncItems(result.items || []);
        } else {
          setAsyncItems(prev => [...prev, ...(result.items || [])]);
        }
        setAsyncTotal(result.total || 0);
      } catch {
        setAsyncItems([]);
        setAsyncTotal(0);
      } finally {
        setAsyncLoading(false);
      }
    }, 300);
  }, [optionsAsync]);

  useEffect(() => {
    if (isOpen && searchable && optionsAsync) {
      doAsyncSearch(searchText, 1);
      setAsyncPage(1);
    }
  }, [isOpen, searchable, optionsAsync, doAsyncSearch, searchText]);

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchText(val);
    setAsyncPage(1);
    doAsyncSearch(val, 1);
  };

  const handleLoadMore = (e) => {
    e.stopPropagation();
    const nextPage = asyncPage + 1;
    setAsyncPage(nextPage);
    doAsyncSearch(searchText, nextPage);
  };


  const handleSelect = (optionValue) => {
    if (optionValue !== value) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setHoveredTooltip(null);
    setSearchText('');
    setAsyncItems([]);
    setAsyncTotal(0);
    setAsyncPage(1);
  };

  const handleMouseEnter = (event, text) => {
    if (!text) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      text,
      top: rect.top - 6,
      left: rect.left + rect.width / 2
    });
  };

  const handleMouseLeave = () => {
    setHoveredTooltip(null);
  };

  useEffect(() => {
    setHoveredTooltip(null);
  }, [isOpen]);

  const displayOptions = searchable && optionsAsync ? asyncItems : options;

  const filteredOptions = searchable && !optionsAsync
    ? options.filter(opt => String(opt.label ?? '').toLowerCase().includes(searchText.toLowerCase()))
    : options;

  const currentOption = options.find(opt => opt.value === value)
    || asyncItems.find(opt => opt.value === value);
  const currentLabel = currentOption ? currentOption.label : (value !== undefined && value !== null && value !== '' ? String(value) : placeholder);

  const customHeightStyle = maxHeight !== undefined && maxHeight !== null
    ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }
    : {};

  const shouldHideScrollbar = hideScrollbar || (maxHeight !== undefined && hideScrollbar !== false);

  return (
    <div
      ref={containerRef}
      className="relative inline-block w-full select-none"
    >
      {/* 触发器 */}
      <div
        className={triggerVariants({ size: sizeKey })}
        onClick={() => setIsOpen(!isOpen)}
        style={boxStyle}
        tabIndex={-1}
        title={showTitle ? (currentOption?.label ?? undefined) : undefined}
        onMouseEnter={(e) => handleMouseEnter(e, currentOption ? currentOption.label : undefined)}
        onMouseLeave={handleMouseLeave}
      >
        <span className={cn('flex-1 truncate text-left', !currentOption && 'text-muted-foreground')}>
          {currentLabel}
        </span>
        <ChevronDownIcon
          className={cn(
            'size-4 opacity-50 transition-transform duration-200',
            isOpen && 'rotate-180 opacity-80'
          )}
        />
      </div>

      {isOpen && (
        <div
          className={dropdownPanelVariants({ direction: direction === 'top' ? 'top' : 'bottom' })}
          style={dropdownStyle}
        >
          {searchable && (
            <div className={cn('shrink-0 border-b border-border pt-1.5 pb-1.5', pad)}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="搜索..."
                className="h-7 w-full rounded border border-input bg-transparent px-2 text-xs text-foreground outline-none transition-colors focus:border-ring focus:ring-1 focus:ring-ring"
                onKeyDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}

          {asyncLoading && asyncPage === 1 && (
            <div className={cn('py-2.5 text-center text-xs text-muted-foreground', pad)}>
              搜索中...
            </div>
          )}
          {!asyncLoading && (searchable && optionsAsync ? asyncItems : filteredOptions).length === 0 && (
            <div className={cn('py-2.5 text-center text-xs text-muted-foreground', pad)}>
              无匹配结果
            </div>
          )}

          <div
            className={cn(
              'flex flex-col overflow-y-auto p-1',
              !maxHeight && 'max-h-60',
              shouldHideScrollbar && noScrollbarCls
            )}
            style={customHeightStyle}
          >
            {(searchable && optionsAsync ? asyncItems : filteredOptions).map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  className={cn(
                    itemVariants(),
                    isSelected && 'bg-accent/60 font-medium text-accent-foreground'
                  )}
                  onClick={() => handleSelect(opt.value)}
                  style={optionStyle}
                  onMouseEnter={(e) => handleMouseEnter(e, opt.label)}
                  onMouseLeave={handleMouseLeave}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <span className="flex size-3.5 items-center justify-center text-primary">
                      <CheckIcon className="size-3.5" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {searchable && optionsAsync && asyncTotal > asyncItems.length && (
            <div
              className={cn(
                'shrink-0 cursor-pointer border-t border-border py-2 text-center text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground',
                pad
              )}
              onClick={handleLoadMore}
            >
              {asyncLoading ? '加载中...' : `加载更多 (${asyncItems.length}/${asyncTotal})`}
            </div>
          )}
        </div>
      )}

      {hoveredTooltip && createPortal(
        <div
          className="pointer-events-none fixed z-[999999] -translate-x-1/2 -translate-y-full whitespace-nowrap inline-flex w-fit max-w-xs items-center rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background shadow-md animate-in fade-in-0 duration-150"
          style={{
            top: `${hoveredTooltip.top}px`,
            left: `${hoveredTooltip.left}px`
          }}
        >
          {hoveredTooltip.text}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Select;
