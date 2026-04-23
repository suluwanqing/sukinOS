import { useEffect } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import Editor from '@monaco-editor/react';
import DescriptionIcon from '@mui/icons-material/Description';

const bem = createNamespace('dev-center');

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  fontFamily: "'Cascadia Code', 'Consolas', monospace",
  jsx: 'react'
};

function DevCenter({ files, activeFile, logicCode, handleContentChange, triggerVfsSave, isMapped, unsavedFiles }) {

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isMapped) return;

        let hasChanges = false;
        // 如果视图文件有改动，执行物理保存
        if (activeFile && unsavedFiles.has(activeFile) && files[activeFile] !== undefined) {
          triggerVfsSave(activeFile, files[activeFile], true);
          hasChanges = true;
        }

        // 如果 Logic 有改动，执行物理保存
        if (unsavedFiles.has('Logic.jsx')) {
          triggerVfsSave('Logic.jsx', logicCode, true);
          hasChanges = true;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, files, logicCode, triggerVfsSave, isMapped, unsavedFiles]);

  const onEditorChange = (v) => {
    handleContentChange(activeFile, v || '');
  };

  const onLogicEditorChange = (v) => {
    handleContentChange('Logic.jsx', v || '');
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('view-editor')]}>
        <div className={style[bem.e('editor-tabs')]}>
          <div className={style[bem.e('editor-tab-active')]}>
            <DescriptionIcon style={{ fontSize: 14, marginRight: 6, color: 'var(--su-primary-500)' }} />
            {activeFile || '未选择文件'}
            {unsavedFiles.has(activeFile) && <span className={style[bem.e('unsaved-dot')]} title="已修改"></span>}
          </div>
        </div>
        <div className={style[bem.e('editor-frame')]}>
          {isMapped ? (
             <Editor key={activeFile} language="javascript" value={files[activeFile] || ''}
              options={editorOptions} theme="light" onChange={onEditorChange} />
          ) : (
             <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#999'}}>
               ← 请先在左侧选择工作区文件夹
             </div>
          )}
        </div>
      </div>
      <div className={style[bem.e('logic-editor')]}>
        <div className={style[bem.e('editor-tabs')]}>
          <div className={style[bem.e('editor-tab-active')]}>
            <DescriptionIcon style={{ fontSize: 14, marginRight: 6, color: 'var(--su-yellow-500)' }} />
            Logic.jsx
            <span className={style[bem.e('file-badge')]}>业务控制</span>
            {unsavedFiles.has('Logic.jsx') && <span className={style[bem.e('unsaved-dot')]} title="已修改"></span>}
          </div>
        </div>
        <div className={style[bem.e('editor-frame')]}>
          {isMapped ? (
            <Editor language="javascript" theme="light" value={logicCode} options={editorOptions} onChange={onLogicEditorChange} />
          ) : (
            <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#999'}}>
               请先在左侧选择工作区文件夹
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default DevCenter;
