import React, { useState, useRef } from 'react';
import style from "./style.module.css";
import { createNamespace } from '/utils/js/classcreate';
import {useSystemFileSystem} from '@/sukinos/hooks/useFileSystem';
import { FileType } from "@/sukinos/utils/config";
import { alert } from '@/component/alert/layout'
import Select from '@/component/select/drowSelection/layout';
// 引入 Base64 转换与解码工具
import { dataToBase64Mapper, dataDeBase64Mapper } from "/utils/js/func/data/exChangeBase64";

// 引入 Redux
import { useSelector } from "react-redux";
import { selectFileSystemConfig } from '@/sukinos/store';

// 引入图标
import { X as CloseIcon, ArrowRight as ArrowForwardIcon, Folder as FolderIcon, File as InsertDriveFileIcon, RefreshCw as RefreshIcon, ArrowLeft as ArrowBackIcon, ArrowLeftRight as SwapHorizIcon, Upload as UploadFileIcon, FolderUp as DriveFolderUploadIcon } from 'lucide-react';

// 使用 BEM 工具
const bem = createNamespace('exchange');

// 可用模式定义
const ALL_MODES = [
  { value: 'virtual', label: '虚拟盘 ' },
  { value: 'local', label: '此电脑 ' },
  { value: 'remote', label: '云端 ' },
];

// 辅助函数：通过文件名推断文件映射类型，供 Mapper 使用
const getMapperTypeFromName = (name) => {
  if (!name) return 'Txt';
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) return 'Image';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'Video';
  if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) return 'Audio';
  if (ext === 'html') return 'Html';
  if (ext === 'json') return 'Json';
  return 'Txt'; // 兜底类型
};

/**
 * 单个文件面板组件
 */
const FilePanel = ({ side, mode, setMode, fsHook, onDropItem, otherPanelMode, isPrivate }) => {
  const {
    state: { items, currentId, breadcrumbs },
    navigation: { loadDir, handleBack, handleRefresh },
    operation: { handleUploadFiles, handleUploadFolder }
  } = fsHook;

  // 引用隐藏的 input
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleDragStart = (e, item) => {
    e.dataTransfer.effectAllowed = "copy";
    // 注入当前面板的模式和方向，方便接收端执行解码和定位逻辑
    e.dataTransfer.setData("transfer-source-mode", mode);
    e.dataTransfer.setData("transfer-source-side", side);
    e.dataTransfer.setData("file-meta", JSON.stringify(item));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const sourceSide = e.dataTransfer.getData("transfer-source-side");
    const sourceMode = e.dataTransfer.getData("transfer-source-mode");
    if (sourceSide && sourceSide !== side) {
      const fileMeta = JSON.parse(e.dataTransfer.getData("file-meta"));
      // 触发交换处理函数
      onDropItem(fileMeta, side, sourceMode);
    }
  };

  return (
    <div
      className={style[bem.e('panel')]}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 隐藏的上传控件（这里的上传会直接调用 fsHook 的 Base64 转换的方法） */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleUploadFiles(e.target.files)}
      />
      <input
        type="file"
        webkitdirectory="true"
        ref={folderInputRef}
        style={{ display: 'none' }}
        onChange={(e) => handleUploadFolder(e.target.files)}
      />

      <div className={style[bem.e('panel-header')]}>
        <div className={style[bem.e('select-wrapper')]}>
          <Select
            value={mode}
            size="small"
            options={ALL_MODES.filter(m => m.value !== otherPanelMode)}
            onChange={setMode}
          />
        </div>

        <div className={style[bem.e('actions')]}>
           {/* 在虚拟盘模式，或 local 模式且为 OPFS (isPrivate=true) 时显示上传按钮 */}
           {(mode === 'virtual' || (mode === 'local' && isPrivate)) && (
             <>
                <button onClick={() => fileInputRef.current.click()} title="上传文件">
                    <UploadFileIcon size={15} />
                </button>
                <button onClick={() => folderInputRef.current.click()} title="上传文件夹">
                    <DriveFolderUploadIcon size={15} />
                </button>
                <div className={style[bem.e('divider')]} />
             </>
           )}
           <button onClick={handleBack} disabled={currentId === 'root'} title="返回上一级">
             <ArrowBackIcon size={15} />
           </button>
           <button onClick={handleRefresh} title="刷新">
             <RefreshIcon size={15} />
           </button>
        </div>
      </div>

      <div className={style[bem.e('breadcrumbs')]}>
         {breadcrumbs.map((b, i) => (
           <span key={i} onClick={() => loadDir(b.id)}>{b.name} / </span>
         ))}
      </div>

      <div className={style[bem.e('file-list')]}>
        {items.length === 0 && <div className={style[bem.e('empty')]}>空文件夹</div>}
        {items.map(item => (
          <div
            key={item.id}
            className={style[bem.e('file-item')]}
            draggable
            onDragStart={(e) => handleDragStart(e, item)}
            onDoubleClick={() => item.type === FileType.DIRECTORY && loadDir(item.id)}
          >
            <div className={style[bem.e('icon')]}>
               {item.type === FileType.DIRECTORY ?
                 <FolderIcon size={18} style={{ color: '#f59e0b', fill: '#fef3c7' }} /> :
                 <InsertDriveFileIcon size={18} style={{ color: '#0891b2' }} />
               }
            </div>
            <span className={style[bem.e('name')]} title={item.name}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};


function ExChange({ visible, onClose }) {
  const [leftMode, setLeftMode] = useState('local');
  const leftFS = useSystemFileSystem(leftMode);

  const [rightMode, setRightMode] = useState('virtual');
  const rightFS = useSystemFileSystem(rightMode);

  // 解析配置，获取 isPrivate 状态，如果不存在默认处理为 false ::注意这里和boot区别这里一定不能默认true
  const fileSystemConfig = useSelector(selectFileSystemConfig) || {};
  const isPrivate = fileSystemConfig.isPrivate ?? false;

  /**
   * 解决跨域(Local <-> Virtual)文件传输时的二进制格式转换问题
   */
  const handleTransfer = async (item, targetSide, sourceMode) => {
    if (item.type === FileType.DIRECTORY) {
      alert.success("请进入文件夹后拖拽文件进行交换");
      return;
    }

    const sourceFS = targetSide === 'left' ? rightFS : leftFS;
    const targetFS = targetSide === 'left' ? leftFS : rightFS;
    const targetMode = targetSide === 'left' ? leftMode : rightMode;

    // --- 第一步：读取源文件内容 ---
    const fileWithContent = await sourceFS.operation.handleOpenFile(item);

    if (!fileWithContent || fileWithContent.content === undefined || fileWithContent.content === null) {
      alert.failure("读取源文件失败");
      return;
    }

    let finalContent = fileWithContent.content;
    const mapperType = getMapperTypeFromName(item.name);

    // ---根据流动方向执行数据的深度编码或解码 ---
    if (sourceMode === 'local') {
      // 场景 A: 来源是 Local 磁盘
      // 因为 hook 的 handleOpenFile 已经优化为返回原生的 File (Blob)
      // 所以我们要绕过 content，直接从底层句柄拿出真正的二进制 Blob (File) 对象！
      const record = sourceFS.state.handleRegistry.get(item.id);
      let rawFile = null;
      if (record && record.handle) {
         rawFile = await record.handle.getFile();
      } else if (finalContent instanceof Blob) {
         rawFile = finalContent;
      }

      if (rawFile) {
         if (targetMode === 'virtual') {
            // Local -> Virtual：优化存储为纯正的 Blob 存入虚拟盘，彻底告别 Base64 膨胀
            finalContent = await dataToBase64Mapper(rawFile, mapperType);
         } else if (targetMode === 'local') {
            // Local -> Local：直接传递真实的 File (Blob) 对象，绝对不会乱码
            finalContent = rawFile;
         }
      }
    }
    else if (sourceMode === 'virtual') {
      // 场景 B: 来源是 Virtual 虚拟盘
      if (targetMode === 'local') {
        // Virtual -> Local: 虚拟盘中存储的是原生的 Blob、对象或字符串，直接对齐写入本地真实磁盘
        if (finalContent instanceof Blob) {
          finalContent = finalContent;
        } else if (typeof finalContent === 'object') {
          finalContent = JSON.stringify(finalContent, null, 2);
        } else if (typeof finalContent === 'string') {
          // 兼容历史存入的 Base64 纯文本还原
          try {
            let pureBase64 = finalContent;
            let mimeType = 'application/octet-stream';
            if (finalContent.startsWith('data:')) {
              const match = finalContent.match(/^data:([^;]+);base64,/);
              if (match) mimeType = match[1];
              pureBase64 = finalContent.split(',')[1];
            }
            const decoded = await dataDeBase64Mapper(pureBase64, mapperType);
            if (decoded instanceof Blob) {
              finalContent = decoded;
            } else if (decoded instanceof ArrayBuffer) {
              finalContent = new Blob([decoded], { type: mimeType });
            } else if (typeof decoded === 'object') {
              finalContent = JSON.stringify(decoded, null, 2);
            } else {
              finalContent = String(decoded);
            }
          } catch (e) {
            console.warn("Base64解码失败，作为普通文本写入本地:", e);
          }
        }
      }
      // Virtual -> Virtual: 两边都是原生对象/Blob，直接对拷即可
    }

    // --- 第二步：在目标位置执行创建占位  ---
    const newItem = await targetFS.operation.handleCreate({ type: FileType.FILE });

    if (newItem) {
      try {
        // --- 第三步：立即重命名 ---
        const isRenamed = await targetFS.operation.handleRename({
          id: newItem.id,
          name: newItem.name,      // 当前占位名 ("新建文件")
          newName: item.name,      // 期望的目标文件名 (源文件名)
          parentId: targetFS.state.currentId,
          type: FileType.FILE
        });

        if (isRenamed) {
          // --- 第四步：写入实际数据 ---
          const isSaved = await targetFS.operation.handleSave({
            id: newItem.id,
            content: finalContent, // 使用我们上方完美转码好的数据
            parentId: targetFS.state.currentId,
            name: item.name
          });

          if (isSaved) {
            // 传输完全成功，刷新目标面板视图
            targetFS.navigation.handleRefresh();
          } else {
            alert.failure("传输失败：文件内容写入失败");
          }
        } else {
          alert.failure("传输失败：无法重命名文件占位符");
        }
      } catch (error) {
        console.error("跨盘传输异常:", error);
        alert.failure("传输过程中发生系统级错误");
      }
    } else {
      alert.failure("传输失败：无法在目标路径创建文件");
    }
  };

  if (!visible) return null;

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('container')]}>
        <div className={style[bem.e('header')]}>
          <div className={style[bem.e('title')]}>
            <SwapHorizIcon size={18} /> 文件交换中心 (Multi-Channel Exchange)
          </div>
          <button className={style[bem.e('close')]} onClick={onClose}>
            <CloseIcon size={18} />
          </button>
        </div>

        <div className={style[bem.e('body')]}>
          <FilePanel
            side="left"
            mode={leftMode}
            setMode={setLeftMode}
            fsHook={leftFS}
            onDropItem={handleTransfer}
            otherPanelMode={rightMode}
            isPrivate={isPrivate}
          />

          <div className={style[bem.e('middle-indicator')]}>
            <ArrowForwardIcon width="1em" height="1em" />
            <span>交换</span>
            <ArrowForwardIcon width="1em" height="1em" style={{ transform: 'rotate(180deg)' }} />
          </div>

          <FilePanel
            side="right"
            mode={rightMode}
            setMode={setRightMode}
            fsHook={rightFS}
            onDropItem={handleTransfer}
            otherPanelMode={leftMode}
            isPrivate={isPrivate}
          />
        </div>
      </div>
      <div className={style[bem.e('mask')]} onClick={onClose}></div>
    </div>
  );
}

export default ExChange;
