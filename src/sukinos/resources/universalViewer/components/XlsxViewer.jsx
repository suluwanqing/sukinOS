import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Table as TableIcon,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import style from '../style.module.css';

const getColumnLabel = (index) => {
  let label = '';
  let num = index;
  while (num >= 0) {
    label = String.fromCharCode((num % 26) + 65) + label;
    num = Math.floor(num / 26) - 1;
  }
  return label;
};

export default function XlsxViewer({ arrayBuffer }) {
  const [workbook, setWorkbook] = useState(null);
  const [activeSheet, setActiveSheet] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);

  const containerRef = useRef(null);

  useEffect(() => {
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const wb = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
      setWorkbook(wb);
      if (wb.SheetNames && wb.SheetNames.length > 0) {
        setActiveSheet(wb.SheetNames[0]);
      }
    } catch (err) {
      setError(err?.message || '电子表格文件解析失败');
    } finally {
      setLoading(false);
    }
  }, [arrayBuffer]);

  const sheetData = useMemo(() => {
    if (!workbook || !activeSheet) return [];
    const worksheet = workbook.Sheets[activeSheet];
    if (!worksheet) return [];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  }, [workbook, activeSheet]);

  const maxCols = useMemo(() => {
    if (!sheetData || sheetData.length === 0) return 0;
    return sheetData.reduce((max, row) => Math.max(max, Array.isArray(row) ? row.length : 0), 0);
  }, [sheetData]);

  const handleZoomIn = () => setScale((prev) => Math.min(Number((prev + 0.1).toFixed(2)), 2.0));
  const handleZoomOut = () => setScale((prev) => Math.max(Number((prev - 0.1).toFixed(2)), 0.5));
  const handleResetZoom = () => setScale(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onNativeWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setScale((prev) => Math.min(Math.max(Number((prev + delta).toFixed(2)), 0.5), 2.0));
      }
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col bg-slate-100 overflow-hidden relative select-text"
    >
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 z-30 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
            <TableIcon size={16} className="text-emerald-600" />
            <span>电子表格预览</span>
          </div>

          {workbook && workbook.SheetNames.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto max-w-md px-1 py-0.5 bg-slate-50 border border-slate-200 rounded-md">
              {workbook.SheetNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setActiveSheet(name)}
                  className={`px-3 py-1 rounded text-xs transition whitespace-nowrap ${
                    activeSheet === name
                      ? 'bg-emerald-600 text-white font-medium shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-600">
          <button
            onClick={handleZoomOut}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
            title="缩小"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-mono font-semibold min-w-12 text-center text-slate-700">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
            title="放大"
          >
            <ZoomIn size={15} />
          </button>
          <div className="w-px h-3.5 bg-slate-200 mx-1.5" />
          <button
            onClick={handleResetZoom}
            className="p-1.5 hover:bg-slate-100 rounded text-slate-600 transition"
            title="还原 100%"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className={`flex-1 w-full h-full overflow-auto bg-slate-100 ${style.scroll}`}>
        {loading && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <RefreshCw className="animate-spin text-emerald-500" size={26} />
            <span className="text-xs font-medium">解析表格中...</span>
          </div>
        )}

        {error && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-rose-500 text-center">
            <AlertCircle size={28} />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        )}

        {!loading && !error && sheetData.length === 0 && (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            当前工作表无数据
          </div>
        )}

        {!loading && !error && sheetData.length > 0 && (
          <div
            style={{
              zoom: scale,
            }}
            className="inline-block min-w-max bg-white"
          >
            <table className="border-collapse text-xs table-auto w-max">
              <thead>
                <tr className="bg-slate-100 sticky top-0 z-20 shadow-xs">
                  <th className="w-14 min-w-14 max-w-14 border border-slate-300 py-1 px-2 bg-slate-200 text-center text-slate-500 font-mono text-[11px] select-none sticky left-0 z-30">
                    #
                  </th>
                  {Array.from({ length: maxCols }).map((_, cIdx) => (
                    <th
                      key={cIdx}
                      className="border border-slate-300 py-1.5 px-3 bg-slate-100 text-center text-slate-700 font-mono font-medium text-[11px] min-w-32 whitespace-nowrap select-none"
                    >
                      {getColumnLabel(cIdx)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {sheetData.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-cyan-50/50 transition-colors">
                    <td className="w-14 min-w-14 max-w-14 border border-slate-300 py-1 px-2 bg-slate-100 text-center font-mono text-[11px] text-slate-400 select-none sticky left-0 z-10">
                      {rIdx + 1}
                    </td>
                    {Array.from({ length: maxCols }).map((_, cIdx) => {
                      const val = row && row[cIdx] !== undefined ? String(row[cIdx]) : '';
                      return (
                        <td
                          key={cIdx}
                          title={val}
                          className="border border-slate-200 py-1.5 px-3 text-slate-800 whitespace-nowrap overflow-visible min-w-32"
                        >
                          {val}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
