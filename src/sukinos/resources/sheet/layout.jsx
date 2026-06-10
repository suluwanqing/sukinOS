import React, { useMemo, useState, useEffect, useRef } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import Sidebar from './sidebar/layout';
import Header from './header/layout';
import GridView from './grid/layout';
import ManualView from './manual/layout';
import PresetColumnsView from './presets/layout';
import CloseIcon from '@mui/icons-material/Close';
import { getSheetState, putSheetState } from './db';
import useWheelToHorizontalScroll from '@/sukinos/hooks/useWheelToHorizontalScroll';

const bem = createNamespace('br-app');

function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentCell = '';
  let insideQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (insideQuotes) {
      if (char === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell);
        currentCell = '';
      } else if (char === '\n' || char === '\r') {
        currentRow.push(currentCell);
        rows.push(currentRow);
        currentRow = [];
        currentCell = '';
        if (char === '\r' && text[i + 1] === '\n') i++;
      } else {
        currentCell += char;
      }
    }
  }
  if (currentCell !== '' || currentRow.length > 0) {
    currentRow.push(currentCell);
    rows.push(currentRow);
  }
  return rows.filter(r => r.length > 0 && r.some(c => c.trim() !== ''));
}

export function ConfirmModal({ visible, title, content, onConfirm, onCancel }) {
  if (!visible) return null;
  return (
    <div className={style[bem.e('overlay')]}>
      <div className={style[bem.e('confirm-box')]}>
        <div className={style[bem.e('confirm-title')]}>{title}</div>
        <div className={style[bem.e('confirm-content')]}>{content}</div>
        <div className={style[bem.e('confirm-actions')]}>
          <button className={style[bem.e('btn-cancel')]} onClick={onCancel}>取消</button>
          <button className={style[bem.e('btn-danger')]} onClick={onConfirm}>确认</button>
        </div>
      </div>
    </div>
  );
}

function BaserowApp({ state, dispatch }) {
  const [dbLoaded, setDbLoaded] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const tabsScrollRef = useRef(null);

  useWheelToHorizontalScroll(tabsScrollRef, {
    enabled: true,
    speed: 1.2,
    smoothing: 0.8,
    preventDefault: true,
    ratio: 2,
  });

  useEffect(() => {
    let active = true;
    async function initLoad() {
      try {
        const saved = await getSheetState();
        if (saved && active) {
          dispatch({ type: 'LOAD_STATE', payload: saved });
        }
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setDbLoaded(true);
      }
    }
    initLoad();
    return () => { active = false; };
  }, [dispatch]);

  useEffect(() => {
    if (dbLoaded && state) {
      putSheetState(state).catch(e => console.error(e));
    }
  }, [state, dbLoaded]);

  const activeTable = useMemo(() => state.tables.find(t => t.id === state.activeTableId), [state.tables, state.activeTableId]);
  const activeRecords = useMemo(() => state.records[state.activeTableId] || [], [state.records, state.activeTableId]);
  const activeConfig = useMemo(() => state.configs[state.activeTableId] || { viewType: 'grid', hiddenFields: [], search: '', sortKey: null, sortDir: 'asc', expandedRows: [] }, [state.configs, state.activeTableId]);

  const [confirmState, setConfirmState] = useState({ visible: false, title: '', content: '', action: null });

  const confirmAction = (title, content, action) => {
    setConfirmState({ visible: true, title, content, action });
  };

  const flattenTree = (records, expandedRows, level = 0, parentId = null) => {
    let result = [];
    records.forEach(rec => {
      const isExpanded = expandedRows.includes(rec.id);
      const hasChildren = rec.children && rec.children.length > 0;
      result.push({ ...rec, _level: level, _isExpanded: isExpanded, _hasChildren: hasChildren, _parentId: parentId });
      if (isExpanded && hasChildren) {
        result = result.concat(flattenTree(rec.children, expandedRows, level + 1, rec.id));
      }
    });
    return result;
  };

  const processedRecords = useMemo(() => {
    let res = flattenTree(activeRecords, activeConfig.expandedRows || []);
    if (activeConfig.search) {
      const q = activeConfig.search.toLowerCase();
      res = res.filter(r =>
        Object.values(r).some(val => String(val).toLowerCase().includes(q))
      );
    }
    if (activeConfig.sortKey) {
      res.sort((a, b) => {
        const valA = a[activeConfig.sortKey];
        const valB = b[activeConfig.sortKey];
        if (valA < valB) return activeConfig.sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return activeConfig.sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return res;
  }, [activeRecords, activeConfig]);

  const exportData = (format) => {
    if (!activeTable) return;
    let content = '';
    let type = '';
    let ext = '';

    const plainRecords = processedRecords;

    if (format === 'csv') {
      const header = activeTable.columns.map(c => `"${c.name.replace(/"/g, '""')}"`).join(',');
      const rows = plainRecords.map(r => {
        return activeTable.columns.map(c => {
          const val = r[c.id] === undefined || r[c.id] === null ? '' : String(r[c.id]);
          return `"${val.replace(/"/g, '""')}"`;
        }).join(',');
      });
      content = '\uFEFF' + [header, ...rows].join('\n');
      type = 'text/csv;charset=utf-8;';
      ext = 'csv';
    } else {
      const exportReady = plainRecords.map(r => {
        const obj = {};
        activeTable.columns.forEach(c => { obj[c.name] = r[c.id]; });
        return obj;
      });
      content = JSON.stringify(exportReady, null, 2);
      type = 'application/json;charset=utf-8;';
      ext = 'json';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeTable.name}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (file) => {
    const reader = new FileReader();
    const ext = file.name.split('.').pop().toLowerCase();

    reader.onload = (e) => {
      const text = e.target.result;
      const newTableId = `tbl_${Math.random().toString(36).substr(2, 9)}`;
      let columns = [];
      let newRecords = [];

      if (ext === 'csv') {
        const parsedRows = parseCSV(text);
        if (parsedRows.length < 2) return;
        columns = parsedRows[0].map((h, i) => ({
          id: `col_${Math.random().toString(36).substr(2, 9)}`,
          name: h.trim() || `列 ${i + 1}`,
          type: 'text',
          width: 150,
          defaultValue: '',
          sortable: true
        }));
        for (let i = 1; i < parsedRows.length; i++) {
          const record = { id: `rec_${Math.random().toString(36).substr(2, 9)}`, children: [] };
          columns.forEach((c, index) => { record[c.id] = parsedRows[i][index] || ''; });
          newRecords.push(record);
        }
      } else if (ext === 'json') {
        const data = JSON.parse(text);
        if (!Array.isArray(data) || data.length === 0) return;
        const keys = Object.keys(data[0]).filter(k => k !== 'children');
        columns = keys.map(k => ({
          id: `col_${Math.random().toString(36).substr(2, 9)}`,
          name: k,
          type: typeof data[0][k] === 'number' ? 'number' : 'text',
          width: 150,
          defaultValue: '',
          sortable: true
        }));
        newRecords = data.map(item => {
          const record = { id: `rec_${Math.random().toString(36).substr(2, 9)}`, children: item.children || [] };
          columns.forEach(c => { record[c.id] = item[c.name] || ''; });
          return record;
        });
      }

      dispatch({
        type: 'IMPORT_DATA',
        payload: {
          schema: { id: newTableId, name: file.name.replace(/\.[^/.]+$/, "") || '导入数据', columns },
          records: newRecords
        }
      });
    };
    reader.readAsText(file);
  };

  const handleDragStart = (idx) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e, idx) => {
    e.preventDefault();
  };

  const handleDrop = (idx) => {
    if (draggedIdx !== null && draggedIdx !== idx) {
      dispatch({ type: 'REORDER_TABS', payload: { dragIndex: draggedIdx, hoverIndex: idx } });
    }
    setDraggedIdx(null);
  };

  const store = {
    state,
    dispatch,
    activeTable,
    activeConfig,
    processedRecords,
    exportData,
    importData,
    confirmAction
  };

  const currentTab = state.activeTab || 'tbl_init_1';

  return (
    <div className={style[bem.b()]}>
      <Sidebar store={store} />
      <div className={style[bem.e('main')]}>
        <div ref={tabsScrollRef} className={style[bem.e('tabs-bar')]}>
          {(state.openTabs || []).map((tabId, idx) => {
            const isTable = tabId.startsWith('tbl_');
            const tabName = isTable ? (state.tables.find(t => t.id === tabId)?.name || '新表格') : (tabId === 'presets' ? '预制列管理' : '使用手册');
            const isActive = currentTab === tabId;
            return (
              <div
                key={tabId}
                draggable="true"
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDrop(idx)}
                className={`${style[bem.e('tab')]} ${isActive ? style['is-active'] : ''}`}
                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tabId })}
              >
                <span>{tabName}</span>
                <button
                  className={style[bem.e('tab-close')]}
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch({ type: 'CLOSE_TAB', payload: tabId });
                  }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </button>
              </div>
            );
          })}
        </div>
        <div className={style[bem.e('tab-content-wrap')]}>
          {currentTab === 'manual' ? (
            <ManualView store={store} />
          ) : currentTab === 'presets' ? (
            <PresetColumnsView store={store} />
          ) : activeTable ? (
            <>
              <Header store={store} />
              <div className={style[bem.e('content')]}>
                <GridView store={store} />
              </div>
            </>
          ) : (
            <div className={style[bem.e('empty-state')]}>
              <h2>暂无打开的工作窗口</h2>
              <p>请在左侧新建或选择一个数据表，或者打开使用手册。</p>
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        visible={confirmState.visible}
        title={confirmState.title}
        content={confirmState.content}
        onCancel={() => setConfirmState({ ...confirmState, visible: false })}
        onConfirm={() => {
          if (confirmState.action) confirmState.action();
          setConfirmState({ ...confirmState, visible: false });
        }}
      />
    </div>
  );
}

export default BaserowApp;
