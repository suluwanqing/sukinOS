import React, { useState, useRef, useEffect, useCallback } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import CustomSelect from '../components/select/layout';
import Cell from '../cell/layout';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import TuneIcon from '@mui/icons-material/Tune';
import AddIcon from '@mui/icons-material/Add';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import DeleteIcon from '@mui/icons-material/Delete';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import useWheelToHorizontalScroll from '@/sukinos/hooks/useWheelToHorizontalScroll';

const bem = createNamespace('br-grid');

function SortableHeader({ column, store, onEditColumn }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: column.id });
  const { dispatch, activeTable, activeConfig } = store;

  const isSortable = column.sortable === true;

  const dndStyle = {
    transform: transform ? `translate3d(${transform.x}px, 0px, 0px)` : undefined,
    transition,
    width: `${column.width}px`,
    minWidth: `${column.width}px`,
    maxWidth: `${column.width}px`,
    zIndex: isDragging ? 50 : 10,
  };

  const handleSort = () => {
    if (!isSortable) return;
    const dir = activeConfig.sortKey === column.id && activeConfig.sortDir === 'asc' ? 'desc' : 'asc';
    dispatch({ type: 'UPDATE_CONFIG', payload: { tableId: activeTable.id, key: 'sortKey', value: column.id } });
    dispatch({ type: 'UPDATE_CONFIG', payload: { tableId: activeTable.id, key: 'sortDir', value: dir } });
  };

  const handleResize = (e) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = column.width;
    const onMouseMove = (moveEvent) => {
      const newWidth = Math.max(80, startWidth + (moveEvent.clientX - startX));
      dispatch({ type: 'UPDATE_COLUMN', payload: { tableId: activeTable.id, colId: column.id, data: { width: newWidth } } });
    };
    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = 'default';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'col-resize';
  };

  return (
    <th ref={setNodeRef} style={dndStyle} className={`${style[bem.e('th')]} ${isDragging ? style['is-dragging'] : ''}`}>
      <div className={style[bem.e('th-inner')]}>
        <div {...attributes} {...listeners} className={style[bem.e('th-drag')]} title="长按拖拽排序">
          <DragIndicatorIcon sx={{ fontSize: 16 }} />
        </div>
        <div
          className={style[bem.e('th-content')]}
          onClick={handleSort}
          title={isSortable ? "点击排序" : ""}
          style={{ cursor: isSortable ? 'pointer' : 'default' }}
        >
          <span className={style[bem.e('th-name')]} title={column.name}>{column.name}</span>
          {isSortable && activeConfig.sortKey === column.id && (
            <span className={style[bem.e('th-sort')]}>
              {activeConfig.sortDir === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </div>
        <div className={style[bem.e('th-setting')]} onClick={() => onEditColumn(column)} title="列设置">
          <TuneIcon sx={{ fontSize: 16 }} />
        </div>
      </div>
      <div className={style[bem.e('th-resize')]} onMouseDown={handleResize} />
    </th>
  );
}

function ColumnModal({ column, store, onClose, onSave, onDelete }) {
  const { state } = store;
  const isEdit = !!column;
  const [form, setForm] = useState({ name: '', type: 'text', defaultValue: '', options: [], trueLabel: '已完成', falseLabel: '未开始', sortable: false, _forceReset: false });
  const [showTypeDrop, setShowTypeDrop] = useState(false);
  const [showBoolDrop, setShowBoolDrop] = useState(false);
  const [showSelectDefaultDrop, setShowSelectDefaultDrop] = useState(false);
  const [showPresetDrop, setShowPresetDrop] = useState(false);

  const fieldTypes = [
    { label: '单行文本', value: 'text' },
    { label: '数字', value: 'number' },
    { label: '单选', value: 'select' },
    { label: '多选', value: 'multi' },
    { label: '复选框', value: 'boolean' },
    { label: '日期', value: 'date' },
    { label: '进度条', value: 'progress' }
  ];

  const booleanDefaults = [
    { label: '未选中', value: 'false' },
    { label: '选中', value: 'true' }
  ];

  const selectDefaults = [
    { label: '-- 无默认值 --', value: '' },
    ...(form.options || []).map(o => ({ label: o.label, value: o.label, color: o.color }))
  ];

  const presets = (state.presetColumns || []).filter(p => p.enabled !== false);
  const presetOptions = [
    { label: '-- 选择预制列配置 --', value: '' },
    ...presets.map(p => ({ label: p.name, value: p.id }))
  ];

  useEffect(() => {
    if (column) {
      setForm({
        trueLabel: '已完成',
        falseLabel: '未开始',
        sortable: false,
        _forceReset: false,
        ...column
      });
    } else {
      setForm({ name: '', type: 'text', defaultValue: '', options: [], trueLabel: '已完成', falseLabel: '未开始', sortable: false, _forceReset: false });
    }
  }, [column]);

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

  const handleSelectPreset = (presetId) => {
    const p = presets.find(x => x.id === presetId);
    if (p) {
      setForm({
        ...form,
        name: p.name,
        type: p.type,
        defaultValue: p.defaultValue !== undefined ? p.defaultValue : '',
        options: p.options || [],
        trueLabel: p.trueLabel || '已完成',
        falseLabel: p.falseLabel || '未开始',
        sortable: p.sortable === true,
        _forceReset: true
      });
    }
  };

  const addOption = () => {
    setForm(prev => ({
      ...prev,
      options: [...(prev.options || []), { id: `opt_${Date.now()}`, label: '新选项', color: '#e2e8f0' }]
    }));
  };

  const updateOption = (index, key, value) => {
    const newOps = [...(form.options || [])];
    newOps[index][key] = value;
    setForm(prev => ({ ...prev, options: newOps }));
  };

  const removeOption = (index) => {
    const newOps = [...(form.options || [])];
    newOps.splice(index, 1);
    setForm(prev => ({ ...prev, options: newOps }));
  };

  return (
    <div className={style[bem.e('modal-overlay')]} onClick={onClose}>
      <div className={style[bem.e('modal')]} onClick={e => e.stopPropagation()}>
        <div className={style[bem.e('modal-header')]}>
          <div className={style[bem.e('modal-title')]}>{isEdit ? '编辑列属性' : '新增列'}</div>
          {isEdit && (
            <button className={style[bem.e('modal-del-btn')]} onClick={() => onDelete(column.id)}>
              删除此列
            </button>
          )}
        </div>

        <div className={style[bem.e('modal-body')]}>
          <div className={style[bem.e('modal-col-left')]}>
            {presetOptions.length > 1 && (
              <div className={style[bem.e('form-group')]} style={{ marginBottom: 16 }}>
                <label>{isEdit ? '重置并导入预制列（将清除该列所有旧数据）' : '从预制列资源库快速填充'}</label>
                <div className={style[bem.e('custom-select-trigger-wrap')]}>
                  <div className={style[bem.e('select-trigger')]} onClick={() => setShowPresetDrop(!showPresetDrop)}>
                    <span>选择预制导入配置</span>
                    <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                  </div>
                  {showPresetDrop && (
                    <CustomSelect
                      options={presetOptions}
                      value=""
                      onCommit={(val) => {
                        handleSelectPreset(val);
                        setShowPresetDrop(false);
                      }}
                      onClose={() => setShowPresetDrop(false)}
                      showSearch={false}
                    />
                  )}
                </div>
              </div>
            )}

            <div className={style[bem.e('form-group')]}>
              <label>列名称</label>
              <input
                className={style[bem.e('input')]}
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="例如：状态"
                autoFocus
              />
            </div>

            <div className={style[bem.e('form-group')]}>
              <label>字段类型</label>
              <div className={style[bem.e('custom-select-trigger-wrap')]}>
                <div className={style[bem.e('select-trigger')]} onClick={() => setShowTypeDrop(!showTypeDrop)}>
                  <span title={fieldTypes.find(t => t.value === form.type)?.label || ''}>
                    {fieldTypes.find(t => t.value === form.type)?.label || '选择字段类型'}
                  </span>
                  <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                </div>
                {showTypeDrop && (
                  <CustomSelect
                    options={fieldTypes}
                    value={form.type}
                    onCommit={(val) => {
                      setForm(prev => ({
                        ...prev,
                        type: val,
                        defaultValue: val === 'boolean' ? false : val === 'progress' ? 0 : val === 'multi' ? [] : '',
                        options: (val === 'select' || val === 'multi') && !(prev.options?.length) ? [{ id: `opt_1`, label: '选项1', color: '#bfdbfe' }] : prev.options
                      }));
                      setShowTypeDrop(false);
                    }}
                    onClose={() => setShowTypeDrop(false)}
                    showSearch={false}
                  />
                )}
              </div>
            </div>

            <div className={style[bem.e('form-group')]}>
              <label>默认值</label>
              {form.type === 'boolean' ? (
                <div className={style[bem.e('custom-select-trigger-wrap')]}>
                  <div className={style[bem.e('select-trigger')]} onClick={() => setShowBoolDrop(!showBoolDrop)}>
                    <span title={form.defaultValue ? '选中' : '未选中'}>{form.defaultValue ? '选中' : '未选中'}</span>
                    <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                  </div>
                  {showBoolDrop && (
                    <CustomSelect
                      options={booleanDefaults}
                      value={String(form.defaultValue)}
                      onCommit={(val) => {
                        setForm(prev => ({ ...prev, defaultValue: val === 'true' }));
                        setShowBoolDrop(false);
                      }}
                      onClose={() => setShowBoolDrop(false)}
                      showSearch={false}
                    />
                  )}
                </div>
              ) : form.type === 'select' ? (
                <div className={style[bem.e('custom-select-trigger-wrap')]}>
                  <div className={style[bem.e('select-trigger')]} onClick={() => setShowSelectDefaultDrop(!showSelectDefaultDrop)}>
                    <span title={form.defaultValue || '-- 无默认值 --'}>{form.defaultValue || '-- 无默认值 --'}</span>
                    <ArrowDropDownIcon sx={{ fontSize: 18 }} />
                  </div>
                  {showSelectDefaultDrop && (
                    <CustomSelect
                      options={selectDefaults}
                      value={form.defaultValue}
                      onCommit={(val) => {
                        setForm(prev => ({ ...prev, defaultValue: val }));
                        setShowSelectDefaultDrop(false);
                      }}
                      onClose={() => setShowSelectDefaultDrop(false)}
                      showSearch={false}
                    />
                  )}
                </div>
              ) : form.type === 'multi' ? (
                <span className={style[bem.e('multi-default-tip')]}>多选默认值请在表格中直接选择</span>
              ) : form.type === 'progress' ? (
                <input
                  type="number"
                  min="0"
                  max="100"
                  className={style[bem.e('input')]}
                  value={form.defaultValue}
                  onChange={e => {
                    let val = parseInt(e.target.value, 10);
                    if (isNaN(val)) val = 0;
                    setForm({ ...form, defaultValue: Math.min(100, Math.max(0, val)) });
                  }}
                  placeholder="进度默认值 (0-100)"
                />
              ) : (
                <input
                  type={form.type === 'number' ? 'number' : form.type === 'date' ? 'date' : 'text'}
                  className={style[bem.e('input')]}
                  value={form.defaultValue}
                  onChange={e => setForm({ ...form, defaultValue: e.target.value })}
                  placeholder="留空即无默认值"
                />
              )}
            </div>

            <div className={style[bem.e('form-group-checkbox')]}>
              <label className={style[bem.e('checkbox-label')]}>
                <input
                  type="checkbox"
                  checked={form.sortable === true}
                  onChange={e => setForm({ ...form, sortable: e.target.checked })}
                />
                <span>允许该列进行数据排序</span>
              </label>
            </div>
          </div>

          {(form.type === 'select' || form.type === 'multi') && (
            <div className={style[bem.e('modal-col-right')]}>
              <label>选项列表</label>
              <div className={style[bem.e('options-list')]}>
                {(form.options || []).map((opt, idx) => (
                  <div key={opt.id} className={style[bem.e('option-item')]}>
                    <input
                      type="color"
                      className={style[bem.e('opt-color')]}
                      value={opt.color}
                      onChange={e => updateOption(idx, 'color', e.target.value)}
                    />
                    <input
                      className={style[bem.e('opt-input')]}
                      value={opt.label}
                      onChange={e => updateOption(idx, 'label', e.target.value)}
                    />
                    <button className={style[bem.e('opt-del')]} onClick={() => removeOption(idx)}>×</button>
                  </div>
                ))}
                <button className={style[bem.e('opt-add')]} onClick={addOption}>+ 添加选项</button>
              </div>
            </div>
          )}

          {form.type === 'boolean' && (
            <div className={style[bem.e('modal-col-right')]}>
              <div className={style[bem.e('form-group')]}>
                <label>选中状态自定义文本</label>
                <input
                  className={style[bem.e('input')]}
                  value={form.trueLabel || ''}
                  onChange={e => setForm({ ...form, trueLabel: e.target.value })}
                  placeholder="例如：已完成"
                />
              </div>
              <div className={style[bem.e('form-group')]}>
                <label>未选中状态自定义文本</label>
                <input
                  className={style[bem.e('input')]}
                  value={form.falseLabel || ''}
                  onChange={e => setForm({ ...form, falseLabel: e.target.value })}
                  placeholder="例如：未开始"
                />
              </div>
            </div>
          )}
        </div>

        <div className={style[bem.e('modal-footer')]}>
          <button className={style[bem.e('btn-cancel')]} onClick={onClose}>取消</button>
          <button className={style[bem.e('btn-save')]} onClick={handleSave}>保存修改</button>
        </div>
      </div>
    </div>
  );
}

function GridView({ store }) {
  const { dispatch, activeTable, processedRecords, activeConfig, confirmAction } = store;
  const [colModalState, setColModalState] = useState({ visible: false, column: null });
  const scrollAreaRef = useRef(null);
  const tbodyRef = useRef(null);
  const nonGridRef = useRef(null);

  const stopWheel = useCallback((e) => e.stopPropagation(), []);

  const setTbodyRef = useCallback((node) => {
    if (tbodyRef.current) {
      tbodyRef.current.removeEventListener('wheel', stopWheel);
    }
    if (node) {
      node.addEventListener('wheel', stopWheel, { passive: true });
    }
    tbodyRef.current = node;
  }, [stopWheel]);

  const setNonGridRef = useCallback((node) => {
    if (nonGridRef.current) {
      nonGridRef.current.removeEventListener('wheel', stopWheel);
    }
    if (node) {
      node.addEventListener('wheel', stopWheel, { passive: true });
    }
    nonGridRef.current = node;
  }, [stopWheel]);

  const viewType = activeConfig?.viewType || 'grid';

  useWheelToHorizontalScroll(scrollAreaRef, {
    enabled: viewType === 'grid',
    speed: 1.2,
    smoothing: 0.8,
    preventDefault: true,
    ratio: 2,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  if (!activeTable) return null;

  const visibleCols = activeTable.columns.filter(c => !(activeConfig.hiddenFields || []).includes(c.id));

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      dispatch({ type: 'REORDER_COLUMNS', payload: { tableId: activeTable.id, activeId: active.id, overId: over.id } });
    }
  };

  const handleAddRecord = (parentId = null) => {
    const record = { id: `rec_${Math.random().toString(36).substr(2, 9)}`, children: [] };
    activeTable.columns.forEach(c => {
      if (c.type === 'progress') {
        record[c.id] = c.defaultValue !== undefined && c.defaultValue !== '' ? Number(c.defaultValue) : 0;
      } else if (c.type === 'multi') {
        record[c.id] = c.defaultValue !== undefined && Array.isArray(c.defaultValue) ? c.defaultValue : [];
      } else {
        record[c.id] = c.defaultValue !== undefined && c.defaultValue !== '' ? c.defaultValue : (c.type === 'boolean' ? false : '');
      }
    });
    dispatch({ type: 'ADD_RECORD', payload: { tableId: activeTable.id, record, parentId } });
    if (parentId) {
      const expanded = activeConfig.expandedRows || [];
      if (!expanded.includes(parentId)) {
        dispatch({ type: 'UPDATE_CONFIG', payload: { tableId: activeTable.id, key: 'expandedRows', value: [...expanded, parentId] } });
      }
    }
  };

  const handleDeleteRecord = (recordId) => {
    confirmAction('删除行', '确认删除该行数据？如果包含子项也会一并删除。', () => {
      dispatch({ type: 'DELETE_RECORD', payload: { tableId: activeTable.id, recordId } });
    });
  };

  const handleSaveColumn = (formData) => {
    if (colModalState.column) {
      const originalType = colModalState.column.type;
      const forceReset = formData._forceReset;

      const { _forceReset, ...columnData } = formData;
      dispatch({ type: 'UPDATE_COLUMN', payload: { tableId: activeTable.id, colId: colModalState.column.id, data: columnData } });

      if (originalType !== formData.type || forceReset) {
        const defVal = formData.defaultValue !== undefined && formData.defaultValue !== ''
          ? formData.defaultValue
          : (formData.type === 'boolean' ? false : formData.type === 'progress' ? 0 : formData.type === 'multi' ? [] : '');

        processedRecords.forEach(rec => {
          dispatch({
            type: 'UPDATE_RECORD',
            payload: { tableId: activeTable.id, recordId: rec.id, fieldId: colModalState.column.id, value: defVal }
          });
        });
      }
    } else {
      const { _forceReset, ...columnData } = formData;
      const newCol = { id: `col_${Math.random().toString(36).substr(2, 9)}`, width: 160, ...columnData };
      dispatch({ type: 'ADD_COLUMN', payload: { tableId: activeTable.id, column: newCol } });
    }
    setColModalState({ visible: false, column: null });
  };

  const handleDeleteColumn = (colId) => {
    confirmAction('删除列', '确认删除该列及其所有数据？', () => {
      dispatch({ type: 'DELETE_COLUMN', payload: { tableId: activeTable.id, colId } });
      setColModalState({ visible: false, column: null });
    });
  };

  const getSum = (colId) => {
    let sum = 0;
    processedRecords.forEach(r => {
      const val = parseFloat(r[colId]);
      if (!isNaN(val)) sum += val;
    });
    return sum;
  };

  const getAvg = (colId) => {
    let sum = 0;
    let count = 0;
    processedRecords.forEach(r => {
      const val = parseFloat(r[colId]);
      if (!isNaN(val)) {
        sum += val;
        count++;
      }
    });
    return count > 0 ? (sum / count).toFixed(1) : 0;
  };

  const renderActiveView = () => {
    if (viewType === 'card') {
      const selectCol = activeTable.columns.find(c => c.type === 'select');
      return (
        <div className={style[bem.e('card-container')]} ref={setNonGridRef}>
          {processedRecords.map(rec => {
            let tagColor = '#e2e8f0';
            if (selectCol) {
              const selectVal = rec[selectCol.id];
              const opt = selectCol.options?.find(o => o.label === selectVal);
              if (opt) tagColor = opt.color;
            }
            return (
              <div key={rec.id} className={style[bem.e('kanban-card')]} style={{ borderLeft: `4px solid ${tagColor}` }}>
                <div className={style[bem.e('card-header')]}>
                  <span className={style[bem.e('card-title')]} title={rec[activeTable.columns[0]?.id] || '无标题'}>
                    {rec[activeTable.columns[0]?.id] || '无标题'}
                  </span>
                  <button className={style[bem.e('card-del-btn')]} onClick={() => handleDeleteRecord(rec.id)}>
                    <DeleteIcon sx={{ fontSize: 16 }} />
                  </button>
                </div>
                <div className={style[bem.e('card-body')]}>
                  {visibleCols.slice(1).map(col => {
                    const isSelect = col.type === 'select';
                    const isProgress = col.type === 'progress';
                    const isMulti = col.type === 'multi';
                    const rawVal = rec[col.id];

                    if (isProgress) {
                      return (
                        <div key={col.id} className={style[bem.e('card-field-row')]}>
                          <span className={style[bem.e('card-field-label')]}>{col.name}</span>
                          <div className={style[bem.e('card-field-progress')]}>
                            <div className={style[bem.e('card-progress-bar-bg')]}>
                              <div
                                className={style[bem.e('card-progress-bar-fg')]}
                                style={{ width: `${Math.min(100, Math.max(0, parseFloat(rawVal) || 0))}%` }}
                              />
                            </div>
                            <span className={style[bem.e('card-progress-text')]}>{parseFloat(rawVal) || 0}%</span>
                          </div>
                        </div>
                      );
                    }

                    if (isMulti) {
                      const list = Array.isArray(rawVal) ? rawVal : (rawVal ? String(rawVal).split(',') : []);
                      return (
                        <div key={col.id} className={style[bem.e('card-field-row-multitags')]}>
                          <span className={style[bem.e('card-field-label')]}>{col.name}</span>
                          <div className={style[bem.e('card-field-multitags-list')]}>
                            {list.map(v => {
                              const opt = col.options?.find(o => o.label === v);
                              return (
                                <span key={v} className={style[bem.e('card-multi-badge')]} style={{ backgroundColor: opt?.color || '#f1f5f9' }}>
                                  {v}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    let valToRender = String(rawVal !== undefined ? rawVal : '');
                    let customStyle = {};
                    if (isSelect && rawVal) {
                      const opt = col.options?.find(o => o.label === rawVal);
                      if (opt) {
                        customStyle = {
                          backgroundColor: opt.color,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          color: '#1e293b',
                          fontSize: '11px',
                          fontWeight: '500'
                        };
                      }
                    }
                    return (
                      <div key={col.id} className={style[bem.e('card-field-row')]}>
                        <span className={style[bem.e('card-field-label')]}>{col.name}</span>
                        <span className={style[bem.e('card-field-value')]} style={customStyle} title={valToRender}>
                          {valToRender}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className={style[bem.e('card-add-placeholder')]} onClick={() => handleAddRecord(null)}>
            <AddIcon sx={{ fontSize: 20 }} style={{ marginRight: '6px' }} />
            新建卡片
          </div>
        </div>
      );
    }

    if (viewType === 'chart') {
      const numCols = activeTable.columns.filter(c => c.type === 'number' || c.type === 'progress');
      const selectCol = activeTable.columns.find(c => c.type === 'select');

      if (numCols.length === 0) {
        return (
          <div className={style[bem.e('empty-state')]}>
            <h3>无数字或进度字段</h3>
            <p>请在表格中添加一个“数字”或“进度条”类型的列进行分析。</p>
          </div>
        );
      }

      const activeNumCol = numCols[0];
      const sum = getSum(activeNumCol.id);
      const avg = getAvg(activeNumCol.id);

      const statusDistribution = {};
      if (selectCol) {
        processedRecords.forEach(rec => {
          const sVal = rec[selectCol.id] || '未指定';
          statusDistribution[sVal] = (statusDistribution[sVal] || 0) + 1;
        });
      }

      const totalDistributionCount = Object.values(statusDistribution).reduce((a, b) => a + b, 0) || 1;
      let cumulativePercent = 0;

      return (
        <div className={style[bem.e('chart-container')]} ref={setNonGridRef}>
          <div className={style[bem.e('chart-header-info')]}>
            <h3>数据可视化画布 - {activeNumCol.name}</h3>
            <div className={style[bem.e('chart-stat-grid')]}>
              <div className={style[bem.e('stat-card')]}>
                <div className={style[bem.e('stat-label')]}>数据总和</div>
                <div className={style[bem.e('stat-val')]}>{sum}</div>
              </div>
              <div className={style[bem.e('stat-card')]}>
                <div className={style[bem.e('stat-label')]}>平均值</div>
                <div className={style[bem.e('stat-val')]}>{avg}</div>
              </div>
              <div className={style[bem.e('stat-card')]}>
                <div className={style[bem.e('stat-label')]}>样本数</div>
                <div className={style[bem.e('stat-val')]}>{processedRecords.length}</div>
              </div>
            </div>
          </div>

          <div className={style[bem.e('chart-visualization-row')]}>
            <div className={style[bem.e('chart-bars-visual')]}>
              <h4>{activeNumCol.name} 分布柱状图</h4>
              {processedRecords.map((rec, index) => {
                const val = parseFloat(rec[activeNumCol.id]) || 0;
                const maxVal = Math.max(...processedRecords.map(r => parseFloat(r[activeNumCol.id]) || 1), 1);
                const percent = Math.min(100, Math.max(5, (val / maxVal) * 100));
                const titleText = rec[activeTable.columns[0]?.id] || `记录 #${index + 1}`;

                return (
                  <div key={rec.id} className={style[bem.e('chart-bar-row')]}>
                    <div className={style[bem.e('chart-bar-row-label')]} title={titleText}>{titleText}</div>
                    <div className={style[bem.e('chart-bar-outer')]}>
                      <div className={style[bem.e('chart-bar-inner')]} style={{ width: `${percent}%` }} />
                    </div>
                    <div className={style[bem.e('chart-bar-val')]}>{val}</div>
                  </div>
                );
              })}
            </div>

            {selectCol && (
              <div className={style[bem.e('chart-donut-visual')]}>
                <h4>分类占比环形图 ({selectCol.name})</h4>
                <div className={style[bem.e('chart-donut-wrapper')]}>
                  <svg width="180" height="180" viewBox="0 0 42 42" className={style[bem.e('donut-svg')]}>
                    <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="4.2" />
                    {Object.keys(statusDistribution).map((statusKey, idx) => {
                      const count = statusDistribution[statusKey];
                      const percent = (count / totalDistributionCount) * 100;
                      const strokeDasharray = `${percent} ${100 - percent}`;
                      const strokeDashoffset = 100 - cumulativePercent + 25;
                      cumulativePercent += percent;

                      const opt = selectCol.options?.find(o => o.label === statusKey);
                      const strokeColor = opt?.color || '#94a3b8';

                      return (
                        <circle
                          key={statusKey}
                          cx="21"
                          cy="21"
                          r="15.91549430918954"
                          fill="transparent"
                          stroke={strokeColor}
                          strokeWidth="4.2"
                          strokeDasharray={strokeDasharray}
                          strokeDashoffset={strokeDashoffset}
                        />
                      );
                    })}
                  </svg>
                  <div className={style[bem.e('donut-center-text')]}>
                    <span className={style[bem.e('donut-total-count')]}>{totalDistributionCount}</span>
                    <span className={style[bem.e('donut-total-label')]}>总计条目</span>
                  </div>
                </div>

                <div className={style[bem.e('donut-legend')]}>
                  {Object.keys(statusDistribution).map(statusKey => {
                    const count = statusDistribution[statusKey];
                    const opt = selectCol.options?.find(o => o.label === statusKey);
                    const indicatorColor = opt?.color || '#94a3b8';
                    const percentageStr = ((count / totalDistributionCount) * 100).toFixed(0);

                    return (
                      <div key={statusKey} className={style[bem.e('legend-item')]}>
                        <div className={style[bem.e('legend-indicator')]} style={{ backgroundColor: indicatorColor }} />
                        <span className={style[bem.e('legend-text')]} title={statusKey}>{statusKey}</span>
                        <span className={style[bem.e('legend-val')]}>{count} ({percentageStr}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div ref={scrollAreaRef} className={style[bem.e('scroll-area')]}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className={style[bem.e('table')]}>
            <thead>
              <tr>
                <th className={style[bem.e('th-index')]} />
                <SortableContext items={visibleCols.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                  {visibleCols.map(col => (
                    <SortableHeader key={col.id} column={col} store={store} onEditColumn={(c) => setColModalState({ visible: true, column: c })} />
                  ))}
                </SortableContext>
                <th className={style[bem.e('th-add')]} onClick={() => setColModalState({ visible: true, column: null })} title="添加字段">
                  <AddIcon sx={{ fontSize: 16 }} />
                </th>
              </tr>
            </thead>
            <tbody ref={setTbodyRef}>
              {processedRecords.map((row, index) => (
                <tr key={row.id} className={style[bem.e('tr')]}>
                  <td className={style[bem.e('td-index')]}>
                    <div className={style[bem.e('row-actions')]}>
                      <span className={style[bem.e('row-num')]}>{index + 1}</span>
                      <div className={style[bem.e('row-btns')]}>
                        <button onClick={() => handleAddRecord(row.id)} title="添加子项">
                          <SubdirectoryArrowRightIcon sx={{ fontSize: 14 }} />
                        </button>
                        <button onClick={() => handleDeleteRecord(row.id)} title="删除行">
                          <DeleteIcon sx={{ fontSize: 14 }} />
                        </button>
                      </div>
                    </div>
                  </td>
                  {visibleCols.map((col, cIdx) => (
                    <td key={col.id} className={style[bem.e('td')]} style={{ width: `${col.width}px`, minWidth: `${col.width}px`, maxWidth: `${col.width}px` }}>
                      <Cell store={store} record={row} column={col} isFirstCol={cIdx === 0} />
                    </td>
                  ))}
                  <td className={style[bem.e('td-empty')]} />
                </tr>
              ))}
              <tr className={style[bem.e('tr-add')]} onClick={() => handleAddRecord(null)}>
                <td className={style[bem.e('td-index')]}>
                  <AddIcon sx={{ fontSize: 14 }} />
                </td>
                <td colSpan={visibleCols.length + 1} className={style[bem.e('td-add-text')]}>
                  点击新增首层级数据
                </td>
              </tr>
              <tr><td colSpan={visibleCols.length + 2} className={style[bem.e('td-filler')]} /></tr>
            </tbody>
          </table>
        </DndContext>
      </div>
    );
  };

  return (
    <div className={style[bem.b()]}>
      {renderActiveView()}

      <div className={style[bem.e('statusbar')]}>
        <span className={style[bem.e('status-item')]} title={`共计 ${processedRecords.length} 行`}>共 {processedRecords.length} 行数据</span>
        {visibleCols.map(col => {
          if (col.type === 'number' || col.type === 'progress') {
            const sum = getSum(col.id);
            const avg = getAvg(col.id);
            return (
              <span key={col.id} className={style[bem.e('status-item')]} title={`${col.name} 求和: ${sum} | 平均值: ${avg}`}>
                {col.name} (求和: {sum} | 均值: {avg})
              </span>
            );
          }
          return null;
        })}
      </div>

      {colModalState.visible && (
        <ColumnModal
          column={colModalState.column}
          store={store}
          onClose={() => setColModalState({ visible: false, column: null })}
          onSave={handleSaveColumn}
          onDelete={handleDeleteColumn}
        />
      )}
    </div>
  );
}

export default GridView;
