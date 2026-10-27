import React, { useEffect, useState } from 'react';
export default function TextEditor({ content, onChange, language = 'plaintext', readOnly = false }) {
  const [EditorComponent, setEditorComponent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    let isMounted = true;

    const loadMonacoEditor = async () => {
      try {
        setIsLoading(true);
        const monacoReact = await import('@monaco-editor/react');
        const monaco = await import('monaco-editor');
        monacoReact.loader.config({
          monaco: monaco.default || monaco
        });

        if (isMounted) {
          setEditorComponent(() => monacoReact.default);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load Monaco Editor in TextEditor:', error);
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
  const safeValue = typeof content === 'object' && content !== null
    ? JSON.stringify(content, null, 2)
    : (content !== undefined && content !== null ? String(content) : '');
  if (isLoading || !EditorComponent) {
    return (
      <div className="w-full h-full relative bg-white flex items-center justify-center text-slate-400 text-xs">
        编辑器加载中...
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-white">
      <EditorComponent
        height="100%"
        theme="vs"
        language={language}
        value={safeValue}
        onChange={onChange}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 13,
          fontFamily: "'Fira Code', 'Consolas', monospace",
          fontLigatures: true,
          smoothScrolling: true,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 12, bottom: 12 },
          renderLineHighlight: 'all',
          lineNumbersMinChars: 3
        }}
        loading={<div className="flex items-center justify-center h-full text-slate-400 text-xs">编辑器加载中...</div>}
      />
    </div>
  );
}
