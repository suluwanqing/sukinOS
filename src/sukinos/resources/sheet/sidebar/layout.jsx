import React, { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { selectorUserInfo } from "@/sukinos/store";
import { useSelector } from 'react-redux';
import Logo from "@/component/logo/layout";

const bem = createNamespace('br-sidebar');

function Sidebar({ store }) {
  const { state, dispatch, confirmAction } = store;
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const userInfo = useSelector(selectorUserInfo);

  const handleAddTable = () => {
    const newId = `tbl_${Math.random().toString(36).substr(2, 9)}`;
    dispatch({
      type: 'ADD_TABLE',
      payload: {
        schema: {
          id: newId,
          name: '未命名表格',
          columns: [
            { id: `col_${Math.random().toString(36).substr(2, 9)}`, name: '主要字段', type: 'text', width: 200, defaultValue: '', sortable: true }
          ]
        },
        records: []
      }
    });
  };

  const handleDelete = (e, t) => {
    e.stopPropagation();
    confirmAction('删除表格', `确认要删除表格 "${t.name}" 吗？此操作无法撤销。`, () => {
      dispatch({ type: 'DELETE_TABLE', payload: t.id });
    });
  };

  const startRename = (e, t) => {
    e.stopPropagation();
    setEditingId(t.id);
    setEditName(t.name);
  };

  const handleSaveRename = (tId) => {
    if (editName.trim()) {
      dispatch({
        type: 'RENAME_TABLE',
        payload: { tableId: tId, name: editName.trim() }
      });
    }
    setEditingId(null);
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <Logo size={50} style={{ marginRight: 8 }} />
        <span className={style[bem.e('ws-name')]}>{userInfo?.username || '未登录'}</span>
      </div>

      <div className={style[bem.e('body')]}>
        <div className={style[bem.e('section-top')]}>
          <div className={style[bem.e('sec-header')]}>
            <div className={style[bem.e('sec-title')]}>
              <TableChartOutlinedIcon sx={{ fontSize: 18 }} className={style[bem.e('item-icon')]} />
              数据表管理
            </div>
            <button className={style[bem.e('sec-add')]} onClick={handleAddTable} title="新建表格">
              <AddIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        <div className={style[bem.e('scrollable-list')]}>
          {state.tables.map(t => {
            const isActive = state.activeTableId === t.id && state.activeTab === t.id;
            const isEditing = editingId === t.id;
            return (
              <div
                key={t.id}
                onClick={() => {
                  if (!isEditing) {
                    dispatch({ type: 'SET_ACTIVE_TABLE', payload: t.id });
                  }
                }}
                className={`${style[bem.e('item')]} ${isActive ? style['is-active'] : ''}`}
              >
                {isEditing ? (
                  <input
                    className={style[bem.e('rename-input')]}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveRename(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveRename(t.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div className={style[bem.e('item-left')]} onDoubleClick={(e) => startRename(e, t)}>
                    <TableChartOutlinedIcon className={style[bem.e('item-icon')]} sx={{ fontSize: 18 }} />
                    <span className={style[bem.e('item-name')]} title="双击重命名">{t.name}</span>
                  </div>
                )}
                {!isEditing && (
                  <button
                    onClick={(e) => handleDelete(e, t)}
                    className={style[bem.e('item-del')]}
                    title="删除"
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className={style[bem.e('section-bottom')]}>
          <div
            className={`${style[bem.e('item')]} ${state.activeTab === 'presets' ? style['is-active'] : ''}`}
            onClick={() => dispatch({ type: 'OPEN_PRESETS_TAB' })}
            style={{ marginBottom: 4 }}
          >
            <div className={style[bem.e('item-left')]}>
              <ViewColumnIcon className={style[bem.e('item-icon')]} sx={{ fontSize: 18 }} />
              <span className={style[bem.e('item-name')]}>预制列管理</span>
            </div>
          </div>
          <div
            className={`${style[bem.e('item')]} ${state.activeTab === 'manual' ? style['is-active'] : ''}`}
            onClick={() => dispatch({ type: 'OPEN_MANUAL_TAB' })}
          >
            <div className={style[bem.e('item-left')]}>
              <HelpOutlineIcon className={style[bem.e('item-icon')]} sx={{ fontSize: 18 }} />
              <span className={style[bem.e('item-name')]}>使用手册</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
