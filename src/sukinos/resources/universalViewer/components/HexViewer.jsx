import React from 'react';
import style from '../style.module.css';

export default function HexViewer({ bytes = [] }) {
  const rows = [];
  for (let i = 0; i < bytes.length; i += 16) {
    rows.push(bytes.slice(i, i + 16));
  }

  return (
    <div className={`w-full h-full p-6 overflow-auto bg-white font-mono text-xs select-text ${style.scroll}`}>
      <div className="text-slate-400 mb-4 pb-2 border-b border-slate-100 font-sans text-xs">
        HEX 调试模式 [前 {bytes.length} 字节]
      </div>
      <div className="space-y-1">
        {rows.map((row, rIdx) => {
          const offset = (rIdx * 16).toString(16).padStart(8, '0');
          const hexParts = row.map((b) => b.toString(16).padStart(2, '0').toUpperCase());
          const asciiParts = row.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'));

          return (
            <div key={rIdx} className="flex gap-6 hover:bg-slate-50 px-2 py-0.5 rounded transition-colors">
              <span className="text-slate-400 select-none">{offset}</span>
              <div className="flex gap-2 text-slate-700">
                <span>{hexParts.slice(0, 8).join(' ')}</span>
                <span className="text-slate-300">|</span>
                <span>{hexParts.slice(8, 16).join(' ')}</span>
              </div>
              <span className="text-sky-600 tracking-wider ml-auto select-none font-bold">{asciiParts.join('')}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
