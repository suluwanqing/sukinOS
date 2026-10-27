import React, { useEffect, useRef, useState, useCallback } from 'react';
import { renderAsync } from 'docx-preview';
import {
  FileText,
  AlertCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';

export default function DocxIframeViewer({ arrayBuffer }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);

  const postToIframe = useCallback((action, data) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ action, ...data }, '*');
    }
  }, []);

  useEffect(() => {
    let active = true;

    if (!iframeRef.current || !arrayBuffer || arrayBuffer.byteLength === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const initIframeDoc = async () => {
      try {
        const iframe = iframeRef.current;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

        iframeDoc.open();
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <style>
                * { box-sizing: border-box; }
                html, body {
                  margin: 0;
                  padding: 0;
                  background-color: #525659;
                  overflow-x: auto;
                  overflow-y: scroll;
                  font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                #wrapper {
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  padding: 30px 0;
                  gap: 24px;
                  transform-origin: top center;
                  transition: transform 0.15s ease-out;
                }
                .docx-wrapper {
                  background: transparent !important;
                  padding: 0 !important;
                }
                .docx-wrapper > section.docx {
                  background: #ffffff !important;
                  color: #000000 !important;
                  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
                  margin: 0 0 24px 0 !important;
                  position: relative !important;
                }
              </style>
            </head>
            <body>
              <div id="wrapper">
                <div id="docx-container"></div>
              </div>
              <script>
                const wrapper = document.getElementById('wrapper');
                window.addEventListener('message', (e) => {
                  if (e.data && e.data.action === 'ZOOM') {
                    wrapper.style.transform = 'scale(' + e.data.scale + ')';
                  }
                });
              </script>
            </body>
          </html>
        `);
        iframeDoc.close();

        await new Promise((resolve) => setTimeout(resolve, 60));
        if (!active) return;

        const targetNode = iframeDoc.getElementById('docx-container');

        await renderAsync(arrayBuffer, targetNode, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
          experimental: true,
          trimXmlDeclaration: true,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
          debug: false
        });

        if (!active) return;
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setError(err?.message || 'Word 文档解析失败');
        setLoading(false);
      }
    };

    initIframeDoc();

    return () => {
      active = false;
    };
  }, [arrayBuffer]);

  const handleZoom = (newScale) => {
    const val = Number(Math.max(0.4, Math.min(newScale, 2.5)).toFixed(2));
    setScale(val);
    postToIframe('ZOOM', { scale: val });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#525659] overflow-hidden select-text">
      <div className="flex items-center justify-between px-5 py-2.5 bg-[#323639] border-b border-[#212427] z-30 shrink-0 text-slate-200">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
          <FileText size={16} className="text-blue-400" />
          <span>Word 文档预览</span>
        </div>

        <div className="flex items-center gap-1 text-slate-300">
          <button
            onClick={() => handleZoom(scale - 0.1)}
            className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 transition"
            title="缩小"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-mono font-semibold min-w-12 text-center text-slate-200">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => handleZoom(scale + 0.1)}
            className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 transition"
            title="放大"
          >
            <ZoomIn size={15} />
          </button>
          <div className="w-px h-3.5 bg-slate-600 mx-1.5" />
          <button
            onClick={() => handleZoom(1)}
            className="p-1.5 hover:bg-slate-700/60 rounded text-slate-300 transition"
            title="还原 100%"
          >
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      <div className="flex-1 w-full h-full relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#525659] text-slate-300">
            <RefreshCw className="animate-spin text-blue-400" size={28} />
            <span className="text-xs font-medium">正在解析 Word 文档并排版...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[#525659] text-rose-400 p-6 text-center">
            <AlertCircle size={30} />
            <span className="text-sm font-semibold">{error}</span>
          </div>
        )}

        <iframe
          ref={iframeRef}
          title="docx-iframe-preview"
          className="w-full h-full border-none block"
        />
      </div>
    </div>
  );
}
