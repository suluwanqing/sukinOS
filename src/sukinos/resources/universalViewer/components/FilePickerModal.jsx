import React, { useState } from 'react';
import { useSystemFileSystem } from '@/sukinos/hooks/useFileSystem';
import { FileType } from "@/sukinos/utils/config";
import FileSystemView from '@/sukinos/component/fileSystemView/layout';
import { HardDrive, Monitor, X, FolderSync } from 'lucide-react';

const isDirectory = (item) => {
  if (!item) return false;
  return (
    item.type === FileType.DIRECTORY ||
    item.type === 2 ||
    item.type === 'directory' ||
    item.kind === 'directory'
  );
};

export default function FilePickerModal({
  visible,
  onClose,
  onConfirmFile,
  onConfirmFolder,
  title = "选择文件",
  isSelectFolder = false // true 代表选择轮播文件夹模式，false 代表选择文件
}) {
  const [mode, setMode] = useState('virtual');
  const fs = useSystemFileSystem(mode);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-xs p-8 animate-in fade-in duration-150">
      <div className="w-[820px] h-[560px] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">{title}</span>
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg text-[11px]">
              <button
                onClick={() => setMode('virtual')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  mode === 'virtual' ? 'bg-white shadow-xs font-medium text-slate-800' : 'text-slate-500'
                }`}
              >
                <HardDrive size={12} />
                <span>虚拟盘</span>
              </button>
              <button
                onClick={() => setMode('local')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition ${
                  mode === 'local' ? 'bg-white shadow-xs font-medium text-slate-800' : 'text-slate-500'
                }`}
              >
                <Monitor size={12} />
                <span>此电脑</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* 视图主体 */}
        <div className="flex-1 p-3 bg-slate-50/30 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-hidden">
            <FileSystemView
              items={fs.state.items}
              breadcrumbs={fs.state.breadcrumbs}
              isLoading={!fs.state.isReady}
              onBack={fs.navigation.handleBack}
              onRefresh={fs.navigation.handleRefresh}
              onBreadcrumbClick={fs.navigation.loadDir}
              onItemDoubleClick={(item) => {
                if (isDirectory(item)) {
                  fs.navigation.loadDir(item.id);
                } else if (!isSelectFolder && onConfirmFile) {
                  onConfirmFile(item, mode);
                }
              }}
              orientation="horizontal"
              width="100%"
              height="100%"
            />
          </div>

          {/* 模式特有的底部确认栏 */}
          {isSelectFolder && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                当前目录：
                <span className="font-semibold text-slate-700">
                  {fs.state.breadcrumbs[fs.state.breadcrumbs.length - 1]?.name || '根目录'}
                </span>
              </span>

              <button
                onClick={() => {
                  const currentCrumb = fs.state.breadcrumbs[fs.state.breadcrumbs.length - 1];
                  if (onConfirmFolder) {
                    onConfirmFolder({
                      id: fs.state.currentId,
                      name: currentCrumb?.name || '指定目录',
                      mode
                    });
                  }
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium shadow-sm transition flex items-center gap-1.5"
              >
                <FolderSync size={14} />
                <span>以此文件夹开启轮播</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
