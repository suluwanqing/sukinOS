import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { createNamespace } from '/utils/js/classcreate';
import Page from '../../page/layout';
import style from './style.module.css';

const bem = createNamespace('pagelist');

const ChevronRightIcon = () => (
  <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="9 18 15 12 9 6"></polyline>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="6 9 12 15 18 9"></polyline>
  </svg>
);

const SettingsIcon = () => (
  <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const CheckIcon = () => (
  <svg width="0.85em" height="0.85em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
);

const CloseIcon = () => (
  <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const VisibilityIcon = () => (
  <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const VisibilityOffIcon = () => (
  <svg width="1.1em" height="1.1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block", verticalAlign: "middle" }}>
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
    const GAP = 8;
    const MARGIN = 16;

    const spaceBelow = window.innerHeight - rect.bottom - GAP - MARGIN;
    const spaceAbove = rect.top - GAP - MARGIN;

    const openUp = spaceBelow < 300 && spaceAbove > spaceBelow;

    setCoords({
      openUp,
      right: window.innerWidth - rect.right,
      top: openUp ? null : rect.bottom + GAP,
      bottom: openUp ? window.innerHeight - rect.top + GAP : null,
      maxHeight: openUp ? spaceAbove : spaceBelow,
      width: 240
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
      className={style[bem.e('settings-dropdown')]}
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

export const PageList = ({
  defaultColumnWidth = 150,
  columns = [],
  data = [],
  total = 0,
  current = 1,
  pageSize = 10,
  rowKey = 'id',
  childrenColumnName = 'children',
  selectable = false,
  isAuto = false,
  request = null,
  requestDataPath = null,
  textMaxLength = 0,
  actions = [],
  actionTitle = '操作',
  actionWidth = 150,
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
  const settingsBtnRef = useRef(null);

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
      keys.push(item[rowKey]);
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
      setLocalSelectedRowKeys(prev => prev.filter(key => currentAllKeys.includes(key)));
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

  const renderCellContent = (col, value, record) => {
    if (col.render && typeof col.render === 'function') {
      return col.render(record);
    }
    if (value === null || value === undefined || value === '') {
      return <span className={style[bem.e('placeholder')]}>{col.placeholder || '—'}</span>;
    }
    switch (col.type) {
      case 'image':
      case 'img':
        return (
          <img
            src={value}
            alt={col.label}
            className={style[bem.e('cell-image')]}
            onClick={(e) => { e.stopPropagation(); window.open(value, '_blank'); }}
          />
        );
      case 'video':
        return (
          <video
            src={value}
            className={style[bem.e('cell-video')]}
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
            className={style[bem.e('cell-link')]}
            onClick={(e) => e.stopPropagation()}
            title={value}
          >
            {value}
          </a>
        );
      default:
        const strValue = String(value);
        let displayText = strValue;
        if (textMaxLength > 0 && strValue.length > textMaxLength) {
          displayText = strValue.slice(0, textMaxLength) + '...';
        }
        return <span className={style[bem.e('cell-text')]} title={strValue}>{displayText}</span>;
    }
  };

  const renderRow = (record, level = 0) => {
    const key = record[rowKey];
    const isSelected = selectedRowKeys.includes(key);
    const isExpanded = expandedRowKeys.includes(key);
    const hasChildren = record[childrenColumnName] && Array.isArray(record[childrenColumnName]) && record[childrenColumnName].length > 0;

    return (
      <React.Fragment key={key}>
        <tr
          className={`${style[bem.e('row')]} ${isSelected ? style[bem.is('selected', true)] : ''}`}
          onClick={() => selectable && handleSelectRow(key)}
        >
          {selectable && (
            <td className={style[bem.e('cell')]} style={{ width: 48 }}>
              <div
                className={`${style[bem.e('checkbox')]} ${isSelected ? style[bem.is('checked', true)] : ''}`}
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

            return (
              <td
                key={col.prop}
                className={style[bem.e('cell')]}
                style={{
                  width: col.width || defaultColumnWidth,
                  paddingLeft: isFirstCol ? level * 24 + 16 : 16
                }}
              >
                <div className={style[bem.e('cell-wrapper')]}>
                  {isFirstCol && hasChildren && (
                    <button
                      className={style[bem.e('expand-btn')]}
                      onClick={(e) => { e.stopPropagation(); handleExpandRow(key); }}
                    >
                      {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    </button>
                  )}
                  {cellContent}
                </div>
              </td>
            );
          })}
          {hasActions && (
            <td className={style[bem.e('cell')]} style={{ width: actionWidth }}>
              <div className={style[bem.e('cell-actions')]}>
                {actions.map((action, i) => (
                  <button
                    key={i}
                    className={style[bem.e('action-btn')]}
                    style={action.style || {}}
                    onClick={(e) => { e.stopPropagation(); action.onClick?.(record); }}
                    title={action.label}
                  >
                    {action.icon && <span className={style[bem.e('action-icon')]}>{action.icon}</span>}
                    {action.label && <span>{action.label}</span>}
                  </button>
                ))}
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
    <div className={style[bem.b()]}>
      <div className={style[bem.e('toolbar')]}>
        <div className={style[bem.e('toolbar-left')]} />
        <div className={style[bem.e('toolbar-right')]}>
          <div className={style[bem.e('settings-wrapper')]}>
            <button
              ref={settingsBtnRef}
              className={`${style[bem.e('settings-btn')]} ${showSettings ? style[bem.is('active', true)] : ''}`}
              onClick={() => setShowSettings(v => !v)}
            >
              <SettingsIcon />
              <span>列设置</span>
            </button>
            {showSettings && (
              <SettingsPortal anchorRef={settingsBtnRef} onClose={() => setShowSettings(false)}>
                <div className={style[bem.e('settings-header')]}>
                  <span>显示列</span>
                  <button onClick={() => setShowSettings(false)}>
                    <CloseIcon />
                  </button>
                </div>
                <div className={style[bem.e('settings-list')]}>
                  {columns.map(col => (
                    <label key={col.prop} className={style[bem.e('settings-item')]}>
                      <input
                        type="checkbox"
                        checked={!hiddenColumns.includes(col.prop)}
                        onChange={() => toggleColumnVisibility(col.prop)}
                      />
                      <span>{col.label}</span>
                      {hiddenColumns.includes(col.prop) ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </label>
                  ))}
                </div>
              </SettingsPortal>
            )}
          </div>
        </div>
      </div>

      <div className={style[bem.e('table-wrapper')]}>
        <table className={style[bem.e('table')]}>
          <thead>
            <tr className={style[bem.e('header-row')]}>
              {selectable && (
                <th className={style[bem.e('header-cell')]} style={{ width: 48 }}>
                  <div
                    className={`${style[bem.e('checkbox')]} ${isAllSelected ? style[bem.is('checked', true)] : ''} ${isIndeterminate ? style[bem.is('indeterminate', true)] : ''}`}
                    onClick={handleSelectAll}
                  >
                    {(isAllSelected || isIndeterminate) && <CheckIcon />}
                  </div>
                </th>
              )}
              {displayColumns.map(col => (
                <th
                  key={col.prop}
                  className={style[bem.e('header-cell')]}
                  style={{ width: col.width || defaultColumnWidth }}
                >
                  {col.label}
                </th>
              ))}
              {hasActions && (
                <th className={style[bem.e('header-cell')]} style={{ width: actionWidth }}>
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
                    className={style[bem.e('empty')]}
                  >
                    <div className={style[bem.e('empty-content')]}>
                      <p>暂无数据</p>
                    </div>
                  </td>
                </tr>
              )
            }
          </tbody>
        </table>
      </div>

      <div className={style[bem.e('footer')]}>
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
    </div>
  );
};

export default PageList;
