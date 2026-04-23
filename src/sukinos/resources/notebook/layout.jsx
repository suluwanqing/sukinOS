import React, { useRef, useState, useEffect, useMemo } from "react"
import style from "./style.module.css"
import { createNamespace } from '/utils/js/classcreate'
import fs from '@/sukinos/utils/file/fileKernel'
import SaveModal from './saveModal/layout'
import {alert} from "@/component/alert/layout"
import useFileSystem from "@/sukinos/hooks/useFileSystem"
import { FileType } from "@/sukinos/utils/config"
import { generateShortId } from "/utils/js/rootSeed"

const bem = createNamespace('notebook')
function Notebook({ id, onStatusChange, state, handleFocus }) {
  // --- 引入 hook 状态和操作 ---
  const {
      state: { isReady, handleRegistry },
      operation: { handleOpenFile,handleSave }
  } = useFileSystem(state?.mode)

  // --- 状态管理 ---
  // 优先使用 props 或 state 中的 ID，如果没有，说明是"新建模式"
  const [internalid, setInternalid] = useState(id || state?.id || null)
  const [content, setContent] = useState("");
  const [status, setStatus] = useState("ready");
  const [cursorInfo, setCursorInfo] = useState({ line: 1, col: 1 })

  // 模态框状态
  const [isSaveModalVisible, setSaveModalVisible] = useState(false)

  // 只有当没有 id 且 explicitly 设置为只读时才只读？
  // 现在的逻辑：没有 id = 新建文件（可编辑）；有 id = 编辑现有文件。
  // 如果需要强制只读模式，可以由 props 控制，这里默认都可编辑。
  const isReadOnly = false

  // --- Refs ---
  const textareaRef = useRef(null)
  const lineNumRef = useRef(null)
  const timerRef = useRef(null)
  const lastContentRef = useRef("")

  // --- 初始化时执行 handleFocus ---
  useEffect(() => {
    if (handleFocus) {
      handleFocus()
    }
  }, [state.id])

  // --- 监听 state 变化，重新获取文件 ---
  useEffect(() => {
    if (state?.id && state.id !== internalid) {
      setInternalid(state.id)
    }
  }, [state.id, internalid])

  // --- 加载文件逻辑 ---
  useEffect(() => {
    // 如果有 internalid，去读取文件内容
    if (internalid) {
      let isMounted = true
      const loadFile = async () => {
        try {
          setStatus("loading")
          let text = ""
            // 将 ...state 放在前面，确保最后覆盖的是真正当前环境下的 internalid 和内容，
            // 避免外层旧状态将 id 冲刷覆盖[因为internalid是实时更新的/新的]
              const res = await handleOpenFile({ ...state, id: internalid, content:null })
              if (res && res.content !== undefined) {
                  text = res.content
              } else {
                  throw new Error("本地文件读取失败!")
              }
          if (isMounted) {
            setContent(text || "")
            lastContentRef.current = text || ""
            setStatus("saved")
          }
        } catch (e) {
          console.error("文件读取失败:", e)
          setStatus("error")
        }
      };
      if(isReady) loadFile()
      return () => { isMounted = false}
    } else {
      // 如果没有 ID，就是新建空白文件
      setContent("")
      lastContentRef.current = ""
      setStatus("ready")// 这里的 ready 表示新建未保存
    }
  }, [internalid,isReady])


  // 执行保存 (针对已有文件)
  const performUpdate = async (textToSave) => {
    try {
      setStatus("saving")
      if (textToSave === lastContentRef.current) {
        setTimeout(() => setStatus("saved"), 200)
        return;
      }
      //确保传入内核的 id 是内部准确跟踪的 internalid
      await handleSave({ ...state, id: internalid, content: textToSave })
      lastContentRef.current = textToSave
      setStatus("saved")
      if (onStatusChange) onStatusChange('saved');
      alert.success('文件保存成功！', { duration: 2000 })
    } catch (e) {
      // 错误输出改为字符串模板插值，防止传进组件无法正确渲染 Object 抛出错误阻断后续逻辑
      alert.failure(`保存失败: ${e.message || e}`)
      setStatus("error")
    }
  };

  // 执行新建保存 (来自 Modal)
  const handleCreateFile = async (name, parentId) => {
    try {
      // 创建文件
      let newid = null
      if (state?.mode === 'virtual') {
          const newFile = await fs.writeFile(parentId, name, content)
          newid = newFile.id
      } else if (state?.mode === 'local') {
          // Local 模式创建
          // handleRegistry 暴露出来的是一个 Map 对象实例，并非 useRef，去掉 .current
          const parentRecord = handleRegistry.get(parentId)
          if (!parentRecord || !parentRecord.handle) throw new Error("父文件夹句柄丢失!")
          const newHandle = await parentRecord.handle.getFileHandle(name, { create: true })
          const writable = await newHandle.createWritable()
          await writable.write(content)
          await writable.close()
          // 生成一个临时 ID 并注册到 registry，以便后续编辑
          newid = generateShortId()
          handleRegistry.set(newid, {
              handle: newHandle,
              parentId: parentId,
              name: name
          })

      }

      if (newid) {
          // 更新内部 ID，这会将 Notebook 切换为"编辑模式"
          setInternalid(newid)
          lastContentRef.current = content

          // 关闭弹窗并更新状态
          setSaveModalVisible(false)
          setStatus("saved")
      }
      alert.success('文件创建成功！', { duration: 2000 })
    } catch (e) {
        alert.failure(`保存失败: ${e.message}`)
    }
  }

  // 统一的保存入口
  const triggerSave = () => {
    if (isReadOnly) return

    if (internalid) {
      // 已有文件 -> 直接更新
      performUpdate(content)
    } else {
      // 新文件 -> 弹出另存为窗口
      setSaveModalVisible(true)
    }
  };

  // 自动保存逻辑 (仅针对已有文件)
  const handleInput = (e) => {
    const newVal = e.target.value
    setContent(newVal)

    if (timerRef.current) clearTimeout(timerRef.current)

    // 只有已经保存过文件(有ID)才自动保存，新建文件不自动保存
    if (internalid) {
      timerRef.current = setTimeout(() => {
        performUpdate(newVal);
      }, 3000)
    } else {
      setStatus("unsaved"); // 新建文件输入内容后变为 unsaved
    }
  }

  // --- 快捷键处理 (Ctrl+S) ---
  const handleKeyDown = (e) => {

    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      triggerSave()
    }
  };

  // ---  UI 交互逻辑 ---
  const handleScroll = () => {
    if (textareaRef.current && lineNumRef.current) {
      lineNumRef.current.scrollTop = textareaRef.current.scrollTop
    }
  };

  const handleCursorActivity = (e) => {
    const el = e.target
    const val = el.value
    const selectionStart = el.selectionStart
    const textBeforeCursor = val.substring(0, selectionStart)
    const lines = textBeforeCursor.split("\n")
    const currentLine = lines.length
    const currentCol = lines[lines.length - 1].length + 1
    setCursorInfo({ line: currentLine, col: currentCol })
  }

  const lineNumbers = useMemo(() => {
    const lines = content.split("\n").length
    const count = Math.max(lines, 1)
    return Array.from({ length: count }, (_, i) => i + 1)
  }, [content])

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
          placeholder={internalid ? "" : "开始输入... [Ctrl+S 保存]"}
        />
      </div>

      <div className={style[bem.e('statusbar')]}>
        <div className={style[bem.em('statusbar', 'left')]}></div>
        <div className={style[bem.em('statusbar', 'item')]}>
           {!internalid ? '未保存' : ''}
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

export default React.memo(Notebook);
