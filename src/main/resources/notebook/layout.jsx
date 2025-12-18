import React, { useRef, useState, useEffect, useMemo } from "react";
import style from "./style.module.css";
import { createNamespace } from '@/utils/js/classcreate';
import fs from '@/utils/file/fileKernel';
import SaveModal from './saveModal/layout'; // 引入上面的组件，如果写在一起则不需要
const bem = createNamespace('notebook');
function Notebook({ fileId, onStatusChange, state }) {
  // --- 状态管理 ---
  // 优先使用 props 或 state 中的 ID，如果没有，说明是“新建模式”
  const [internalFileId, setInternalFileId] = useState(fileId || state?.fileId || null);

  const [content, setContent] = useState("");
  const [status, setStatus] = useState("ready");
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 });

  // 模态框状态
  const [isSaveModalVisible, setSaveModalVisible] = useState(false);

  // 只有当没有 fileId 且 explicitly 设置为只读时才只读？
  // 现在的逻辑：没有 fileId = 新建文件（可编辑）；有 fileId = 编辑现有文件。
  // 如果需要强制只读模式，可以由 props 控制，这里默认都可编辑。
  const isReadOnly = false;

  // --- Refs ---
  const textareaRef = useRef(null);
  const lineNumRef = useRef(null);
  const timerRef = useRef(null);
  const lastContentRef = useRef("");

  // --- 加载文件逻辑 ---
  useEffect(() => {
    // 如果有 internalFileId，去读取文件内容
    if (internalFileId) {
      let isMounted = true;
      const loadFile = async () => {
        try {
          setStatus("loading");
          if (!fs.ready) await fs.boot();
          const text = await fs.readFile(internalFileId);
          if (isMounted) {
            setContent(text || "");
            lastContentRef.current = text || "";
            setStatus("saved");
          }
        } catch (e) {
          console.error("Read file error:", e);
          setStatus("error");
        }
      };
      loadFile();
      return () => { isMounted = false; };
    } else {
      // 如果没有 ID，就是新建空白文件
      setContent("");
      lastContentRef.current = "";
      setStatus("ready"); // 这里的 ready 表示新建未保存
    }
  }, [internalFileId]);

  // --- 保存逻辑 ---

  // 执行保存 (针对已有文件)
  const performUpdate = async (textToSave) => {
    try {
      setStatus("saving");
      if (textToSave === lastContentRef.current) {
        setTimeout(() => setStatus("saved"), 200);
        return;
      }
      await fs.updateContent(internalFileId, textToSave);
      lastContentRef.current = textToSave;
      setStatus("saved");
      if (onStatusChange) onStatusChange('saved');
    } catch (e) {
      console.error("Save failed:", e);
      setStatus("error");
    }
  };

  // 执行新建保存 (来自 Modal)
  const handleCreateFile = async (name, parentId) => {
    try {
      // 创建文件
      const newFile = await fs.writeFile(parentId, name, content);

      // 更新内部 ID，这会将 Notebook 切换为"编辑模式"
      setInternalFileId(newFile.id);
      lastContentRef.current = content;

      // 关闭弹窗并更新状态
      setSaveModalVisible(false);
      setStatus("saved");

      // 可选：通知父级应用文件已创建 (如果需要改变 URL 或 标题)
      // if (onFileCreated) onFileCreated(newFile);

    } catch (e) {
      alert(`保存失败: ${e.message}`);
    }
  };

  // 统一的保存入口
  const triggerSave = () => {
    if (isReadOnly) return;

    if (internalFileId) {
      // 已有文件 -> 直接更新
      performUpdate(content);
    } else {
      // 新文件 -> 弹出另存为窗口
      setSaveModalVisible(true);
    }
  };

  // 自动保存逻辑 (仅针对已有文件)
  const handleInput = (e) => {
    const newVal = e.target.value;
    setContent(newVal);

    if (timerRef.current) clearTimeout(timerRef.current);

    // 只有已经保存过文件(有ID)才自动保存，新建文件不自动保存
    if (internalFileId) {
      timerRef.current = setTimeout(() => {
        performUpdate(newVal);
      }, 3000);
    } else {
      setStatus("unsaved"); // 新建文件输入内容后变为 unsaved
    }
  };

  // --- 快捷键处理 (Ctrl+S) ---
  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      triggerSave();
    }
  };

  // ---  UI 交互逻辑 ---
  const handleScroll = () => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCursorActivity = (e) => {
    const el = e.target;
    const val = el.value;
    const selectionStart = el.selectionStart;
    const textBeforeCursor = val.substring(0, selectionStart);
    const lines = textBeforeCursor.split("\n");
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;
    setCursorInfo({ line: currentLine, col: currentCol });
  };

  const lineNumbers = useMemo(() => {
    const lines = content.split("\n").length;
    const count = Math.max(lines, 1);
    return Array.from({ length: count }, (_, i) => i + 1);
  }, [content]);

  return (
    <div className={style[bem.b()]}>
      <div className={style[bem.e('body')]}>
        <div className={style[bem.e('gutter')]} ref={lineNumRef}>
          {lineNumbers.map((num) => (
            <div key={num} className={style[bem.e('linenum')]}>{num}</div>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          className={style[bem.e('editor')]}
          value={content}
          readOnly={isReadOnly}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onSelect={handleCursorActivity}
          onKeyUp={handleCursorActivity}
          spellCheck={false}
          placeholder={internalFileId ? "" : "开始输入... [Ctrl+S 保存]"}
        />
      </div>

      <div className={style[bem.e('statusbar')]}>
        <div className={style[bem.em('statusbar', 'left')]}></div>
        <div className={style[bem.em('statusbar', 'item')]}>
           {!internalFileId ? '未保存' : ''}
           {status === 'saving' ? '正在保存...' : ''}
           {status === 'saved' ? '已保存' : ''}
           {status === 'error' ? '保存失败' : ''}
        </div>
        <div className={style[bem.em('statusbar', 'divider')]}></div>
        <div className={style[bem.em('statusbar', 'item')]}>
           行: {cursorInfo.line}, 列: {cursorInfo.col}
        </div>
        <div className={style[bem.em('statusbar', 'divider')]}></div>
        <div className={style[bem.em('statusbar', 'item')]}>UTF-8</div>
      </div>

      {/* 另存为弹窗 */}
      <SaveModal
        visible={isSaveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        onConfirm={handleCreateFile}
      />
    </div>
  );
}

export default Notebook;
