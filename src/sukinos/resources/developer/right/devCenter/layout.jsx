import { useEffect, useRef, useCallback, useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
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
  // 动态存储 Editor 组件和加载状态
  const [EditorComponent, setEditorComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 使用 Ref 追踪最新的保存所需上下文，避免 keydown 监听器因输入变化而频繁重新注册
  const saveStateRef = useRef({ activeFile, files, logicCode, triggerVfsSave, isMapped, unsavedFiles });

  // 动态加载 Monaco Editor
  useEffect(() => {
    let isMounted = true;

    const loadMonacoEditor = async () => {
      try {
        setIsLoading(true);

        // 动态导入 @monaco-editor/react
        const monacoReact = await import('@monaco-editor/react');

        // 动态导入 monaco-editor 核心并配置 loader
        const monaco = await import('monaco-editor');

        // 配置 loader，必须在 Editor 组件使用前配置
        monacoReact.loader.config({
          monaco: monaco.default || monaco
        });

        if (isMounted) {
          setEditorComponent(() => monacoReact.default);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load Monaco Editor:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMonacoEditor();

    return () => {
      isMounted = false;
    };
  }, []); // 只在组件挂载时加载一次

  useEffect(() => {
    saveStateRef.current = { activeFile, files, logicCode, triggerVfsSave, isMapped, unsavedFiles };
  }, [activeFile, files, logicCode, triggerVfsSave, isMapped, unsavedFiles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const { activeFile, files, logicCode, triggerVfsSave, isMapped, unsavedFiles } = saveStateRef.current;

        if (!isMapped) return;
        e.preventDefault();

        // 如果视图文件有改动，执行物理保存
        if (activeFile && unsavedFiles.has(activeFile) && files[activeFile] !== undefined) {
          triggerVfsSave(activeFile, files[activeFile], true);
        }

        // 如果 Logic 有改动，执行物理保存
        if (unsavedFiles.has('Logic.jsx')) {
          triggerVfsSave('Logic.jsx', logicCode, true);
        }
      }
    };

    // 监听器仅在组件挂载时注册一次，提供极佳的输入流畅度
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 记忆化编辑器回调，避免不必要的重新计算
  const onEditorChange = useCallback((v) => {
    handleContentChange(activeFile, v || '');
  }, [handleContentChange, activeFile]);

  const onLogicEditorChange = useCallback((v) => {
    handleContentChange('Logic.jsx', v || '');
  }, [handleContentChange]);

  // 加载中显示占位内容
  if (isLoading) {
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
            <div style={{ padding: '12px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              编辑器加载中...
            </div>
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
            <div style={{ padding: '12px', color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              编辑器加载中...
            </div>
          </div>
        </div>
      </div>
    );
  }

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
          {isMapped && EditorComponent ? (
            // 直接使用官方内置的 loading，删掉了所有的 Suspense 和 Ready 状态
            <EditorComponent
              key={activeFile}
              language="javascript"
              value={files[activeFile] || ''}
              options={editorOptions}
              theme="light"
              onChange={onEditorChange}
              loading={<div style={{ padding: '12px', color: '#999' }}>编辑器加载中...</div>}
            />
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
          {isMapped && EditorComponent ? (
            <EditorComponent
              language="javascript"
              theme="light"
              value={logicCode}
              options={editorOptions}
              onChange={onLogicEditorChange}
              loading={<div style={{ padding: '12px', color: '#999' }}>编辑器加载中...</div>}
            />
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
