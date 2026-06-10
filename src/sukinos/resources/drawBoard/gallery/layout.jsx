import React, { useEffect, useState, useCallback } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { listBoards, putBoard, getBoard, deleteBoard, uid } from '../db';

const bem = createNamespace('draw-board-gallery');

const Gallery = ({ state, dispatch, navigate }) => {
  const [confirmDel, setConfirmDel] = useState(null);
  const [alertMsg, setAlertMsg] = useState('');
  const [renamingId, setRenamingId] = useState(null);

  const reload = useCallback(async () => {
    const boards = await listBoards();
    boards.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    dispatch({ type: 'LOAD_BOARDS', payload: boards });
  }, [dispatch]);

  useEffect(() => {
    reload();
  }, [reload]);

  const handleCreate = async () => {
    const id = uid();
    await putBoard({ id, name: '未命名画板', createdAt: Date.now(), updatedAt: Date.now(), elements: [], thumbnail: null });
    dispatch({ type: 'SET_ACTIVE_BOARD', payload: id });
    dispatch({ type: 'LOAD_SCENE', payload: [] });
    navigate('canvas');
  };

  const handleOpen = async (b) => {
    const fresh = await getBoard(b.id);
    dispatch({ type: 'SET_ACTIVE_BOARD', payload: b.id });
    dispatch({ type: 'LOAD_SCENE', payload: fresh?.elements || [] });
    navigate('canvas');
  };

  const handleRename = async (id, name) => {
    const b = await getBoard(id);
    if (b) {
      b.name = name || '未命名画板';
      b.updatedAt = Date.now();
      await putBoard(b);
      reload();
    }
    setRenamingId(null);
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    await deleteBoard(confirmDel.id);
    setConfirmDel(null);
    reload();
  };

  const handleDuplicate = async (e, bId) => {
    e.stopPropagation();
    const b = await getBoard(bId);
    if (!b) return;
    await putBoard({ ...b, id: uid(), name: b.name + ' (副本)', createdAt: Date.now(), updatedAt: Date.now() });
    reload();
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        await putBoard({ id: uid(), name: data.name || file.name.replace(/\.json$/, ''), createdAt: Date.now(), updatedAt: Date.now(), elements: Array.isArray(data.elements) ? data.elements : [], thumbnail: null });
        reload();
      } catch (err) {
        setAlertMsg('JSON 解析失败：' + err.message);
      }
    };
    input.click();
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('head')]}>
        <div>
          <div className={style[bem.e('title')]}>我的画板</div>
          <div className={style[bem.e('sub')]}>已存 {state.boards.length} 个 · 画板</div>
        </div>
        <div className={style[bem.e('actions')]}>
          <button className={style[bem.e('btn')]} onClick={handleImport}>导入 JSON</button>
          <button className={[style[bem.e('btn')], style[bem.em('btn', 'primary')]].join(' ')} onClick={handleCreate}>新建画板</button>
        </div>
      </div>
      {state.boards.length === 0 ? (
        <div className={style[bem.e('empty')]}>
          <svg viewBox="0 0 56 56" fill="none">
            <rect x="6" y="10" width="36" height="32" rx="4" stroke="#d0d7de" strokeWidth="2" />
            <path d="M14 10V7a4 4 0 0 1 4-4h18a4 4 0 0 1 4-4v26L32 26l-5 7 3-14-8 5 2-10-10 8 2-9z" stroke="#d0d7de" strokeWidth="1.5" strokeLinejoin="round" />
            <circle cx="34" cy="34" r="3.5" stroke="#d0d7de" strokeWidth="1.5" />
            <path d="M44 20l6-6M48 24l4 4" stroke="#d0d7de" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          </svg>
          这里空空如也，点击「新建画板」开始创作吧
        </div>
      ) : (
        <div className={style[bem.e('grid')]}>
          {state.boards.map((b) => (
            <div key={b.id} className={style[bem.e('card')]}>
              <div className={style[bem.e('thumb')]} onClick={() => handleOpen(b)}>
                {b.thumbnail ? <img src={b.thumbnail} alt={b.name} /> : null}
                <svg viewBox="0 0 24 24"><path d="M12 19l7-7 3 3-7 7-3-3z" /><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" /><path d="M2 2l7.586 7.586" /><circle cx="11" cy="11" r="2" /></svg>
              </div>
              <div className={style[bem.e('card-body')]}>
                {renamingId === b.id ? (
                  <input className={style[bem.e('name')]} autoFocus defaultValue={b.name} onBlur={(e) => handleRename(b.id, e.target.value.trim())} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') setRenamingId(null); }} />
                ) : (
                  <div className={style[bem.e('name')]} onClick={() => handleOpen(b)} title={b.name}>{b.name}</div>
                )}
                <div className={style[bem.e('meta')]}>{new Date(b.updatedAt).toLocaleDateString()} {new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className={style[bem.e('row-btns')]}>
                  <button className={style[bem.e('icon-btn')]} onClick={(e) => { e.stopPropagation(); setRenamingId(b.id); }}>编辑</button>
                  <button className={style[bem.e('icon-btn')]} onClick={(e) => handleDuplicate(e, b.id)}>复制</button>
                  <button className={style[bem.e('icon-btn')]} onClick={async (e) => {
                    e.stopPropagation();
                    const fresh = await getBoard(b.id);
                    if (!fresh?.elements?.length) return;
                    if (fresh.thumbnail) {
                      const img = new Image();
                      img.onload = () => {
                        const ec = document.createElement('canvas');
                        ec.width = img.naturalWidth || img.width || 800;
                        ec.height = img.naturalHeight || img.height || 500;
                        const cx = ec.getContext('2d');
                        cx.fillStyle = '#ffffff';
                        cx.fillRect(0, 0, ec.width, ec.height);
                        cx.drawImage(img, 0, 0);
                        const a = document.createElement('a');
                        a.href = ec.toDataURL('image/png');
                        a.download = (b.name || 'board') + '.png';
                        a.click();
                      };
                      img.src = fresh.thumbnail;
                    } else {
                      const ec = document.createElement('canvas');
                      ec.width = 800;
                      ec.height = 500;
                      const cx = ec.getContext('2d');
                      cx.fillStyle = '#ffffff';
                      cx.fillRect(0, 0, 800, 500);
                      const a = document.createElement('a');
                      a.href = ec.toDataURL('image/png');
                      a.download = (b.name || 'board') + '.png';
                      a.click();
                    }
                  }}>导出</button>
                  <button className={[style[bem.e('icon-btn')], style[bem.em('icon-btn', 'danger')]].join(' ')} onClick={(e) => { e.stopPropagation(); setConfirmDel(b); }}>删除</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmDel && (
        <div className={style[bem.e('modal-mask')]} onClick={() => setConfirmDel(null)}>
          <div className={style[bem.e('modal')]} onClick={(e) => e.stopPropagation()}>
            <h3>删除画板</h3><p>确定要删除「{confirmDel.name}」吗？此操作不可恢复。</p>
            <div className={style[bem.e('modal-btns')]}><button className={style[bem.e('btn')]} onClick={() => setConfirmDel(null)}>取消</button><button className={[style[bem.e('btn')], style[bem.em('btn', 'danger')]].join(' ')} onClick={handleDelete}>确定删除</button></div>
          </div>
        </div>
      )}
      {alertMsg && (
        <div className={style[bem.e('modal-mask')]} onClick={() => setAlertMsg('')}>
          <div className={style[bem.e('modal')]} onClick={(e) => e.stopPropagation()}>
            <h3>提示</h3><p>{alertMsg}</p>
            <div className={style[bem.e('modal-btns')]}><button className={[style[bem.e('btn')], style[bem.em('btn', 'primary')]].join(' ')} onClick={() => setAlertMsg('')}>确定</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(Gallery);
