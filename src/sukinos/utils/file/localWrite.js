export class LocalCapabilityError extends Error {
  constructor(message) {
    super(message)
    this.name = 'LocalCapabilityError'
  }
}

const support = { checked: false, move: false, writable: false, syncAccess: false, opfs: false }
export const probeLocalWrite = () => {
  if (support.checked) return support
  support.checked = true
  const proto = typeof FileSystemFileHandle !== 'undefined' ? FileSystemFileHandle.prototype : null
  support.move = typeof proto?.move === 'function'
  support.writable = typeof proto?.createWritable === 'function'
  support.syncAccess = typeof proto?.createSyncAccessHandle === 'function'
  support.opfs = typeof navigator !== 'undefined' && typeof navigator.storage?.getDirectory === 'function'
  console.info(
    `[OPFS] move=${support.move} writable=${support.writable} syncAccess=${support.syncAccess}`
  )
  return support
}

export const canWriteLocal = () => {
  const s = probeLocalWrite()
  // 主线程可能看不到 createSyncAccessHandle（只在 Worker 内可用），
  // 只要存在 OPFS 目录就放行，真正能力由 Worker 现场判定
  return s.writable || s.syncAccess || s.opfs
}

let worker = null
let workerFailed = false
let seq = 0
const pending = new Map()

const rejectAll = (reason) => {
  pending.forEach(({ reject }) => reject(reason))
  pending.clear()
}

const getWorker = () => {
  if (worker) return worker
  if (workerFailed) throw new LocalCapabilityError('本机文件写入通道不可用')
  try {
    worker = new Worker(new URL('./opfsWrite.worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = (event) => {
      const { id, ok, error } = event.data || {}
      const task = pending.get(id)
      if (!task) return
      pending.delete(id)
      if (ok) {
        task.resolve()
        return
      }
      const err = new Error(error?.message || 'OPFS 写入失败')
      err.name = error?.name || 'Error'
      task.reject(err)
    }
    worker.onerror = () => {
      workerFailed = true
      worker = null
      rejectAll(new LocalCapabilityError('本机文件写入线程异常'))
    }
    return worker
  } catch {
    workerFailed = true
    throw new LocalCapabilityError('本机文件写入线程创建失败')
  }
}

const toArrayBuffer = async (content) => {
  if (content instanceof ArrayBuffer) return content
  if (content instanceof Blob) return content.arrayBuffer()
  if (ArrayBuffer.isView(content)) {
    return content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength)
  }
  if (typeof content === 'string') return new TextEncoder().encode(content).buffer
  if (content == null) return new ArrayBuffer(0)
  return new TextEncoder().encode(JSON.stringify(content)).buffer
}

const writeViaWorker = async (dirHandle, name, content) => {
  const buffer = await toArrayBuffer(content)
  const w = getWorker()
  const id = ++seq
  await new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    w.postMessage({ id, dirHandle, name, buffer }, [buffer])
  })
}

const toWritablePayload = (content) => {
  if (content instanceof Blob || ArrayBuffer.isView(content) || content instanceof ArrayBuffer) return content
  if (typeof content === 'string') return content
  if (content == null) return ''
  return JSON.stringify(content)
}

/** 直接用文件句柄写入（仅当 createWritable 可用） */
export const writeLocalHandle = async (handle, content) => {
  if (!handle) throw new LocalCapabilityError('文件句柄不存在')
  if (typeof handle.createWritable !== 'function') {
    throw new LocalCapabilityError('当前浏览器不支持写入本机文件')
  }
  const writable = await handle.createWritable()
  try {
    await writable.write(toWritablePayload(content))
  } finally {
    await writable.close()
  }
}

/**
 * 写入本地文件：有 createWritable 就直接写；WebKit 走 Worker 同步访问句柄。
 * content 支持 Blob / ArrayBuffer / TypedArray / string / 可序列化对象。
 */
export const writeLocalFile = async (dirHandle, name, content) => {
  if (!dirHandle || !name) throw new LocalCapabilityError('目标目录句柄或文件名不存在')
  const fileHandle = await dirHandle.getFileHandle(name, { create: true })

  if (typeof fileHandle.createWritable === 'function') {
    await writeLocalHandle(fileHandle, content)
    return fileHandle
  }

  // WebKit 只在 Worker 内暴露 createSyncAccessHandle，主线程无从判断，直接交给 Worker
  await writeViaWorker(dirHandle, name, content)
  return fileHandle
}

/** 读旧名 → 写新名 → 删旧名（无 move 时的兜底） */
export const renameLocalFile = async (parentHandle, oldName, newName) => {
  const handle = await parentHandle.getFileHandle(oldName)

  if (typeof handle.move === 'function') {
    await handle.move(newName)
    return
  }

  const data = await (await handle.getFile()).arrayBuffer()
  await writeLocalFile(parentHandle, newName, data)
  await parentHandle.removeEntry(oldName)
}

/** 跨目录移动文件（无 move 时的兜底） */
export const moveLocalFile = async (sourceParent, destParent, name) => {
  const handle = await sourceParent.getFileHandle(name)

  if (typeof handle.move === 'function') {
    await handle.move(destParent, name)
    return
  }

  const data = await (await handle.getFile()).arrayBuffer()
  await writeLocalFile(destParent, name, data)
  await sourceParent.removeEntry(name)
}

/** 统一把本地盘异常转成可展示的文案 */
export const describeLocalError = (err, fallback = '操作失败') => {
  const name = err?.name || ''
  if (name === 'LocalCapabilityError') return err.message
  if (name === 'NotFoundError') return '文件已不存在，请刷新后重试'
  if (name === 'NotAllowedError' || name === 'SecurityError') return '浏览器拒绝了本机文件访问，请重新挂载'
  if (name === 'InvalidModificationError') return '目标位置已存在同名项目'
  if (name === 'TypeError') return '当前浏览器不支持该本机文件操作'
  return err?.message || fallback
}
