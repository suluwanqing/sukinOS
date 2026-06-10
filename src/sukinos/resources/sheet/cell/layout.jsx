import React, { useState, useRef, useEffect } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import CustomSelect from '../components/select/layout';
import CheckIcon from '@mui/icons-material/Check';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const bem = createNamespace('br-cell');

function Cell({ store, record, column, isFirstCol }) {
  const { dispatch, activeTable, activeConfig } = store;
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState('');
  const inputRef = useRef(null);
  const trackRef = useRef(null);

  const parseMultiValue = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim() !== '') {
      return val.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  useEffect(() => {
    const val = record[column.id];
    if (column.type === 'multi') {
      setTempVal(parseMultiValue(val));
    } else {
      setTempVal(val !== undefined ? val : '');
    }
  }, [record[column.id], column.id, column.type]);

  const commit = () => {
    setIsEditing(false);
    dispatch({
      type: 'UPDATE_RECORD',
      payload: { tableId: activeTable.id, recordId: record.id, fieldId: column.id, value: tempVal }
    });
  };

  const handleDoubleClick = () => {
    if (column.type === 'boolean') return;
    setIsEditing(true);
    if (column.type !== 'select' && column.type !== 'progress' && column.type !== 'multi') {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const toggleExpand = (e) => {
    e.stopPropagation();
    const expanded = activeConfig.expandedRows || [];
    const isExpanded = record._isExpanded;
    const next = isExpanded ? expanded.filter(id => id !== record.id) : [...expanded, record.id];
    dispatch({ type: 'UPDATE_CONFIG', payload: { tableId: activeTable.id, key: 'expandedRows', value: next } });
  };

  const handleTrackClick = (e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const width = rect.width;
    const offsetX = Math.min(width, Math.max(0, e.clientX - rect.left));
    const percentage = Math.round((offsetX / width) * 100);
    setTempVal(percentage);
  };

  const renderTreePrefix = () => {
    if (!isFirstCol) return null;
    const paddingLeft = record._level * 20;
    return (
      <div style={{ paddingLeft, display: 'flex', alignItems: 'center', marginRight: 4 }}>
        {record._hasChildren ? (
          <div className={style[bem.e('tree-toggle')]} onClick={toggleExpand}>
            {record._isExpanded ? <ArrowDropDownIcon sx={{ fontSize: 18 }} /> : <ArrowRightIcon sx={{ fontSize: 18 }} />}
          </div>
        ) : (
          <div style={{ width: 18 }} />
        )}
      </div>
    );
  };

  if (column.type === 'boolean') {
    const isChecked = Boolean(record[column.id]);
    const labelText = isChecked ? (column.trueLabel || '已完成') : (column.falseLabel || '未开始');
    return (
      <div className={style[bem.b('boolean')]}>
        {renderTreePrefix()}
        <div
          className={style[bem.e('boolean-trigger')]}
          onClick={() => {
            dispatch({
              type: 'UPDATE_RECORD',
              payload: { tableId: activeTable.id, recordId: record.id, fieldId: column.id, value: !isChecked }
            });
          }}
        >
          <div className={`${style[bem.e('checkbox')]} ${isChecked ? style['is-checked'] : ''}`}>
            {isChecked && <CheckIcon sx={{ fontSize: 12 }} />}
          </div>
          <span className={style[bem.e('boolean-text')]}>{labelText}</span>
        </div>
      </div>
    );
  }

  const list = parseMultiValue(record[column.id]);

  const getVisibleCount = () => {
    if (list.length === 0) return 0;
    let currentWidth = 12;
    let count = 0;
    const gap = 4;
    const moreBadgeWidth = 32;
    const colWidth = column.width || 160;

    for (let i = 0; i < list.length; i++) {
      const text = list[i];
      let textWidth = 0;
      for (let c = 0; c < text.length; c++) {
        textWidth += text.charCodeAt(c) > 127 ? 10.5 : 5.5;
      }
      const tagWidth = textWidth + 12;
      const neededWidth = currentWidth + tagWidth + (count > 0 ? gap : 0);

      if (neededWidth <= colWidth) {
        currentWidth = neededWidth;
        count++;
      } else {
        break;
      }
    }

    if (count < list.length) {
      while (count > 0 && (currentWidth + moreBadgeWidth > colWidth)) {
        count--;
        let tempWidth = 12;
        for (let j = 0; j < count; j++) {
          const text = list[j];
          let textWidth = 0;
          for (let c = 0; c < text.length; c++) {
            textWidth += text.charCodeAt(c) > 127 ? 10.5 : 5.5;
          }
          tempWidth += (textWidth + 12) + (j > 0 ? gap : 0);
        }
        currentWidth = tempWidth;
      }
    }

    return count === 0 ? 1 : count;
  };

  const visibleCount = getVisibleCount();
  const visibleList = list.slice(0, visibleCount);
  const hiddenCount = list.length - visibleCount;

  const renderContent = () => {
    const val = record[column.id];

    if (column.type === 'progress') {
      const numericVal = parseFloat(val);
      const percentage = Math.min(100, Math.max(0, isNaN(numericVal) ? 0 : numericVal));
      return (
        <div className={style[bem.e('progress-wrapper')]}>
          <div className={style[bem.e('progress-track')]}>
            <div
              className={style[bem.e('progress-bar')]}
              style={{ width: `${percentage}%`, backgroundColor: percentage === 100 ? '#10b981' : '#3b82f6' }}
            />
          </div>
          <span className={style[bem.e('progress-text')]}>{percentage}%</span>
        </div>
      );
    }

    if (column.type === 'multi') {
      if (list.length === 0) return null;
      return (
        <div className={style[bem.e('multi-tags-container')]} title={list.join(', ')}>
          {visibleList.map(valStr => {
            const opt = (column.options || []).find(o => o.label === valStr);
            const bgColor = opt?.color || '#f1f5f9';
            return (
              <span key={valStr} className={style[bem.e('tag')]} style={{ backgroundColor: bgColor }}>
                {valStr}
              </span>
            );
          })}
          {hiddenCount > 0 && (
            <span className={style[bem.e('multi-more-badge')]} title={list.slice(visibleCount).join(', ')}>
              +{hiddenCount}
            </span>
          )}
        </div>
      );
    }

    if (val === undefined || val === null || val === '') return null;

    if (column.type === 'select') {
      const opt = (column.options || []).find(o => o.label === val);
      const bgColor = opt?.color || '#f1f5f9';
      return (
        <span className={style[bem.e('tag')]} style={{ backgroundColor: bgColor }} title={String(val)}>
          {val}
        </span>
      );
    }

    if (column.type === 'date' || column.type === 'number') {
      return <span className={style[bem.e('text-mono')]} title={String(val)}>{val}</span>;
    }

    return <span className={style[bem.e('text')]} title={String(val)}>{val}</span>;
  };

  const selectOptions = (column.options || []).map(o => ({ label: o.label, value: o.label, color: o.color }));
  const optionsWithClear = [{ label: '清空', value: '', color: '#e2e8f0' }, ...selectOptions];
  const activeMultiList = parseMultiValue(tempVal);

  return (
    <div
      className={`${style[bem.b()]} ${isEditing ? style['is-editing'] : ''}`}
      onDoubleClick={handleDoubleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleDoubleClick();
      }}
    >
      {renderTreePrefix()}
      {isEditing ? (
        column.type === 'select' ? (
          <div className={style[bem.e('select-editor-wrapper')]} onClick={e => e.stopPropagation()}>
            <CustomSelect
              options={optionsWithClear}
              value={tempVal}
              onCommit={(val) => {
                setTempVal(val);
                dispatch({
                  type: 'UPDATE_RECORD',
                  payload: { tableId: activeTable.id, recordId: record.id, fieldId: column.id, value: val }
                });
                setIsEditing(false);
              }}
              onClose={() => setIsEditing(false)}
            />
          </div>
        ) : column.type === 'progress' ? (
          <>
            <div className={style[bem.e('progress-backdrop')]} onClick={commit} />
            <div className={style[bem.e('progress-editor')]} onClick={(e) => e.stopPropagation()}>
              <div
                ref={trackRef}
                className={style[bem.e('custom-slider-track')]}
                onClick={handleTrackClick}
              >
                <div
                  className={style[bem.e('custom-slider-fill')]}
                  style={{ width: `${Number(tempVal) || 0}%` }}
                />
                <div
                  className={style[bem.e('custom-slider-thumb')]}
                  style={{ left: `${Number(tempVal) || 0}%` }}
                />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                className={style[bem.e('progress-num-input')]}
                value={tempVal}
                onChange={(e) => {
                  let val = parseInt(e.target.value, 10);
                  if (isNaN(val)) val = 0;
                  setTempVal(Math.min(100, Math.max(0, val)));
                }}
                onBlur={commit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    commit();
                  }
                }}
              />
            </div>
          </>
        ) : column.type === 'multi' ? (
          <>
            <div className={style[bem.e('multi-backdrop')]} onClick={() => commit()} />
            <div className={style[bem.e('multi-editor-popover')]} onClick={e => e.stopPropagation()}>
              <div className={style[bem.e('multi-options-list')]}>
                {(column.options || []).map(opt => {
                  const isChecked = activeMultiList.includes(opt.label);
                  return (
                    <div
                      key={opt.id}
                      className={`${style[bem.e('multi-option-item')]} ${isChecked ? style['is-active'] : ''}`}
                      onClick={() => {
                        const next = isChecked
                          ? activeMultiList.filter(v => v !== opt.label)
                          : [...activeMultiList, opt.label];
                        setTempVal(next);
                      }}
                    >
                      <div className={`${style[bem.e('multi-check-box')]} ${isChecked ? style['is-checked'] : ''}`}>
                        {isChecked && <CheckIcon sx={{ fontSize: 10 }} />}
                      </div>
                      <span
                        className={style[bem.e('multi-tag-badge')]}
                        style={{ backgroundColor: opt.color || '#e2e8f0' }}
                      >
                        {opt.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button className={style[bem.e('multi-commit-btn')]} onClick={() => commit()}>
                完成
              </button>
            </div>
          </>
        ) : (
          <input
            ref={inputRef}
            type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
            className={style[bem.e('input')]}
            value={tempVal}
            onChange={(e) => setTempVal(e.target.value)}
            onBlur={() => commit()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                inputRef.current?.blur();
              }
            }}
          />
        )
      ) : (
        <div className={style[bem.e('content-wrap')]}>
          {renderContent()}
        </div>
      )}
    </div>
  );
}

export default Cell;
