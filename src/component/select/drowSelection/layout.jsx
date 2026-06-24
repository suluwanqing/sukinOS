import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createNamespace } from '/utils/js/classcreate';
import style from './style.module.css';

const bem = createNamespace('select');

const ArrowDownIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

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
  const PAGE_SIZE = 20;

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

  const handleLoadMore = () => {
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
      top: window.scrollY + rect.top,
      left: window.scrollX + rect.left + rect.width / 2
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
    ? options.filter(opt => opt.label.toLowerCase().includes(searchText.toLowerCase()))
    : options;

  const currentOption = options.find(opt => opt.value === value);
  const currentLabel = currentOption ? currentOption.label : value || placeholder;

  return (
    <div
      ref={containerRef}
      className={[
        style[bem.b()],
        style[bem.m(size)],
        style[bem.m(direction)],
        style[bem.is('open', isOpen)]
      ].join(' ')}
    >
      <div
        className={style[bem.e('trigger')]}
        onClick={() => setIsOpen(!isOpen)}
        style={boxStyle}
        tabIndex={-1}
        onMouseEnter={(e) => handleMouseEnter(e, currentOption ? currentOption.label : undefined)}
        onMouseLeave={handleMouseLeave}
      >
        <span className={style[bem.e('value')]}>{currentLabel}</span>
        <span className={[
          style[bem.e('arrow')],
          style[bem.is('reverse', isOpen)]
        ].join(' ')}>
          <ArrowDownIcon />
        </span>
      </div>
      {isOpen && (
        <div
          className={style[bem.e('options')]}
          style={dropdownStyle}
        >
          {searchable && (
            <div className={style[bem.e('search')]}>
              <input
                ref={searchInputRef}
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                placeholder="搜索..."
                className={style[bem.e('search-input')]}
                onKeyDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              />
            </div>
          )}
          {asyncLoading && asyncPage === 1 && (
            <div className={style[bem.e('status')]}>搜索中...</div>
          )}
          {!asyncLoading && displayOptions.length === 0 && (
            <div className={style[bem.e('status')]}>无匹配结果</div>
          )}
          {(searchable && optionsAsync ? asyncItems : filteredOptions).map((opt) => (
            <div
              key={opt.value}
              className={[
                style[bem.e('option')],
                style[bem.is('selected', opt.value === value)]
              ].join(' ')}
              onClick={() => handleSelect(opt.value)}
              style={optionStyle}
              onMouseEnter={(e) => handleMouseEnter(e, opt.label)}
              onMouseLeave={handleMouseLeave}
            >
              <span className={style[bem.e('option-text')]}>{opt.label}</span>
            </div>
          ))}
          {searchable && optionsAsync && asyncTotal > asyncItems.length && (
            <div
              className={style[bem.e('load-more')]}
              onClick={handleLoadMore}
            >
              {asyncLoading ? '加载中...' : `加载更多 (${asyncItems.length}/${asyncTotal})`}
            </div>
          )}
        </div>
      )}

      {hoveredTooltip && createPortal(
        <div
          className={style[bem.e('portal-tooltip')]}
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
