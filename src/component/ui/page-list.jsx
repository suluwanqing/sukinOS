import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Page } from './pagination';

const LIST_THEMES = ['default', 'primary', 'success', 'danger', 'dark', 'flat', 'minimal'];
const themeKeyOf = (theme) => (LIST_THEMES.includes(theme) ? theme : 'default');

const tones = {
  default: {
    shell: 'bg-card text-foreground',
    frame: 'border-border bg-card shadow-sm',
    headRow: 'bg-muted/60',
    headLine: 'border-border',
    headText: 'text-muted-foreground',
    rowIdle: 'border-border/60 bg-card hover:bg-muted/40',
    rowOn: 'border-border/60 bg-muted/70',
    cell: 'text-foreground',
    boxIdle: 'border-input bg-card hover:border-foreground/60',
    boxOn: 'border-foreground bg-foreground text-background',
    chipIdle: 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:bg-muted/60 hover:text-foreground',
    chipOn: 'border-foreground bg-foreground text-background shadow-sm hover:border-foreground hover:bg-foreground',
    expand: 'border-border bg-card text-muted-foreground hover:border-foreground/40 hover:bg-muted hover:text-foreground',
    soft: 'text-muted-foreground',
    empty: 'text-muted-foreground',
    link: 'text-primary',
    stickyBg: 'bg-card',
    stickyHeadBg: 'bg-muted',
  },
  primary: {
    shell: 'bg-card text-foreground',
    frame: 'border-border bg-card shadow-sm',
    headRow: 'bg-primary',
    headLine: 'border-primary',
    headText: 'text-primary-foreground',
    rowIdle: 'border-border/60 bg-card hover:bg-primary/5',
    rowOn: 'border-border/60 bg-primary/10',
    cell: 'text-foreground',
    boxIdle: 'border-input bg-card hover:border-primary',
    boxOn: 'border-primary bg-primary text-primary-foreground',
    chipIdle: 'border-input bg-card text-foreground hover:border-primary hover:bg-primary/10',
    chipOn: 'border-primary bg-primary text-primary-foreground shadow-sm hover:border-primary hover:bg-primary',
    expand: 'border-input bg-card text-muted-foreground hover:border-primary hover:bg-muted hover:text-foreground',
    soft: 'text-muted-foreground',
    empty: 'text-muted-foreground',
    link: 'text-primary',
    stickyBg: 'bg-card',
    stickyHeadBg: 'bg-primary',
  },
  success: {
    shell: 'bg-card text-foreground',
    frame: 'border-border bg-card shadow-sm',
    headRow: 'bg-success',
    headLine: 'border-success',
    headText: 'text-success-foreground',
    rowIdle: 'border-border/60 bg-card hover:bg-success/5',
    rowOn: 'border-border/60 bg-success/10',
    cell: 'text-foreground',
    boxIdle: 'border-input bg-card hover:border-success',
    boxOn: 'border-success bg-success text-success-foreground',
    chipIdle: 'border-input bg-card text-foreground hover:border-success hover:bg-success/10',
    chipOn: 'border-success bg-success text-success-foreground shadow-sm hover:border-success hover:bg-success',
    expand: 'border-input bg-card text-muted-foreground hover:border-success hover:bg-muted hover:text-foreground',
    soft: 'text-muted-foreground',
    empty: 'text-muted-foreground',
    link: 'text-success',
    stickyBg: 'bg-card',
    stickyHeadBg: 'bg-success',
  },
  danger: {
    shell: 'bg-card text-foreground',
    frame: 'border-border bg-card shadow-sm',
    headRow: 'bg-destructive',
    headLine: 'border-destructive',
    headText: 'text-destructive-foreground',
    rowIdle: 'border-border/60 bg-card hover:bg-destructive/5',
    rowOn: 'border-border/60 bg-destructive/10',
    cell: 'text-foreground',
    boxIdle: 'border-input bg-card hover:border-destructive',
    boxOn: 'border-destructive bg-destructive text-destructive-foreground',
    chipIdle: 'border-input bg-card text-foreground hover:border-destructive hover:bg-destructive/10',
    chipOn: 'border-destructive bg-destructive text-destructive-foreground shadow-sm hover:border-destructive hover:bg-destructive',
    expand: 'border-input bg-card text-muted-foreground hover:border-destructive hover:bg-muted hover:text-foreground',
    soft: 'text-muted-foreground',
    empty: 'text-muted-foreground',
    link: 'text-destructive',
    stickyBg: 'bg-card',
    stickyHeadBg: 'bg-destructive',
  },
  flat: {
    shell: 'bg-transparent text-foreground',
    frame: 'border-transparent bg-transparent',
    headRow: 'bg-transparent',
    headLine: 'border-border',
    headText: 'text-muted-foreground',
    rowIdle: 'border-border/50 bg-transparent hover:bg-muted/50',
    rowOn: 'border-border/50 bg-muted/60',
    cell: 'text-foreground',
    boxIdle: 'border-input bg-transparent hover:border-foreground',
    boxOn: 'border-foreground bg-foreground text-background',
    chipIdle: 'border-transparent bg-muted/60 text-foreground hover:bg-accent',
    chipOn: 'border-transparent bg-foreground text-background hover:bg-foreground',
    expand: 'border-transparent bg-muted/60 text-muted-foreground hover:bg-accent hover:text-foreground',
    soft: 'text-muted-foreground',
    empty: 'text-muted-foreground',
    link: 'text-primary',
    stickyBg: 'bg-background',
    stickyHeadBg: 'bg-muted',
  },
  minimal: {
    shell: 'bg-transparent text-foreground',
    frame: 'border-transparent bg-transparent',
    headRow: 'bg-transparent',
    headLine: 'border-foreground/15',
    headText: 'text-muted-foreground',
    rowIdle: 'border-border/50 bg-transparent',
    rowOn: 'border-border/50 bg-muted/50',
    cell: 'text-foreground',
    boxIdle: 'border-input bg-transparent hover:border-foreground',
    boxOn: 'border-foreground bg-foreground text-background',
    chipIdle: 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    chipOn: 'border-transparent bg-foreground text-background hover:bg-foreground',
    expand: 'border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
    soft: 'text-muted-foreground',
    empty: 'text-muted-foreground',
    link: 'text-primary',
    stickyBg: 'bg-background',
    stickyHeadBg: 'bg-muted',
  },
};

const toneOf = (theme) => tones[themeKeyOf(theme === 'dark' ? 'default' : theme)];
const isDarkTheme = (theme) => themeKeyOf(theme) === 'dark';


const shellCls = 'box-border w-full text-xs sm:text-[13px] leading-normal';
const frameCls = 'min-w-full overflow-auto rounded-lg border';
const headRowCls = 'border-b';
const headCellCls = 'border-b px-3.5 py-2.5 text-left text-xs font-semibold tracking-wider';
const headGutterCls = 'border-b px-3 py-2.5 text-left';
const rowCls = 'border-b transition-colors duration-150 last:border-b-0';
const cellCls = 'px-3.5 py-2.5 align-middle text-xs sm:text-[13px]';
const boxCls = 'grid size-4 shrink-0 cursor-pointer place-items-center rounded-[3px] border transition-all duration-150';
const chipCls = 'inline-flex select-none items-center justify-center gap-1.5 rounded-md border font-normal transition-all duration-150';
const expandCls = 'grid size-5 shrink-0 place-items-center rounded border transition-colors';
const emptyCls = 'flex flex-col items-center gap-2 py-10 text-xs font-medium';
const linkCls = 'truncate font-medium no-underline transition-opacity hover:underline';


const formatWidth = (val) => {
  if (val === undefined || val === null || val === '') return undefined;
  return typeof val === 'number' ? `${val}px` : val;
};


const getResponsiveClass = (responsive) => {
  if (!responsive || !Array.isArray(responsive) || responsive.length === 0) return '';
  const breakpointOrder = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const activeBreakpoints = responsive.filter(bp => breakpointOrder.includes(bp));
  if (activeBreakpoints.length === 0) return '';

  if (activeBreakpoints.includes('xs')) {
    return 'table-cell';
  }
  if (activeBreakpoints.includes('sm')) {
    return 'hidden sm:table-cell';
  }
  if (activeBreakpoints.includes('md')) {
    return 'hidden md:table-cell';
  }
  if (activeBreakpoints.includes('lg')) {
    return 'hidden lg:table-cell';
  }
  if (activeBreakpoints.includes('xl')) {
    return 'hidden xl:table-cell';
  }
  return 'hidden 2xl:table-cell';
};


let _uid = 0;
const ensureKey = (record, rowKey) => {
  const k = record?.[rowKey];
  return k !== null && k !== undefined ? k : `__auto_${++_uid}`;
};

const ChevronRightIcon = () => (
  <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const SettingsIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="0.8em" height="0.8em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const DashIcon = () => (
  <svg width="0.8em" height="0.8em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="shrink-0">
    <line x1="6" y1="12" x2="18" y2="12"></line>
  </svg>
);

const CloseIcon = () => (
  <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const VisibilityIcon = () => (
  <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const VisibilityOffIcon = () => (
  <svg width="1.05em" height="1.05em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const getDeepValue = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
};

const SettingsPortal = ({ anchorRef, onClose, children }) => {
  const portalRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const updatePosition = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const GAP = 6;
    const MARGIN = 16;

    const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;

    const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;

    setCoords({
      openUp,
      right: window.innerWidth - rect.right,
      top: openUp ? null : rect.bottom + GAP,
      bottom: openUp ? window.innerHeight - rect.top + GAP : null,
      maxHeight: openUp ? spaceAbove : spaceBelow,
      width: 220
    });
  }, [anchorRef]);

  useEffect(() => {
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [updatePosition]);

  useEffect(() => {
    const handleDown = (e) => {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      if (portalRef.current && portalRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, [anchorRef, onClose]);

  if (!coords) return null;

  return createPortal(
    <div
      ref={portalRef}
      className="overflow-hidden rounded-lg border border-border bg-popover text-xs text-popover-foreground shadow-xl animate-in fade-in-0 slide-in-from-top-1 duration-150"
      style={{
        position: 'fixed',
        right: coords.right,
        top: coords.top !== null ? coords.top : 'auto',
        bottom: coords.bottom !== null ? coords.bottom : 'auto',
        maxHeight: coords.maxHeight,
        width: coords.width,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {children}
    </div>,
    document.body
  );
};

const EMPTY_ARRAY = [];

export const PageList = ({
  defaultColumnWidth = 140,
  columns = EMPTY_ARRAY,
  data = EMPTY_ARRAY,
  total = 0,
  current = 1,
  pageSize = 10,
  theme = 'default',
  rowKey = 'id',
  childrenColumnName = 'children',
  selectable = false,
  isAuto = false,
  request = null,
  requestDataPath = null,
  textMaxLength = 0,
  actions = EMPTY_ARRAY,
  actionTitle = '操作',
  actionWidth = 'auto',
  actionFixed = true, // 支持操作列右侧吸附固定（像 Antd 一样在横向滚动时常驻）
  actionTextTrigger = 'hover', // 'hover' (默认只显示icon，hover时气泡提示文字) | 'always' (常显文字)
  scrollX, // 支持显式传入横向最小滚动宽度（如 scrollX={1200}）
  selectedRowKeys: propSelectedRowKeys,
  onPageChange = () => {},
  onPageSizeChange = () => {},
  onSelectionChange = () => {}
}) => {
  const isControlled = propSelectedRowKeys !== undefined && propSelectedRowKeys !== null;
  const [localSelectedRowKeys, setLocalSelectedRowKeys] = useState([]);
  const selectedRowKeys = isControlled ? propSelectedRowKeys : localSelectedRowKeys;

  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [hoverTooltip, setHoverTooltip] = useState(null); // 动作按钮 Hover 提示文本状态
  const settingsBtnRef = useRef(null);

  const tone = toneOf(theme);

  const [internalData, setInternalData] = useState([]);
  const [internalTotal, setInternalTotal] = useState(0);
  const [internalCurrent, setInternalCurrent] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(10);

  const finalData = isAuto ? internalData : data;
  const finalTotal = isAuto ? internalTotal : total;
  const finalCurrent = isAuto ? internalCurrent : current;
  const finalPageSize = isAuto ? internalPageSize : pageSize;

  const displayColumns = columns.filter(col => !hiddenColumns.includes(col.prop));
  const hasActions = actions && actions.length > 0;

  useEffect(() => {
    if (!isAuto) {
      setInternalPageSize(pageSize);
    } else {
      setInternalPageSize(10);
    }
  }, [pageSize, isAuto]);

  const fetchData = async (p, s) => {
    if (typeof request === 'function') {
      try {
        const res = await request({ current: p, pageSize: s });
        if (res) {
          let listData = [];
          if (requestDataPath) {
            listData = getDeepValue(res, requestDataPath);
          } else {
            listData = Array.isArray(res.list) ? res.list : (Array.isArray(res.data) ? res.data : []);
          }
          setInternalData(Array.isArray(listData) ? listData : []);
          setInternalTotal(res.total || 0);
        }
      } catch (error) {
        console.error(error);
        setInternalData([]);
        setInternalTotal(0);
      }
    }
  };

  useEffect(() => {
    if (isAuto) {
      fetchData(internalCurrent, internalPageSize);
    }
  }, [isAuto, internalCurrent, internalPageSize]);

  const handleInnerPageChange = (newPage) => {
    if (isAuto) {
      setInternalCurrent(newPage);
    } else {
      onPageChange(newPage);
    }
  };

  const handleInnerPageSizeChange = (newSize) => {
    if (isAuto) {
      setInternalPageSize(newSize);
      setInternalCurrent(1);
    } else {
      onPageSizeChange(newSize);
    }
  };

  const getAllRowKeys = (list) => {
    let keys = [];
    list.forEach(item => {
      keys.push(ensureKey(item, rowKey));
      if (item[childrenColumnName] && Array.isArray(item[childrenColumnName])) {
        keys = keys.concat(getAllRowKeys(item[childrenColumnName]));
      }
    });
    return keys;
  };

  const currentAllKeys = getAllRowKeys(finalData);
  const isAllSelected = currentAllKeys.length > 0 && currentAllKeys.every(key => selectedRowKeys.includes(key));
  const isIndeterminate = currentAllKeys.some(key => selectedRowKeys.includes(key)) && !isAllSelected;
  useEffect(() => {
    if (!isControlled) {
      setLocalSelectedRowKeys(prev => {
        const next = prev.filter(key => currentAllKeys.includes(key));
        const unchanged = next.length === prev.length && next.every((k, i) => Object.is(k, prev[i]));
        return unchanged ? prev : next;
      });
    }
  }, [finalData, isControlled]);

  const handleSelectAll = () => {
    let nextKeys = [];
    if (isAllSelected) {
      nextKeys = selectedRowKeys.filter(key => !currentAllKeys.includes(key));
    } else {
      nextKeys = [...new Set([...selectedRowKeys, ...currentAllKeys])];
    }
    if (!isControlled) {
      setLocalSelectedRowKeys(nextKeys);
    }
    onSelectionChange(nextKeys);
  };

  const handleSelectRow = (key) => {
    let nextKeys = [];
    if (selectedRowKeys.includes(key)) {
      nextKeys = selectedRowKeys.filter(k => k !== key);
    } else {
      nextKeys = [...selectedRowKeys, key];
    }
    if (!isControlled) {
      setLocalSelectedRowKeys(nextKeys);
    }
    onSelectionChange(nextKeys);
  };

  const handleExpandRow = (key) => {
    setExpandedRowKeys(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      return [...prev, key];
    });
  };

  const toggleColumnVisibility = (prop) => {
    setHiddenColumns(prev => {
      if (prev.includes(prop)) return prev.filter(p => p !== prop);
      return [...prev, prop];
    });
  };


  const handleActionMouseEnter = (e, text) => {
    if (!text) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHoverTooltip({
      text,
      top: rect.top - 3,
      left: rect.left + rect.width / 2
    });
  };

  const handleActionMouseLeave = () => {
    setHoverTooltip(null);
  };

  const getColStyle = (col) => {
    const style = {};
    const w = formatWidth(col.width || (!col.minWidth ? defaultColumnWidth : undefined));
    const minW = formatWidth(col.minWidth);
    const maxW = formatWidth(col.maxWidth);

    if (w) style.width = w;
    if (minW) style.minWidth = minW;
    if (maxW) style.maxWidth = maxW;

    return style;
  };

  const renderCellContent = (col, value, record) => {
    if (col.render && typeof col.render === 'function') {
      return col.render(record);
    }
    if (value === null || value === undefined || value === '') {
      return <span className={tone.soft}>{col.placeholder || '—'}</span>;
    }
    switch (col.type) {
      case 'image':
      case 'img':
        return (
          <img
            src={value}
            alt={col.label}
            className="size-8 cursor-pointer rounded border border-input object-cover transition-opacity hover:opacity-85"
            onClick={(e) => { e.stopPropagation(); window.open(value, '_blank'); }}
          />
        );
      case 'video':
        return (
          <video
            src={value}
            className="h-10 w-[80px] cursor-pointer rounded border border-input object-cover"
            controls
            onClick={(e) => e.stopPropagation()}
          />
        );
      case 'link':
      case 'url':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkCls} ${tone.link}`}
            onClick={(e) => e.stopPropagation()}
            title={value}
          >
            {value}
          </a>
        );
      default: {
        const strValue = String(value);
        let displayText = strValue;
        if (textMaxLength > 0 && strValue.length > textMaxLength) {
          displayText = strValue.slice(0, textMaxLength) + '...';
        }
        const isEllipsis = col.ellipsis || textMaxLength > 0;
        return (
          <span
            className={isEllipsis ? "block overflow-hidden text-ellipsis whitespace-nowrap" : ""}
            title={strValue}
          >
            {displayText}
          </span>
        );
      }
    }
  };

  const renderRow = (record, level = 0) => {
    const key = ensureKey(record, rowKey);
    const isSelected = selectedRowKeys.includes(key);
    const isExpanded = expandedRowKeys.includes(key);
    const hasChildren = record[childrenColumnName] && Array.isArray(record[childrenColumnName]) && record[childrenColumnName].length > 0;

    return (
      <React.Fragment key={key}>
        <tr
          className={`group/row ${rowCls} ${isSelected ? tone.rowOn : tone.rowIdle}`}
          onClick={() => selectable && handleSelectRow(key)}
        >
          {selectable && (
            <td className="w-10 px-3 py-2 text-center align-middle sticky left-0 z-10 bg-inherit">
              <div
                className={`${boxCls} ${isSelected ? tone.boxOn : tone.boxIdle} mx-auto`}
                onClick={(e) => { e.stopPropagation(); handleSelectRow(key); }}
              >
                {isSelected && <CheckIcon />}
              </div>
            </td>
          )}
          {displayColumns.map((col, idx) => {
            const rawValue = col.deep ? getDeepValue(record, col.prop) : record[col.prop];
            const cellContent = renderCellContent(col, rawValue, record);
            const isFirstCol = idx === 0;
            const responsiveClass = getResponsiveClass(col.responsive);
            const colStyle = getColStyle(col);

            return (
              <td
                key={col.prop}
                className={`${cellCls} ${tone.cell} ${responsiveClass}`}
                style={{
                  ...colStyle,
                  paddingLeft: isFirstCol ? level * 20 + 14 : undefined
                }}
              >
                <div className="flex items-center gap-1.5 overflow-hidden">
                  {isFirstCol && hasChildren && (
                    <button
                      type="button"
                      aria-label={isExpanded ? '收起' : '展开'}
                      className={`${expandCls} ${tone.expand}`}
                      onClick={(e) => { e.stopPropagation(); handleExpandRow(key); }}
                    >
                      {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    </button>
                  )}
                  <div className="min-w-0 flex-1 overflow-hidden">
                    {cellContent}
                  </div>
                </div>
              </td>
            );
          })}
          {hasActions && (
            <td
              className={`px-3.5 py-2.5 align-middle ${
                actionFixed ? `sticky right-0 z-10 ${tone.stickyBg} shadow-[-4px_0_8px_-3px_rgba(0,0,0,0.06)]` : ''
              }`}
              style={{
                width: formatWidth(actionWidth),
                minWidth: formatWidth(actionWidth)
              }}
            >
              <div className="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
                {actions.map((action, i) => {
                  const hasIcon = Boolean(action.icon);
                  const hasLabel = Boolean(action.label);
                  const isTextExplicitlyShown = action.showText === true || actionTextTrigger === 'always' || !hasIcon;

                  return (
                    <button
                      key={i}
                      type="button"
                      className={`${chipCls} h-7 ${
                        !isTextExplicitlyShown ? 'size-7 p-0' : 'px-2.5'
                      } text-xs ${tone.chipIdle} shrink-0`}
                      style={action.style || {}}
                      onClick={(e) => {
                        e.stopPropagation();
                        setHoverTooltip(null);
                        action.onClick?.(record);
                      }}
                      onMouseEnter={(e) => {

                        if (!isTextExplicitlyShown && hasLabel) {
                          handleActionMouseEnter(e, action.label);
                        }
                      }}
                      onMouseLeave={handleActionMouseLeave}
                    >
                      {hasIcon && (
                        <span className="inline-flex shrink-0 items-center justify-center [&_svg]:size-3.5">
                          {action.icon}
                        </span>
                      )}
                      {hasLabel && isTextExplicitlyShown && (
                        <span className={hasIcon ? 'ml-1' : ''}>{action.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </td>
          )}
        </tr>
        {hasChildren && isExpanded &&
          record[childrenColumnName].map(child => renderRow(child, level + 1))
        }
      </React.Fragment>
    );
  };

  return (

    <div className={`${shellCls} ${tone.shell} ${isDarkTheme(theme) ? 'dark' : ''}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2" />
        <div className="relative">
          <button
            ref={settingsBtnRef}
            type="button"
            aria-expanded={showSettings}
            className={`${chipCls} h-8 px-3 text-xs [&_svg]:size-3.5 ${showSettings ? tone.chipOn : tone.chipIdle}`}
            onClick={() => setShowSettings(v => !v)}
          >
            <SettingsIcon />
            <span>列设置</span>
          </button>
          {showSettings && (
            <SettingsPortal anchorRef={settingsBtnRef} onClose={() => setShowSettings(false)}>
              <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2 text-xs font-semibold text-foreground">
                <span>显示列</span>
                <button
                  type="button"
                  aria-label="关闭列设置"
                  className="grid size-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  onClick={() => setShowSettings(false)}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {columns.map(col => (
                  <label
                    key={col.prop}
                    className="flex cursor-pointer items-center justify-between gap-2 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground [&_svg]:size-3.5 [&_svg]:text-muted-foreground"
                  >
                    <input
                      type="checkbox"
                      className="size-3.5 cursor-pointer accent-primary"
                      checked={!hiddenColumns.includes(col.prop)}
                      onChange={() => toggleColumnVisibility(col.prop)}
                    />
                    <span className="truncate">{col.label}</span>
                    {hiddenColumns.includes(col.prop) ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </label>
                ))}
              </div>
            </SettingsPortal>
          )}
        </div>
      </div>

      <div className={`${frameCls} ${tone.frame}`}>
        <table
          className="w-full border-collapse"
          style={{
            minWidth: formatWidth(scrollX)
          }}
        >
          {/* 使用类似 Antd 的 colgroup 进行底层像素精准分配 */}
          <colgroup>
            {selectable && <col style={{ width: 40, minWidth: 40 }} />}
            {displayColumns.map(col => (
              <col
                key={col.prop}
                className={getResponsiveClass(col.responsive)}
                style={getColStyle(col)}
              />
            ))}
            {hasActions && (
              <col
                style={{
                  width: formatWidth(actionWidth),
                  minWidth: formatWidth(actionWidth)
                }}
              />
            )}
          </colgroup>

          <thead>
            <tr className={`${headRowCls} ${tone.headRow}`}>
              {selectable && (
                /* scope="col"：没有它，屏幕阅读器把表头格和正文格一视同仁，
                   用户在单元格里移动时听不出自己坐在哪一列。 */
                <th scope="col" className={`${headGutterCls} ${tone.headLine} w-10 text-center sticky left-0 z-20 ${tone.stickyHeadBg}`}>
                  <div
                    className={`${boxCls} ${(isAllSelected || isIndeterminate) ? tone.boxOn : tone.boxIdle} mx-auto`}
                    onClick={handleSelectAll}
                  >
                    {isAllSelected ? <CheckIcon /> : isIndeterminate && <DashIcon />}
                  </div>
                </th>
              )}
              {displayColumns.map(col => {
                const responsiveClass = getResponsiveClass(col.responsive);
                const colStyle = getColStyle(col);

                return (
                  <th
                    key={col.prop}
                    scope="col"
                    className={`${headCellCls} ${tone.headLine} ${tone.headText} ${responsiveClass}`}
                    style={colStyle}
                  >
                    <div className="truncate" title={col.label}>
                      {col.label}
                    </div>
                  </th>
                );
              })}
              {hasActions && (
                <th
                  scope="col"
                  className={`${headCellCls} ${tone.headLine} ${tone.headText} ${
                    actionFixed ? `sticky right-0 z-20 ${tone.stickyHeadBg} shadow-[-4px_0_8px_-3px_rgba(0,0,0,0.06)]` : ''
                  }`}
                  style={{
                    width: formatWidth(actionWidth),
                    minWidth: formatWidth(actionWidth)
                  }}
                >
                  {actionTitle}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {finalData.length > 0
              ? finalData.map(item => renderRow(item, 0))
              : (
                <tr>
                  <td
                    colSpan={displayColumns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)}
                    className="px-4 py-12 text-center"
                  >
                    <div className={`${emptyCls} ${tone.empty}`}>
                      <p>暂无数据</p>
                    </div>
                  </td>
                </tr>
              )
            }
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-end">
        <Page
          current={finalCurrent}
          total={finalTotal}
          pageSize={finalPageSize}
          onPageChange={handleInnerPageChange}
          onPageSizeChange={handleInnerPageSizeChange}
          showElevator
          showTotal
        />
      </div>

      {hoverTooltip && createPortal(
        <div
          className="pointer-events-none fixed z-[99999] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[4px] bg-foreground px-2 py-0.5 text-[11px] font-medium leading-normal text-background shadow-md animate-in fade-in-0 duration-150 flex flex-col items-center"
          style={{
            top: `${hoverTooltip.top}px`,
            left: `${hoverTooltip.left}px`
          }}
        >
          <span>{hoverTooltip.text}</span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-x-[3.5px] border-x-transparent border-t-[4px] border-t-foreground" />
        </div>,
        document.body
      )}
    </div>
  );
};

export default PageList;
