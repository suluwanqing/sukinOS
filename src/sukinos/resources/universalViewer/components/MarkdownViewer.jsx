import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import TextEditor from './TextEditor';
import { Eye, Edit3 } from 'lucide-react';
import style from '../style.module.css';

export default function MarkdownViewer({ content, onChange, readOnly = false }) {
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
          onClick={() => setMode('edit')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition ${
            mode === 'edit' ? 'bg-white shadow-xs font-semibold text-slate-800' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Edit3 size={13} className="text-pink-600" />
          <span>编辑</span>
        </button>
      </div>

      <div className="flex-1 w-full h-full overflow-hidden">
        {mode === 'preview' ? (
          <div className={`w-full h-full overflow-auto p-10 bg-white ${style.scroll}`}>
            <article className="max-w-4xl mx-auto prose prose-slate prose-headings:font-semibold prose-a:text-cyan-600 prose-img:rounded-xl">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {content}
              </ReactMarkdown>
            </article>
          </div>
        ) : (
          <TextEditor
            content={content}
            language="markdown"
            onChange={onChange}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}
