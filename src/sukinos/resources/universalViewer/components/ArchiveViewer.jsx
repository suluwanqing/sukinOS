import React from 'react';
import { Folder, File, HardDrive } from 'lucide-react';
import style from '../style.module.css';

const formatBytes = (bytes) => {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
};

export default function ArchiveViewer({ entries }) {
  return (
    <div className={`w-full h-full p-6 overflow-auto bg-slate-50 font-sans ${style.scroll}`}>
      <div className="flex items-center gap-2 mb-4 text-slate-500 border-b border-slate-200 pb-3">
        <HardDrive size={18} className="text-sky-500" />
        <span className="text-xs font-semibold text-slate-700 tracking-wide uppercase">归档目录列表 ({entries.length} 项)</span>
      </div>

      <div className="space-y-1">
        {entries.map((entry, index) => (
          <div
            key={index}
            className="flex items-center justify-between py-2 px-3.5 rounded-lg bg-white border border-slate-100 hover:border-slate-200 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm transition-all text-xs text-slate-600"
          >
            <div className="flex items-center gap-2.5 truncate max-w-xl">
              {entry.dir ? (
                <Folder size={16} className="text-amber-400 shrink-0" />
              ) : (
                <File size={16} className="text-sky-400 shrink-0" />
              )}
              <span className="font-mono truncate">{entry.path}</span>
            </div>
            {!entry.dir && (
              <span className="font-mono text-slate-400 shrink-0 ml-4 text-[11px]">
                {formatBytes(entry.size)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
