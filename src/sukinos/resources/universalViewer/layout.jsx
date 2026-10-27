import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useSystemFileSystem } from '@/sukinos/hooks/useFileSystem';
import { alert } from '@/component/alert/layout';
import { confirm } from '@/component/confirm/layout';
import { FileType } from "@/sukinos/utils/config";
import { parseFileData, serializeForSave, getMonacoLanguage, FileCategory, detectCategory } from './parser';
import {
  recordRecentFile,
  getRecentFilesWithHealthCheck,
  clearInvalidRecents,
  removeRecentFile,
  clearAllRecents,
  saveLastActiveState,
  getLastActiveState,
  saveViewerConfig,
  getViewerConfig
} from './db';

import FilePickerModal from './components/FilePickerModal';
import HybridMediaCanvas from './components/HybridMediaCanvas';
import AudioViewer from './components/AudioViewer';
import TextEditor from './components/TextEditor';
import ArchiveViewer from './components/ArchiveViewer';
import HexViewer from './components/HexViewer';
import MarkdownViewer from './components/MarkdownViewer';
import HtmlViewer from './components/HtmlViewer';
import DocxViewer from './components/DocxViewer';
import XlsxViewer from './components/XlsxViewer';
import PdfViewer from './components/PdfViewer';

import {
  FileText, Image as ImageIcon, Film, Music, FileCode, Archive,
  Save, RefreshCw, Download, AlertCircle, History, Trash2, X, Clock,
  FolderOpen, CheckCircle2, AlertTriangle, Monitor, HardDrive,
  Calendar, Database, Layers, Sparkles, BookOpen, Code, File, Table
} from 'lucide-react';
import style from './style.module.css';

const formatBytes = (bytes) => {
  if (bytes === 0 || !bytes) return '--';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDate = (timestamp) => {
  if (!timestamp) return '--';
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export default function UniversalViewer({ state: propState, handleFocus }) {
  const [activeFile, setActiveFile] = useState(() => ({
    id: propState?.id || null,
    name: propState?.name || '',
    mode: propState?.mode || 'virtual',
    parentId: propState?.parentId || 'root'
  }));

  const {
    state: { isReady, handleRegistry },
    operation: { handleOpenFile, handleSave, handleReadDir }
  } = useSystemFileSystem(activeFile.mode);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [fileMeta, setFileMeta] = useState({ size: 0, mtime: null });

  const [textContent, setTextContent] = useState('');
  const [isModified, setIsModified] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recents, setRecents] = useState([]);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  const [pickerModalOpen, setPickerModalOpen] = useState(false);
  const [isAddingLayerMode, setIsAddingLayerMode] = useState(false);
  const [folderPickerOpen, setFolderPickerOpen] = useState(false);

  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(false);
  const [playlistFolder, setPlaylistFolder] = useState({ id: null, name: '', mode: 'virtual' });
  const [allowHybrid, setAllowHybrid] = useState(true);
  const [loopMode, setLoopMode] = useState('list');
  const [imageDelay, setImageDelay] = useState(5);
  const [isMixingBoard, setIsMixingBoard] = useState(false);

  const [layers, setLayers] = useState([]);
  const [selectedLayerId, setSelectedLayerId] = useState(null);
  const [folderPlaylist, setFolderPlaylist] = useState([]);

  const isSwitchingMediaRef = useRef(false);
  const handleReadDirRef = useRef(handleReadDir);
  useEffect(() => {
    handleReadDirRef.current = handleReadDir;
  }, [handleReadDir]);

  useEffect(() => {
    getViewerConfig().then(cfg => {
      setIsAutoPlayEnabled(!!cfg.isAutoPlayEnabled);
      setAllowHybrid(cfg.allowHybrid !== false);
      setLoopMode(cfg.loopMode || 'list');
      setImageDelay(Math.max(2, cfg.imageDelay || 5));
      setIsMixingBoard(!!cfg.isMixingBoard);
      if (cfg.playlistFolderId) {
        setPlaylistFolder({
          id: cfg.playlistFolderId,
          name: cfg.playlistFolderName || '指定文件夹',
          mode: cfg.playlistMode || 'virtual'
        });
      }
    });
  }, []);

  useEffect(() => {
    if (propState?.id && propState.id !== activeFile.id) {
      setActiveFile({
        id: propState.id,
        name: propState.name || '未命名',
        mode: propState.mode || 'virtual',
        parentId: propState.parentId || 'root'
      });
    }
  }, [propState?.id, propState?.name, propState?.mode, propState?.parentId]);

  useEffect(() => {
    if (!propState?.id) {
      getLastActiveState().then((last) => {
        if (last && last.id) {
          setActiveFile(last);
        } else {
          setActiveFile({ id: null, name: '', mode: 'virtual', parentId: 'root' });
        }
      });
    }
  }, []);

  const refreshRecents = useCallback(async () => {
    setIsCheckingHealth(true);
    const list = await getRecentFilesWithHealthCheck(handleRegistry);
    setRecents(list);
    setIsCheckingHealth(false);
  }, [handleRegistry]);

  const fetchPlaylistFromDirectory = useCallback(async (dirId) => {
    if (!dirId || !handleReadDirRef.current) return [];
    try {
      const items = await handleReadDirRef.current(dirId);
      if (Array.isArray(items)) {
        const filesOnly = items.filter(i => i.type !== FileType.DIRECTORY && i.type !== 2 && i.type !== 'directory');
        setFolderPlaylist(filesOnly);
        return filesOnly;
      }
    } catch (e) {
      console.warn("读取目录文件失败:", e);
    }
    return [];
  }, []);

  const loadContent = useCallback(async () => {
    if (!activeFile.id || !isReady) return;

    setLoading(true);
    setErrorMsg(null);
    setIsModified(false);

    try {
      if (activeFile.mode === 'local' && handleRegistry) {
        const record = handleRegistry.get(activeFile.id);
        if (!record || !record.handle) {
          throw new Error('此电脑目录访问授权已重置，请重新选择');
        }
      }

      const res = await handleOpenFile({ ...propState, ...activeFile });

      setFileMeta({
        size: res?.size || 0,
        mtime: res?.mtime || Date.now()
      });

      const result = await parseFileData(
        activeFile,
        res?.content,
        handleRegistry,
        activeFile.mode
      );

      setParsedData(result);
      if (result.text !== undefined) {
        setTextContent(result.text);
      }
      if (result.category === FileCategory.IMAGE || result.category === FileCategory.VIDEO) {
        setLayers(prev => {
          const currentAnchor = prev.find(l => l.id === selectedLayerId) || prev[0] || null;

          const newLayer = {
            id: activeFile.id,
            name: activeFile.name,
            src: result.url,
            category: result.category,
            x: currentAnchor && !isMixingBoard ? (currentAnchor.x || 0) : (prev.length % 4) * 35,
            y: currentAnchor && !isMixingBoard ? (currentAnchor.y || 0) : (prev.length % 4) * 35,
            scale: currentAnchor && !isMixingBoard ? (currentAnchor.scale || 1) : 1,
            rotation: currentAnchor && !isMixingBoard ? (currentAnchor.rotation || 0) : 0,
            zIndex: currentAnchor && !isMixingBoard ? (currentAnchor.zIndex || 10) : prev.length + 10
          };

          if (isMixingBoard) {
            const exists = prev.find(l => l.id === newLayer.id);
            if (exists) return prev;
            return [...prev, newLayer];
          } else {
            return [newLayer];
          }
        });
        setSelectedLayerId(activeFile.id);
      }
      recordRecentFile({
        id: activeFile.id,
        name: activeFile.name,
        mode: activeFile.mode,
        parentId: activeFile.parentId || 'root',
        category: result.category,
        size: res?.size || 0
      });
      saveLastActiveState({
        id: activeFile.id,
        name: activeFile.name,
        mode: activeFile.mode,
        parentId: activeFile.parentId || 'root'
      });

    } catch (err) {
      setErrorMsg(err.message || '文件读取异常');
    } finally {
      setLoading(false);
      isSwitchingMediaRef.current = false;
    }
  }, [activeFile.id, activeFile.mode, isReady, handleRegistry, handleOpenFile, propState, isMixingBoard, selectedLayerId]);

  useEffect(() => {
    if (handleFocus) handleFocus();
  }, [activeFile.id, handleFocus]);

  useEffect(() => {
    loadContent();
    return () => {
      if (parsedData?.url && !isMixingBoard) {
        URL.revokeObjectURL(parsedData.url);
      }
    };
  }, [activeFile.id, activeFile.mode, isReady]);

  const filteredPlaylist = useMemo(() => {
    if (!isAutoPlayEnabled || !folderPlaylist || folderPlaylist.length === 0) return [];

    return folderPlaylist.filter(item => {
      const cat = detectCategory(item.name);
      if (allowHybrid) {
        return cat === FileCategory.IMAGE || cat === FileCategory.VIDEO;
      }
      return cat === parsedData?.category;
    });
  }, [isAutoPlayEnabled, folderPlaylist, allowHybrid, parsedData?.category]);

  const currentPlaylistIndex = useMemo(() => {
    return filteredPlaylist.findIndex(item => item.id === activeFile.id);
  }, [filteredPlaylist, activeFile.id]);

  const handleNextMedia = useCallback(() => {
    if (isSwitchingMediaRef.current || filteredPlaylist.length <= 1) return;
    isSwitchingMediaRef.current = true;

    const nextIdx = (currentPlaylistIndex + 1) % filteredPlaylist.length;
    const target = filteredPlaylist[nextIdx];
    if (target) {
      setActiveFile(prev => ({
        ...prev,
        id: target.id,
        name: target.name
      }));
    } else {
      isSwitchingMediaRef.current = false;
    }
  }, [filteredPlaylist, currentPlaylistIndex]);

  const handlePrevMedia = useCallback(() => {
    if (isSwitchingMediaRef.current || filteredPlaylist.length <= 1) return;
    isSwitchingMediaRef.current = true;

    const prevIdx = (currentPlaylistIndex - 1 + filteredPlaylist.length) % filteredPlaylist.length;
    const target = filteredPlaylist[prevIdx];
    if (target) {
      setActiveFile(prev => ({
        ...prev,
        id: target.id,
        name: target.name
      }));
    } else {
      isSwitchingMediaRef.current = false;
    }
  }, [filteredPlaylist, currentPlaylistIndex]);

  const toggleAutoPlay = () => {
    setIsAutoPlayEnabled(prev => {
      const next = !prev;
      saveViewerConfig({ isAutoPlayEnabled: next });
      if (next && !playlistFolder.id) {
        setFolderPickerOpen(true);
      }
      return next;
    });
  };

  const toggleAllowHybrid = () => {
    setAllowHybrid(prev => {
      const next = !prev;
      saveViewerConfig({ allowHybrid: next });
      return next;
    });
  };

  const toggleLoopMode = () => {
    setLoopMode(prev => {
      const next = prev === 'list' ? 'single' : 'list';
      saveViewerConfig({ loopMode: next });
      return next;
    });
  };

  const changeImageDelay = (val) => {
    const safeVal = Math.max(2, val);
    setImageDelay(safeVal);
    saveViewerConfig({ imageDelay: safeVal });
  };

  const handleSelectFolderAsPlaylist = async (folderItem) => {
    setPlaylistFolder({
      id: folderItem.id,
      name: folderItem.name,
      mode: folderItem.mode
    });
    setIsAutoPlayEnabled(true);
    setFolderPickerOpen(false);

    saveViewerConfig({
      playlistFolderId: folderItem.id,
      playlistFolderName: folderItem.name,
      playlistMode: folderItem.mode,
      isAutoPlayEnabled: true
    });

    const files = await fetchPlaylistFromDirectory(folderItem.id);
    if (files.length > 0) {
      const firstMedia = files.find(f => {
        const cat = detectCategory(f.name);
        return cat === FileCategory.IMAGE || cat === FileCategory.VIDEO;
      }) || files[0];

      setActiveFile({
        id: firstMedia.id,
        name: firstMedia.name,
        mode: folderItem.mode,
        parentId: folderItem.id
      });
      alert.success(`已开启 [${folderItem.name}] 连续轮播`);
    } else {
      alert.warning("该文件夹下未发现有效媒体文件");
    }
  };

  const executeSave = async () => {
    if (!isModified || !activeFile.id) return;
    try {
      setSaveStatus('saving');
      const payload = await serializeForSave(textContent, activeFile.mode);
      await handleSave({ ...propState, ...activeFile, content: payload });

      setIsModified(false);
      setSaveStatus('idle');
      alert.success('文件保存成功');
    } catch (err) {
      setSaveStatus('idle');
      alert.failure(`保存失败: ${err.message || err}`);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        executeSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [textContent, isModified, activeFile]);

  const handleSwitchRecent = (item) => {
    if (!item.isHealthy) {
      alert.warning('该文件已失效，无法载入');
      return;
    }
    setActiveFile({
      id: item.fileId,
      name: item.name,
      mode: item.mode,
      parentId: item.parentId || 'root'
    });
    setDrawerOpen(false);
  };

  const handleCleanInvalidWithConfirm = () => {
    const invalidIds = recents.filter((i) => !i.isHealthy).map((i) => i.id);
    if (invalidIds.length === 0) {
      alert.info('当前无失效记录');
      return;
    }
    confirm.show({
      title: '清理失效历史',
      content: `检测到 ${invalidIds.length} 条已失效的历史文件，是否确认移除？`,
      onConfirm: async () => {
        await clearInvalidRecents(invalidIds);
        refreshRecents();
        alert.success(`已清理 ${invalidIds.length} 个失效条目`);
      }
    });
  };

  const handleClearAllWithConfirm = () => {
    confirm.show({
      title: '清空历史记录',
      content: '您确定要清空全部最近打开历史吗？此操作不可逆。',
      onConfirm: async () => {
        await clearAllRecents();
        refreshRecents();
        setActiveFile({ id: null, name: '', mode: 'virtual', parentId: 'root' });
        setParsedData(null);
        setLayers([]);
        alert.success('历史记录已全部清空');
      }
    });
  };

  const handlePickerConfirmFile = (item, selectedMode) => {
    if (isAddingLayerMode) {
      setIsMixingBoard(true);
      saveViewerConfig({ isMixingBoard: true });
    }
    setActiveFile({
      id: item.id,
      name: item.name,
      mode: selectedMode,
      parentId: item.parentId || 'root'
    });
    setPickerModalOpen(false);
    setIsAddingLayerMode(false);
    setDrawerOpen(false);
  };

  const isEditable = [FileCategory.CODE, FileCategory.MARKDOWN, FileCategory.HTML, FileCategory.JSON].includes(parsedData?.category);
  const isHybridMedia = parsedData?.category === FileCategory.IMAGE || parsedData?.category === FileCategory.VIDEO;

  return (
    <div className="flex flex-col w-full h-full bg-slate-50 text-slate-800 select-none overflow-hidden font-sans relative">
      <div className="absolute top-0 left-0 right-0 z-40 group pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-3 bg-transparent cursor-pointer pointer-events-auto" />
        <header
          className={`absolute top-0 left-0 right-0 px-4 py-2 bg-white/95 backdrop-blur-md border-b border-pink-100 shadow-[0_8px_30px_rgba(6,182,212,0.06)] flex items-center justify-between transition-all duration-300 ease-out transform pointer-events-auto ${
            !activeFile.id || drawerOpen
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          }`}
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <TypeIcon category={parsedData?.category} />

            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xs font-semibold tracking-wide truncate max-w-xs text-slate-800" title={activeFile.name}>
                {activeFile.name || '未选择文件'}
              </span>

              {activeFile.id && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 bg-gradient-to-r from-cyan-50/70 to-pink-50/70 px-2 py-0.5 rounded-md border border-cyan-100 shrink-0">
                  <span className="uppercase font-bold text-pink-600 flex items-center gap-1">
                    <Sparkles size={11} className="text-cyan-500" />
                    {isMixingBoard ? `BOARD (${layers.length})` : parsedData?.category || 'STANDBY'}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Database size={11} className="text-cyan-600" />
                    {formatBytes(fileMeta.size || parsedData?.size)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar size={11} className="text-pink-500" />
                    {formatDate(fileMeta.mtime)}
                  </span>
                  <span>•</span>
                  <span>{activeFile.mode === 'virtual' ? '虚拟盘' : '此电脑'}</span>
                </div>
              )}

              {isModified && (
                <span className="text-[10px] text-pink-600 font-bold px-1.5 py-0.5 bg-pink-50 rounded border border-pink-200 shrink-0">
                  未保存
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isEditable && (
              <button
                onClick={executeSave}
                disabled={!isModified || saveStatus === 'saving'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isModified
                    ? 'bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white shadow-sm shadow-pink-500/20'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Save size={13} />
                <span>{saveStatus === 'saving' ? '保存中...' : '保存'}</span>
              </button>
            )}

            {parsedData?.url && (
              <a
                href={parsedData.url}
                download={activeFile.name}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 text-slate-600 transition"
                title="下载文件"
              >
                <Download size={14} />
              </a>
            )}

            {activeFile.id && (
              <button
                onClick={loadContent}
                className="p-1.5 rounded-lg bg-slate-100 hover:bg-pink-50 hover:text-pink-600 text-slate-600 transition"
                title="重新载入"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            )}

            <button
              onClick={() => {
                refreshRecents();
                setDrawerOpen(true);
              }}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-pink-50 text-slate-600 transition ml-1"
              title="历史与文件管理"
            >
              <History size={14} />
            </button>
          </div>
        </header>
      </div>

      <main className={`flex-1 w-full h-full relative overflow-hidden flex items-center justify-center ${style.scroll}`}>
        {loading && (
          <div className="flex flex-col items-center gap-2.5 text-slate-400">
            <RefreshCw className="animate-spin text-cyan-500" size={26} />
            <span className="text-xs">加载解析中...</span>
          </div>
        )}

        {errorMsg && !loading && (
          <div className="flex flex-col items-center gap-3 text-rose-500 max-w-sm text-center px-4">
            <AlertCircle size={36} />
            <p className="text-xs leading-relaxed">{errorMsg}</p>
            <button
              onClick={() => setPickerModalOpen(true)}
              className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-pink-500 text-white text-xs font-medium hover:opacity-90 transition"
            >
              重新选取文件
            </button>
          </div>
        )}

        {!loading && !errorMsg && (!activeFile.id || !parsedData) && (
          <div className="flex flex-col items-center gap-3 text-slate-400 text-center animate-in fade-in zoom-in-95 duration-200">
            <FolderOpen size={48} className="stroke-1 text-slate-300" />
            <span className="text-xs">未打开任何文件</span>
            <button
              onClick={() => setPickerModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-white text-xs font-medium shadow-md shadow-pink-500/20 transition"
            >
              从文件夹中选择
            </button>
          </div>
        )}

        {!loading && !errorMsg && parsedData && (
          <div className="w-full h-full">
            {isHybridMedia && (
              <HybridMediaCanvas
                isMixingBoard={isMixingBoard}
                layers={layers}
                onUpdateLayer={(id, patch) => setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l))}
                onRemoveLayer={(id) => setLayers(prev => prev.filter(l => l.id !== id))}
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
                onRequestAddLayer={() => {
                  setIsAddingLayerMode(true);
                  setPickerModalOpen(true);
                }}
                isAutoPlayEnabled={isAutoPlayEnabled}
                playlistFolderName={playlistFolder.name}
                onRequestSelectFolder={() => setFolderPickerOpen(true)}
                onNext={handleNextMedia}
                onPrev={handlePrevMedia}
                hasNext={filteredPlaylist.length > 1}
                hasPrev={filteredPlaylist.length > 1}
                loopMode={loopMode}
                onToggleLoopMode={toggleLoopMode}
                imageDelay={imageDelay}
                onChangeImageDelay={changeImageDelay}
                playlist={filteredPlaylist}
                currentIndex={currentPlaylistIndex}
                allowHybrid={allowHybrid}
                onToggleAllowHybrid={toggleAllowHybrid}
                onToggleAutoPlay={toggleAutoPlay}
              />
            )}

            {parsedData.category === FileCategory.AUDIO && (
              <AudioViewer src={parsedData.url} name={activeFile.name} />
            )}

            {parsedData.category === FileCategory.MARKDOWN && (
              <MarkdownViewer
                content={textContent}
                onChange={(val) => {
                  setTextContent(val || '');
                  setIsModified(true);
                }}
              />
            )}

            {parsedData.category === FileCategory.HTML && (
              <HtmlViewer
                content={textContent}
                onChange={(val) => {
                  setTextContent(val || '');
                  setIsModified(true);
                }}
              />
            )}

            {parsedData.category === FileCategory.DOCX && (
              <DocxViewer arrayBuffer={parsedData.arrayBuffer} />
            )}

            {parsedData.category === FileCategory.XLSX && (
              <XlsxViewer arrayBuffer={parsedData.arrayBuffer} />
            )}

            {parsedData.category === FileCategory.PDF && (
              <PdfViewer url={parsedData.url} name={activeFile.name} />
            )}

            {(parsedData.category === FileCategory.CODE || parsedData.category === FileCategory.JSON) && (
              <TextEditor
                content={textContent}
                language={getMonacoLanguage(activeFile.name)}
                onChange={(val) => {
                  setTextContent(val || '');
                  setIsModified(true);
                }}
              />
            )}

            {parsedData.category === FileCategory.ARCHIVE && (
              <ArchiveViewer entries={parsedData.zipEntries} />
            )}

            {parsedData.category === FileCategory.HEX && (
              <HexViewer bytes={parsedData.hexBytes} />
            )}
          </div>
        )}
      </main>

      {drawerOpen && (
        <div className="absolute inset-0 z-50 flex justify-end">
          <div className="w-full h-full bg-slate-900/10 backdrop-blur-xs" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-84 h-full bg-white border-l border-slate-200/80 shadow-2xl flex flex-col">
            <div className="p-3.5 border-b border-slate-100 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Clock size={15} className="text-cyan-500" />
                  <span className="text-xs font-semibold tracking-wide">最近打开记录</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCleanInvalidWithConfirm}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-amber-500 transition"
                    title="清理失效条目"
                  >
                    <AlertTriangle size={13} />
                  </button>
                  <button
                    onClick={handleClearAllWithConfirm}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-rose-500 transition"
                    title="清空全部"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 transition"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>

              <button
                onClick={() => setPickerModalOpen(true)}
                className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-50 to-pink-50 hover:from-cyan-100 hover:to-pink-100 text-slate-700 border border-pink-100 flex items-center justify-center gap-2 text-xs font-medium transition"
              >
                <FolderOpen size={14} className="text-cyan-600" />
                <span>从文件夹中选择文件...</span>
              </button>
            </div>

            <div className={`flex-1 overflow-auto p-2.5 space-y-1 ${style.scroll}`}>
              {isCheckingHealth ? (
                <div className="h-32 flex items-center justify-center text-xs text-slate-400 gap-2">
                  <RefreshCw size={14} className="animate-spin text-pink-500" />
                  <span>扫描有效性...</span>
                </div>
              ) : recents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  暂无打开记录
                </div>
              ) : (
                recents.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSwitchRecent(item)}
                    className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition text-xs border ${
                      item.fileId === activeFile.id && item.mode === activeFile.mode
                        ? 'bg-gradient-to-r from-cyan-50/80 to-pink-50/80 border-pink-200 text-pink-900 font-medium'
                        : item.isHealthy
                        ? 'hover:bg-slate-50 border-transparent text-slate-600'
                        : 'opacity-50 hover:bg-rose-50/50 border-transparent text-slate-400'
                    }`}
                  >
                    <div className="flex flex-col truncate pr-2">
                      <div className="flex items-center gap-1.5 truncate">
                        {item.isHealthy ? (
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                        )}
                        <span className={`truncate ${!item.isHealthy ? 'line-through' : ''}`}>
                          {item.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 ml-4">
                        {item.mode === 'virtual' ? '虚拟盘' : '此电脑'} • {new Date(item.lastOpenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirm.show({
                          title: '删除记录',
                          content: `确认移除记录 [${item.name}] 吗？`,
                          onConfirm: async () => {
                            await removeRecentFile(item.id);
                            refreshRecents();
                            if (item.fileId === activeFile.id && item.mode === activeFile.mode) {
                              setActiveFile({ id: null, name: '', mode: 'virtual', parentId: 'root' });
                              setParsedData(null);
                              setLayers([]);
                            }
                          }
                        });
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-rose-500 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <FilePickerModal
        visible={pickerModalOpen}
        onClose={() => {
          setPickerModalOpen(false);
          setIsAddingLayerMode(false);
        }}
        onConfirmFile={handlePickerConfirmFile}
        title={isAddingLayerMode ? "选择文件追加到画布" : "浏览并打开文件"}
        isSelectFolder={false}
      />

      <FilePickerModal
        visible={folderPickerOpen}
        onClose={() => setFolderPickerOpen(false)}
        onConfirmFolder={handleSelectFolderAsPlaylist}
        title="指定连续轮播的源文件夹"
        isSelectFolder={true}
      />
    </div>
  );
}

function TypeIcon({ category }) {
  switch (category) {
    case FileCategory.IMAGE: return <ImageIcon size={16} className="text-emerald-500" />;
    case FileCategory.VIDEO: return <Film size={16} className="text-cyan-500" />;
    case FileCategory.AUDIO: return <Music size={16} className="text-pink-500" />;
    case FileCategory.CODE:
    case FileCategory.JSON: return <FileCode size={16} className="text-sky-500" />;
    case FileCategory.MARKDOWN: return <BookOpen size={16} className="text-indigo-500" />;
    case FileCategory.HTML: return <Code size={16} className="text-amber-500" />;
    case FileCategory.DOCX: return <FileText size={16} className="text-blue-600" />;
    case FileCategory.XLSX: return <Table size={16} className="text-emerald-600" />;
    case FileCategory.PDF: return <File size={16} className="text-rose-500" />;
    case FileCategory.ARCHIVE: return <Archive size={16} className="text-amber-600" />;
    default: return <FileText size={16} className="text-slate-400" />;
  }
}
