// OPFS 写入兜底：WebKit 只允许在 Worker 内用 createSyncAccessHandle 写文件。
// 目录句柄可直接结构化克隆传入，避免在主线程里重建路径。
self.onmessage = async (event) => {
  const { id, dirHandle, name, buffer } = event.data || {}

  try {
    if (!dirHandle || !name) throw new Error('缺少目录句柄或文件名')
    const fileHandle = await dirHandle.getFileHandle(name, { create: true })
    if (typeof fileHandle.createSyncAccessHandle !== 'function') {
      const unsupported = new Error('当前浏览器不支持写入本机文件')
      unsupported.name = 'LocalCapabilityError'
      throw unsupported
    }
    const accessHandle = await fileHandle.createSyncAccessHandle()

    try {
      accessHandle.truncate(0)
      accessHandle.write(new Uint8Array(buffer), { at: 0 })
      accessHandle.flush()
    } finally {
      accessHandle.close()
    }

    self.postMessage({ id, ok: true })
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: { name: err?.name || 'Error', message: err?.message || String(err) },
    })
  }
}
