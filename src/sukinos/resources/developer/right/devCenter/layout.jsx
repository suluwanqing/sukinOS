import { useEffect, useRef, useCallback, useState } from 'react';
import style from './style.module.css';
import { createNamespace } from '/utils/js/classcreate';
import { FileText as DescriptionIcon, X as CloseIcon } from 'lucide-react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useViewportMode } from '@/sukinos/hooks/useViewportMode';
import { canEditContent, toEditorValue, getEditorLanguage } from '../../editorSupport';

const bem = createNamespace('dev-center');

// 标签项：桌面整项可拖拽（阈值 6px 保证单击仍切换），移动端只保留单击与横向滚动
function EditorTab({ path, isActive, unsaved, onSelect, onClose, draggable = true }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: path, disabled: !draggable });
  const nodeRef = useRef(null);

  useEffect(() => {
    if (isActive) nodeRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [isActive]);

  const setRef = useCallback((node) => {
    nodeRef.current = node;
    setNodeRef(node);
  }, [setNodeRef]);

  const tabClass = [
    style[bem.e(isActive ? 'editor-tab-active' : 'editor-tab')],
    isDragging ? style[bem.e('editor-tab-dragging')] : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={setRef}
      title={path}
      className={tabClass}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => onSelect(path)}
      {...(draggable ? attributes : null)}
      {...listeners}
    >
      <DescriptionIcon size={14} style={{ color: isActive ? '#0ea5e9' : '#909399', flex: '0 0 auto' }} />
      <span className={style[bem.e('tab-name')]}>{path.split('/').pop()}</span>
      {unsaved && <span className={style[bem.e('unsaved-dot')]} title="已修改"></span>}
      <span
        className={style[bem.e('tab-close')]}
        title="关闭"
        onClick={(e) => { e.stopPropagation(); onClose(path); }}
      >
        <CloseIcon size={12} />
      </span>
    </div>
  );
}


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


const mobileEditorOptions = {
  ...editorOptions,
  fontSize: 15,
  lineHeight: 22,
  folding: false,
  lineNumbersMinChars: 3,
  padding: { top: 8, bottom: 8 }
};

function DevCenter({ files, activeFile, openFiles = [], openFile, closeFile, reorderOpenFiles, handleContentChange, triggerVfsSave, isMapped, unsavedFiles }) {
  const { isMobile } = useViewportMode();
  // 动态存储 Editor 组件和加载状态
  const [EditorComponent, setEditorComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  // 关闭标签时销毁对应模型需要 monaco 命名空间
  const monacoRef = useRef(null);

  // 使用 Ref 追踪最新的保存所需上下文，避免 keydown 监听器因输入变化而频繁重新注册
  const saveStateRef = useRef({ activeFile, files, triggerVfsSave, isMapped, unsavedFiles });

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
        const monacoInstance = monaco.default || monaco;
        monacoRef.current = monacoInstance;

        // 配置 loader，必须在 Editor 组件使用前配置
        monacoReact.loader.config({
          monaco: monacoInstance
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
    saveStateRef.current = { activeFile, files, triggerVfsSave, isMapped, unsavedFiles };
  }, [activeFile, files, triggerVfsSave, isMapped, unsavedFiles]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const { activeFile, files, triggerVfsSave, isMapped, unsavedFiles } = saveStateRef.current;

        if (!isMapped) return;
        e.preventDefault();

        // 如果当前文件有改动，执行物理保存
        if (activeFile && unsavedFiles.has(activeFile) && files[activeFile] !== undefined) {
          triggerVfsSave(activeFile, files[activeFile], true);
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

  // 关闭标签后销毁其模型（Effect 在提交后运行，此时若已切走模型则安全）
  const prevTabsRef = useRef(openFiles);
  useEffect(() => {
    const removed = prevTabsRef.current.filter(p => !openFiles.includes(p));
    prevTabsRef.current = openFiles;
    const monaco = monacoRef.current;
    if (!monaco || removed.length === 0) return;
    for (const p of removed) monaco.editor.getModel(monaco.Uri.parse(p))?.dispose();
  }, [openFiles]);

  // 标签栏没有可见滚动条：竖向滚轮转成横向滚动
  const tabBarRef = useRef(null);
  useEffect(() => {
    const el = tabBarRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // 触控板横向手势保持原生
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isLoading]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleTabDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    reorderOpenFiles?.(active.id, over.id);
  }, [reorderOpenFiles]);

  const activeContent = activeFile ? files[activeFile] : undefined;
  const editable = canEditContent(activeContent);
  const editorValue = editable ? toEditorValue(activeContent) : '';

  const editorTabs = (
    <div ref={tabBarRef} className={style[bem.e('editor-tabs')]}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTabDragEnd}>
        <SortableContext items={openFiles} strategy={horizontalListSortingStrategy}>
          {openFiles.map((path) => (
            <EditorTab
              key={path}
              path={path}
              isActive={path === activeFile}
              unsaved={unsavedFiles.has(path)}
              draggable={!isMobile}
              onSelect={openFile}
              onClose={closeFile}
            />
          ))}
        </SortableContext>
      </DndContext>
      {openFiles.length === 0 && <span className={style[bem.e('tab-empty')]}>未打开文件</span>}
    </div>
  );

  // 加载中显示占位内容
  if (isLoading) {
    return (
      <div className={style[bem.b()]}>
        <div className={style[bem.e('view-editor')]}>
          {editorTabs}
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
        {editorTabs}
        <div className={style[bem.e('editor-frame')]}>
          {isMapped && EditorComponent ? (
            activeFile && editable ? (
              // path 用于按文件复用 Monaco 模型：切换标签保留撤销栈与 viewState
              <EditorComponent
                path={activeFile}
                language={getEditorLanguage(activeFile)}
                value={editorValue}
                options={isMobile ? mobileEditorOptions : editorOptions}
                theme="light"
                onChange={onEditorChange}
                loading={<div style={{ padding: '12px', color: '#999' }}>编辑器加载中...</div>}
              />
            ) : (
              <div className={style[bem.e('unsupported')]}>
                <div className={style[bem.e('unsupported-title')]}>
                  {activeFile ? '暂不支持打开该文件' : '未选择文件'}
                </div>
                {activeFile ? (
                  <>
                    <div className={style[bem.e('unsupported-path')]}>{activeFile}</div>
                    <div>编辑器仅支持代码与文本文件，二进制资源请在文件管理器中查看或导出</div>
                  </>
                ) : (
                  <div>请从左侧资源管理器打开一个文件</div>
                )}
              </div>
            )
          ) : (
             <div style={{display:'flex', height:'100%', alignItems:'center', justifyContent:'center', color:'#999'}}>
               ← 请先在左侧选择工作区文件夹
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DevCenter;
