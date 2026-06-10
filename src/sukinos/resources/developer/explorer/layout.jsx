import { useState, useRef, useEffect } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncIcon from '@mui/icons-material/Sync';
import ComputerIcon from '@mui/icons-material/Computer';
import { FileType } from "@/sukinos/utils/config";
import { alert } from '@/component/alert/layout'
import { confirm } from '@/component/confirm/layout';

const bem = createNamespace('explorer');

function Explorer({
  files, setFiles, activeFile, setActiveFile, isMapped, unsavedFiles, triggerVfsSave,
  physicalFiles, setPhysicalFiles,
  vfs, workspaceDirId, setWorkspaceDirId, workspacePathStr, setWorkspacePathStr,
  isAutoSave, setIsAutoSave, showWorkspaceModal, setShowWorkspaceModal, showImportModal, setShowImportModal,
  loadWorkspaceFiles, fsMode, setFsMode, setIsMapped
}) {

  const handleAddFile = () => {
    confirm.show({
      title: '新建 JSX 组件',
      content: '请输入文件名称：',
      showInput: true,
      inputPlaceholder: 'Page.jsx',
      onConfirm: (name) => {
        if (!name) return;
        const fileName = name.endsWith('.jsx') ? name : `${name}.jsx`;
        if (fileName.toLowerCase() === 'logic.jsx') { alert.warning('保留字'); return; }
        if (files[fileName]) { alert.warning('已存在'); return; }
        const initialCode = `export default ({ state, dispatch }) => <div>New Page: ${fileName}</div>`;
        setFiles(prev => ({ ...prev, [fileName]: initialCode }));
        setActiveFile(fileName);
        triggerVfsSave(fileName, initialCode, true);
      }
    });
  };

  const handleDeleteFile = (fileName, e) => {
    e.stopPropagation();
    if (fileName === 'layout.jsx') return;
    let shouldDeleteSource = false;
    const CustomConfirmContent = () => (
      <div>
        <p>移除 <strong>{fileName}</strong> 映射？</p>
        <label><input type="checkbox" onChange={(e) => { shouldDeleteSource = e.target.checked; }} /> 同时删除物理介质文件</label>
      </div>
    );

    confirm.show({
      title: '移除文件',
      children: <CustomConfirmContent />,
      onConfirm: async () => {
        if (shouldDeleteSource) {
           const target = physicalFiles.get(fileName.toLowerCase());
           if (target) await vfs.operation.handleDelete({ id: target.id, name: target.name, parentId: workspaceDirId });
        }
        const newFiles = { ...files }; delete newFiles[fileName]; setFiles(newFiles);
        if (activeFile === fileName) setActiveFile('layout.jsx');
      }
    });
  };

  const handleToggleFsMode = () => {
    const targetMode = fsMode === 'virtual' ? 'local' : 'virtual';
    confirm.show({
      title: '切换存储',
      content: `确定切换至 ${targetMode === 'local' ? '本地模式' : '虚拟模式'}？这会重置当前开发工作区内容。`,
      onConfirm: () => { setFsMode(targetMode); alert.success(`已切换: ${targetMode}`); }
    });
  };

  const openWorkspaceModal = () => { vfs.navigation.loadDir(workspaceDirId); setShowWorkspaceModal(true); };

  // 确认按钮逻辑
  const confirmWorkspace = async () => {
    const targetDirId = vfs.state.currentId;
    if (!targetDirId) return;

    // 先保存持久化记忆
    localStorage.setItem(`dev_center_workspace_dir_${fsMode}`, targetDirId);

    // 更新目录 ID。
    // 由于 Developer 中的重置 Effect 现在只看 fsMode，
    // 所以这一步不会误触发 setFiles({}) 和 setIsMapped(false)。
    setWorkspaceDirId(targetDirId);
    setWorkspacePathStr(vfs.state.breadcrumbs.map(b => b.name === 'root' ? '' : b.name).join('/') || '/');

    // 最后明确开启映射标记。
    // 这将触发 Developer 的 items 监听器，开始准时解析新目录下的文件。
    setIsMapped(true);
    setShowWorkspaceModal(false);
    alert.success("映射成功");
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('header')]}>
        <span className={style[bem.e('title')]}>资源管理器</span>
        <div className={style[bem.e('actions')]}>
          <button className={style[bem.e('icon-btn')]} onClick={handleToggleFsMode} title={fsMode === 'local' ? '本地模式' : '虚拟模式'}>
              {fsMode === 'local' ? <ComputerIcon style={{fontSize: 16, color: 'var(--su-primary)'}}/> : <SyncIcon style={{fontSize: 16}}/>}
          </button>
        </div>
      </div>

      {!isMapped ? (
        <div className={style[bem.e('unmapped-state')]}>
          <FolderOpenIcon style={{fontSize: 48, color: 'var(--su-gray-300)', marginBottom: 8}} />
          <button className={style[bem.e('modal-action-btn')]} onClick={openWorkspaceModal} style={{margin: '0 auto'}}>
            {fsMode === 'local' ? '选择本地目录' : '选择工作区目录'}
          </button>
        </div>
      ) : (
        <>
          <div className={style[bem.e('mapping')]}>
            <div className={style[bem.e('mapping-header')]}>
               <span style={{fontSize:'10px'}}>WORKSPACE ({fsMode.toUpperCase()})</span>
               <div className={style[bem.e('actions')]}>
                 <button className={style[bem.e('icon-btn')]} onClick={openWorkspaceModal} title="重选"><SettingsIcon fontSize="small" /></button>
                 {/* <button className={style[bem.e('icon-btn')]} onClick={() => setShowImportModal(true)} title="导入"><FileDownloadIcon fontSize="small" /></button> */}
                 <button className={style[bem.e('icon-btn')]} onClick={handleAddFile} title="新建"><AddIcon fontSize="small" /></button>
               </div>
            </div>
            <div className={style[bem.e('mapping-body')]}>
              <div className={style[bem.e('mapping-info')]} title={workspacePathStr}>
                   <FolderOpenIcon style={{fontSize: 16, color: '#f59e0b'}}/>
                   <span className={style[bem.e('mapping-path-text')]}>{workspacePathStr}</span>
              </div>
              <label className={style[bem.e('mapping-toggle')]}>
                   <input type="checkbox" checked={isAutoSave} onChange={e => setIsAutoSave(e.target.checked)} />
                   <SyncIcon style={{ fontSize: 14, color: isAutoSave ? 'var(--su-primary)' : 'var(--su-gray-400)' }}/>
                   实时自动保存
              </label>
            </div>
          </div>
          <div className={style[bem.e('file-list')]}>
            {Object.keys(files).map(fileName => (
              <div key={fileName} className={[style[bem.e('file-item')], style[bem.is('active', activeFile === fileName)]].join(' ')} onClick={() => setActiveFile(fileName)}>
                <div className={style[bem.e('file-info')]}>
                    <DescriptionIcon style={{ fontSize: 16 }} />
                    <span className={style[bem.e('file-text')]}>{fileName}</span>
                    {unsavedFiles.has(fileName) && <span className={style[bem.e('unsaved-dot')]}></span>}
                </div>
                {fileName !== 'layout.jsx' && (<span className={style[bem.e('file-delete')]} onClick={(e) => handleDeleteFile(fileName, e)}><CloseIcon style={{ fontSize: 14 }} /></span>)}
              </div>
            ))}
          </div>
        </>
      )}

      {showWorkspaceModal && (
        <div className={style[bem.e('modal-overlay')]} onClick={() => setShowWorkspaceModal(false)}>
          <div className={style[bem.e('modal')]} onClick={e => e.stopPropagation()}>
            <div className={style[bem.e('modal-header')]}>
                <span className={style[bem.e('modal-title')]}>选择工作区目录</span>
                <button className={style[bem.e('modal-close')]} onClick={() => setShowWorkspaceModal(false)}><CloseIcon fontSize="small"/></button>
            </div>
            <div className={style[bem.e('modal-toolbar')]}>
                <button className={style[bem.e('modal-action-btn')]} onClick={vfs.navigation.handleBack} disabled={vfs.state.history.length <= 1}><ArrowBackIcon style={{ fontSize: 14 }} /> 返回</button>
                <div className={style[bem.e('modal-path-container')]}>
                    <span className={style[bem.e('modal-path')]}>{vfs.state.breadcrumbs.map(b => b.name === 'root' ? '' : b.name).join(' / ') || '/'}</span>
                </div>
            </div>
            <div className={style[bem.e('modal-body')]}>
                {vfs.state.items.filter(i => i.type === FileType.DIRECTORY).map(item => (
                    <div key={item.id} className={style[bem.e('fs-item')]} onClick={() => vfs.navigation.loadDir(item.id)}>
                        <FolderOpenIcon style={{ fontSize: 18, color: '#f59e0b' }} />
                        <span>{item.name}</span>
                    </div>
                ))}
            </div>
            <div className={style[bem.e('modal-footer')]}>
                <button className={style[bem.e('btn-confirm')]} onClick={confirmWorkspace}>确认关联此目录</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Explorer;
