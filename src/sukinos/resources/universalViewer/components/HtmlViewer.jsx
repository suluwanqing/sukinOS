import React, { useState } from 'react';
import TextEditor from './TextEditor';
import { Eye, Code } from 'lucide-react';

export default function HtmlViewer({ content, onChange, readOnly = false }) {
  const [mode, setMode] = useState('preview');

  return (
    <div className="w-full h-full flex flex-col relative bg-white">
      <div className="absolute top-2 right-4 z-20 flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-xs">
        <button
          onClick={() => setMode('preview')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition ${
            mode === 'preview' ? 'bg-white shadow-xs font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eye size={13} className="text-cyan-600" />
          <span>预览</span>
        </button>
        <button
          onClick={() => setMode('code')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition ${
            mode === 'code' ? 'bg-white shadow-xs font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Code size={13} className="text-pink-600" />
          <span>源码</span>
        </button>
      </div>

      <div className="flex-1 w-full h-full overflow-hidden">
        {mode === 'preview' ? (
          <iframe
            srcDoc={content}
            title="HTML Preview"
            sandbox="allow-scripts allow-modals allow-forms allow-same-origin"
            className="w-full h-full border-none bg-white"
          />
        ) : (
          <TextEditor
            content={content}
            language="html"
            onChange={onChange}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}
