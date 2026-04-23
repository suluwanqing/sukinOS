import React, { useState, useEffect, useRef } from 'react';
import { createNamespace } from '/utils/js/classcreate';
import Page from '../../page/layout';
import style from './style.module.css';
import {
  KeyboardArrowRight,
  KeyboardArrowDown,
  Settings,
  Check,
  Close,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';

const bem = createNamespace('pagelist');

const getDeepValue = (obj, path) => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
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
  onPageChange = () => {},
  onPageSizeChange = () => {},
  onSelectionChange = () => {}
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  const [hiddenColumns, setHiddenColumns] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const settingsRef = useRef(null);
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
    const handleClickOutside = (event) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target) &&
          settingsBtnRef.current && !settingsBtnRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  useEffect(() => {
    onSelectionChange(selectedRowKeys);
  }, [selectedRowKeys]);

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

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRowKeys(prev => prev.filter(key => !currentAllKeys.includes(key)));
    } else {
      const newKeys = [...new Set([...selectedRowKeys, ...currentAllKeys])];
      setSelectedRowKeys(newKeys);
    }
  };

  const handleSelectRow = (key) => {
    setSelectedRowKeys(prev => {
      if (prev.includes(key)) return prev.filter(k => k !== key);
      return [...prev, key];
    });
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
      <div key={key} className={style[bem.e('row-group')]}>
        <div
          className={`${style[bem.e('row')]} ${isSelected ? style[bem.is('selected', true)] : ''}`}
        >
          {selectable && (
            <div className={style[bem.e('cell-checkbox')]} onClick={() => handleSelectRow(key)}>
              <div className={`${style[bem.e('checkbox')]} ${isSelected ? style[bem.is('checked', true)] : ''}`}>
                {isSelected && <Check className={style[bem.e('checkbox-icon')]} />}
              </div>
            </div>
          )}
          {displayColumns.map((col, index) => {
            const rawValue = col.deep ? getDeepValue(record, col.prop) : record[col.prop];
            const cellContent = renderCellContent(col, rawValue, record);
            const isFirstCol = index === 0;
            const paddingLeft = isFirstCol ? level * 24 : 16;
            const flexStyle = col.width ? `0 0 ${col.width}px` : `1 0 ${defaultColumnWidth}px`;

            return (
              <div
                key={col.prop || index}
                className={style[bem.e('cell')]}
                style={{ flex: flexStyle, paddingLeft: isFirstCol ? paddingLeft : 16 }}
              >
                {isFirstCol && hasChildren && (
                  <button
                    className={style[bem.e('expand-btn')]}
                    onClick={(e) => { e.stopPropagation(); handleExpandRow(key); }}
                  >
                    {isExpanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
                  </button>
                )}
                <div className={style[bem.e('cell-content')]}>{cellContent}</div>
              </div>
            );
          })}
          {hasActions && (
            <div
              className={style[bem.e('cell-actions')]}
              style={{ flex: `0 0 ${actionWidth}px` }}
            >
              {actions.map((action, i) => (
                <button
                  key={i}
                  className={style[bem.e('action-btn')]}
                  style={action.style || {}}
                  onClick={(e) => { e.stopPropagation(); if (action.onClick) action.onClick(record); }}
                  title={action.label}
                >
                  {action.icon && <span className={style[bem.e('action-icon')]}>{action.icon}</span>}
                  {action.label && <span>{action.label}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div className={style[bem.e('children')]}>
            {record[childrenColumnName].map(child => renderRow(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('toolbar')]}>
        <div className={style[bem.e('toolbar-left')]} />
        <div className={style[bem.e('toolbar-right')]}>
          <div className={style[bem.e('settings-wrapper')]} ref={settingsRef}>
            <button
              ref={settingsBtnRef}
              className={`${style[bem.e('settings-btn')]} ${showSettings ? style[bem.is('active', true)] : ''}`}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings />
              <span>列设置</span>
            </button>
            {showSettings && (
              <div className={style[bem.e('settings-dropdown')]}>
                <div className={style[bem.e('settings-header')]}>
                  <span>显示列</span>
                  <button onClick={() => setShowSettings(false)}>
                    <Close />
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
                      {hiddenColumns.includes(col.prop) ? <VisibilityOff /> : <Visibility />}
                    </label>
                  ))}
                </div>
              </div>
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
                    {(isAllSelected || isIndeterminate) && <Check />}
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
            {finalData.map(item => {
              const key = item[rowKey];
              const isSelected = selectedRowKeys.includes(key);
              const isExpanded = expandedRowKeys.includes(key);
              const hasChildren = item[childrenColumnName] && Array.isArray(item[childrenColumnName]) && item[childrenColumnName].length > 0;

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
                          {isSelected && <Check />}
                        </div>
                      </td>
                    )}
                    {displayColumns.map((col, idx) => {
                      const rawValue = col.deep ? getDeepValue(item, col.prop) : item[col.prop];
                      const cellContent = renderCellContent(col, rawValue, item);
                      const isFirstCol = idx === 0;

                      return (
                        <td
                          key={col.prop}
                          className={style[bem.e('cell')]}
                          style={{ width: col.width || defaultColumnWidth }}
                        >
                          <div className={style[bem.e('cell-wrapper')]}>
                            {isFirstCol && hasChildren && (
                              <button
                                className={style[bem.e('expand-btn')]}
                                onClick={(e) => { e.stopPropagation(); handleExpandRow(key); }}
                              >
                                {isExpanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />}
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
                              onClick={(e) => { e.stopPropagation(); action.onClick?.(item); }}
                              title={action.label}
                            >
                              {action.icon}
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    )}
                  </tr>
                  {hasChildren && isExpanded && (
                    <tr className={style[bem.e('expand-row')]}>
                      <td colSpan={displayColumns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)}>
                        <div className={style[bem.e('children')]}>
                          {item[childrenColumnName].map(child => {
                            const childKey = child[rowKey];
                            const childSelected = selectedRowKeys.includes(childKey);

                            return (
                              <div key={childKey} className={style[bem.e('child-row')]}>
                                {renderRow(child, 1)}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {finalData.length === 0 && (
              <tr>
                <td colSpan={displayColumns.length + (selectable ? 1 : 0) + (hasActions ? 1 : 0)} className={style[bem.e('empty')]}>
                  <div className={style[bem.e('empty-content')]}>
                    <p>暂无数据</p>
                  </div>
                </td>
              </tr>
            )}
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
