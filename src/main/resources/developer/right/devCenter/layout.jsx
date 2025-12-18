import React, { useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '@/utils/js/classcreate';
import Editor from '@monaco-editor/react';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import TabIcon from '@mui/icons-material/Tab';
const bem = createNamespace('dev-center');

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  wordWrap: 'on',
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  fontFamily: "'Cascadia Code', 'Consolas', monospace"
};

function DevCenter({
  files,
  setFiles,
  activeFile,
  setActiveFile,
  logicCode,
  onLogicCodeChange
}) {
  const [newFileName, setNewFileName] = useState('');
  const [isAddingFile, setIsAddingFile] = useState(false);

  const handleAddFile = () => {
    if (isAddingFile && newFileName) {
      const fileName = newFileName.endsWith('.jsx') ? newFileName : `${newFileName}.jsx`;
      if (files[fileName]) {
        alert('文件已存在!');
        return;
      }
      setFiles(prev => ({
        ...prev,
        [fileName]: `export default ({ state, dispatch }) => <div>New Page: ${fileName}</div>`
      }));
      setActiveFile(fileName);
      setNewFileName('');
      setIsAddingFile(false);
    } else {
      setIsAddingFile(true);
    }
  };

  const handleDeleteFile = (fileName, e) => {
    e.stopPropagation();
    if (fileName === 'layout.jsx') return;
    const newFiles = { ...files };
    delete newFiles[fileName];
    setFiles(newFiles);
    if (activeFile === fileName) {
      setActiveFile('layout.jsx');
    }
  };

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('editor-container')]}>
        <div className={style[bem.e('view-editor')]}>
          <div className={style[bem.e('editor-header')]}>
            <div className={style[bem.e('tabs-scroll')]}>
              {Object.keys(files).map(fileName => (
                <div
                  key={fileName}
                  className={[style[bem.e('tab')], style[bem.is('active',activeFile === fileName)]].join(' ')}
                  onClick={() => setActiveFile(fileName)}
                >
                  <TabIcon style={{ fontSize: 14, marginRight: 4 }} />
                  {fileName}
                  {fileName !== 'layout.jsx' && (
                    <span
                      className={style[bem.e('tab-close')]}
                      onClick={(e) => handleDeleteFile(fileName, e)}
                    >
                      <CloseIcon style={{ fontSize: 12 }} />
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className={style[bem.e('add-file')]}>
              {isAddingFile && (
                <input
                  autoFocus
                  className={style[bem.e('filename-input')]}
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  onBlur={() => { if (!newFileName) setIsAddingFile(false); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddFile(); }}
                  placeholder="Page Name"
                />
              )}
              <button className={style[bem.e('add-btn')]} onClick={handleAddFile}>
                <AddIcon style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>

          <div className={style[bem.e('editor-frame')]}>
            <Editor
              key={activeFile}
              language="javascript"
              theme="vs-dark"
              value={files[activeFile] || ''}
              options={editorOptions}
              onChange={v => setFiles(prev => ({ ...prev, [activeFile]: v || '' }))}
            />
          </div>
        </div>

        <div className={style[bem.e('logic-editor')]}>
          <div className={style[bem.e('editor-header')]}>
            <span className={style[bem.e('file-name')]}>Logic.jsx</span>
            <span className={style[bem.e('file-badge')]}>状态管理</span>
          </div>
          <div className={style[bem.e('editor-frame')]}>
            <Editor
              language="javascript"
              theme="vs-dark"
              value={logicCode}
              options={editorOptions}
              onChange={v => onLogicCodeChange(v || '')}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevCenter;
