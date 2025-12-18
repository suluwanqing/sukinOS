import React, { useState, useEffect } from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';
import fs, { FileType } from '@/utils/file/fileKernel';
import FolderIcon from '@mui/icons-material/Folder';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
const bem = createNamespace('save-modal');
const SaveModal = ({ visible, onClose, onConfirm }) => {
  const [fileName, setFileName] = useState('file.txt');
  // 导航状态
  const [currentDirId, setCurrentDirId] = useState('root');
  const [folderItems, setFolderItems] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [history, setHistory] = useState(['root']); // 历史栈，用于后退导航

  // 初始化或重置
  useEffect(() => {
    if (visible) {
      setCurrentDirId('root');
      setHistory(['root']);
      setFileName('new_file.txt');
      loadDir('root');
    }
  }, [visible]);

  // 监听当前目录变化，加载数据
  useEffect(() => {
    if(visible) {
      loadDir(currentDirId);
    }
  }, [currentDirId, visible]);

  const loadDir = (id) => {
    // 获取当前目录下的所有内容
    const allItems = fs.readdir(id);
    // 只筛选出文件夹 (因为我们是要保存文件进去，不是去打开文件)
    const dirs = allItems.filter(item => item.type === FileType.DIRECTORY);
    setFolderItems(dirs);

    // 获取面包屑路径 (用于显示当前位置)
    const path = fs.getPath(id);
    setBreadcrumbs(path);
  };

  // 进入文件夹
  const handleEnterFolder = (folderId) => {
    setHistory(prev => [...prev, folderId]);
    setCurrentDirId(folderId);
  };

  // 返回上一级
  const handleBack = () => {
    if (history.length <= 1) return;
    const newHistory = [...history];
    newHistory.pop(); // 移除当前
    const prevId = newHistory[newHistory.length - 1];
    setHistory(newHistory);
    setCurrentDirId(prevId);
  };

  const handleSave = () => {
    if (!fileName.trim()) return;
    // 确认保存：传入文件名 和 当前目录ID
    onConfirm(fileName, currentDirId);
  };

  if (!visible) return null;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('container')]}>
        <div className={style[bem.e('header')]}>
          另存为
        </div>

        <div className={style[bem.e('nav-bar')]}>
          <button
            className={style[bem.e('back-btn')]}
            onClick={handleBack}
            disabled={history.length <= 1}
            title="返回上一级"
          >
            <ArrowBackIcon fontSize="small" />
          </button>

          <div className={style[bem.e('breadcrumbs')]}>
            {breadcrumbs.map((crumb, index) => (
              <span key={crumb.id} className={style[bem.e('crumb')]}>
                {index === 0 && <HomeIcon style={{fontSize: 14, marginRight: 2, marginBottom: -2}}/>}
                <span
                  className={style[bem.e('crumb-text')]}
                  onClick={() => {
                    // 点击面包屑跳转逻辑 (可选，简单起见这里只允许点击上一级)
                    // 如果需要完整跳转，需要重构 history 逻辑，这里暂略
                  }}
                >
                  {crumb.name}
                </span>
                {index < breadcrumbs.length - 1 && <span className={style[bem.e('sep')]}>/</span>}
              </span>
            ))}
          </div>
        </div>


        <div className={style[bem.e('body')]}>
          {folderItems.length === 0 ? (
            <div className={style[bem.e('empty')]}>此处无文件夹</div>
          ) : (
            <div className={style[bem.e('list')]}>
              {folderItems.map(folder => (
                <div
                  key={folder.id}
                  className={style[bem.e('folder-item')]}
                  onClick={() => handleEnterFolder(folder.id)}
                  title={folder.name}
                >
                  <FolderIcon className={style[bem.e('folder-icon')]} />
                  <span className={style[bem.e('folder-name')]}>{folder.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>


        <div className={style[bem.e('footer-input-area')]}>
            <div className={style[bem.e('input-group')]}>
              <label>文件名:</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              />
            </div>
        </div>


        <div className={style[bem.e('footer-actions')]}>
          <button className={style[bem.e('btn-cancel')]} onClick={onClose}>取消</button>
          <button className={style[bem.e('btn-confirm')]} onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SaveModal);
