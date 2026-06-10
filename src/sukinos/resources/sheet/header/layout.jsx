import React, { useState, useRef, useEffect } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import Input from '@/component/input/layout';

const bem = createNamespace('br-header');

function Header({ store }) {
  const { state, dispatch, activeTable, activeConfig, exportData, importData } = store;
  const [showHidePanel, setShowHidePanel] = useState(false);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  const fileInputRef = useRef(null);
  const hidePanelRef = useRef(null);
  const exportPanelRef = useRef(null);

  useEffect(() => {
    if (activeTable) {
      setEditName(activeTable.name);
    }
  }, [activeTable]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (hidePanelRef.current && !hidePanelRef.current.contains(e.target)) {
        setShowHidePanel(false);
      }
      if (exportPanelRef.current && !exportPanelRef.current.contains(e.target)) {
        setShowExportPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveName = () => {
    setIsEditingName(false);
    if (activeTable && editName.trim() && editName.trim() !== activeTable.name) {
      dispatch({
        type: 'RENAME_TABLE',
        payload: { tableId: activeTable.id, name: editName.trim() }
      });
    }
  };

  const toggleHide = (colId) => {
    if (!activeTable) return;
    const current = activeConfig.hiddenFields || [];
    const next = current.includes(colId) ? current.filter(id => id !== colId) : [...current, colId];
    dispatch({ type: 'UPDATE_CONFIG', payload: { tableId: activeTable.id, key: 'hiddenFields', value: next } });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) importData(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSwitchView = (viewType) => {
    if (activeTable) {
      dispatch({ type: 'UPDATE_CONFIG', payload: { tableId: activeTable.id, key: 'viewType', value: viewType } });
    }
  };

  const activeViewType = activeConfig.viewType || 'grid';

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('top')]}>
        {isEditingName ? (
          <input
            className={style[bem.e('rename-input')]}
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveName();
              if (e.key === 'Escape') {
                setIsEditingName(false);
                setEditName(activeTable.name);
              }
            }}
            autoFocus
          />
        ) : (
          <div
            className={style[bem.e('title')]}
            onDoubleClick={() => { if (activeTable) setIsEditingName(true); }}
            title="双击编辑名称"
          >
            {activeTable ? activeTable.name : '未选择表格'}
          </div>
        )}

        <div className={style[bem.e('actions')]}>
          <input
            type="file"
            accept=".csv,.json"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button className={style[bem.e('btn')]} onClick={() => fileInputRef.current?.click()}>
            <UploadIcon sx={{ fontSize: 16, marginRight: '4px' }} />
            导入
          </button>

          <div className={style[bem.e('dropdown-wrap')]} ref={exportPanelRef}>
            <button className={style[bem.e('btn')]} onClick={() => setShowExportPanel(!showExportPanel)}>
              <DownloadIcon sx={{ fontSize: 16, marginRight: '4px' }} />
              导出
            </button>
            {showExportPanel && (
              <div className={style[bem.e('dropdown')]}>
                <div className={style[bem.e('drop-item')]} onClick={() => { exportData('csv'); setShowExportPanel(false); }}>导出为 CSV</div>
                <div className={style[bem.e('drop-item')]} onClick={() => { exportData('json'); setShowExportPanel(false); }}>导出为 JSON</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={style[bem.e('bottom')]}>
        <div className={style[bem.e('view-tabs')]}>
          <div
            className={`${style[bem.e('tab')]} ${activeViewType === 'grid' ? style['is-active'] : ''}`}
            onClick={() => handleSwitchView('grid')}
          >
            表格视图
          </div>
          <div
            className={`${style[bem.e('tab')]} ${activeViewType === 'card' ? style['is-active'] : ''}`}
            onClick={() => handleSwitchView('card')}
          >
            看板卡片
          </div>
          <div
            className={`${style[bem.e('tab')]} ${activeViewType === 'chart' ? style['is-active'] : ''}`}
            onClick={() => handleSwitchView('chart')}
          >
            统计图表
          </div>
        </div>

        <div className={style[bem.e('toolbar')]}>
          <div className={style[bem.e('dropdown-wrap')]} ref={hidePanelRef}>
            <button
              className={`${style[bem.e('tool-btn')]} ${showHidePanel ? style['is-active'] : ''}`}
              onClick={() => setShowHidePanel(!showHidePanel)}
            >
              <ViewColumnIcon sx={{ fontSize: 16, marginRight: '4px' }} />
              显示列
            </button>
            {showHidePanel && (
              <div className={`${style[bem.e('dropdown')]} ${style['dropdown-lg']}`}>
                <div className={style[bem.e('drop-title')]}>勾选显示列</div>
                <div className={style[bem.e('drop-list')]}>
                  {activeTable?.columns.map(col => {
                    const isHidden = (activeConfig.hiddenFields || []).includes(col.id);
                    return (
                      <label key={col.id} className={style[bem.e('check-item')]} onClick={(e) => { e.preventDefault(); toggleHide(col.id); }}>
                        <div className={`${style[bem.e('checkbox')]} ${!isHidden ? style['is-checked'] : ''}`}>
                          {!isHidden && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span>{col.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className={style[bem.e('search')]}>
            <Input
              value={activeConfig.search || ''}
              onChange={(e) => {
                if (activeTable) {
                  dispatch({ type: 'UPDATE_CONFIG', payload: { tableId: activeTable.id, key: 'search', value: e.target.value } });
                }
              }}
              placeholder="搜索记录..."
              clearable
              prefixIcon={<SearchIcon style={{ fontSize: 16, color: '#94a3b8' }} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Header;
