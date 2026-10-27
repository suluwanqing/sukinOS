import {getStore, STORES} from '@/sukinos/utils/_db'
import fs from '@/sukinos/utils/file/fileKernel'

const recentsStore = getStore(STORES.VIEWER_RECENTS.name)
const settingsStore = getStore(STORES.VIEWER_SETTINGS.name)

const MAX_RECENTS_COUNT = 40

const DEFAULT_CONFIG = {
  isAutoPlayEnabled: false, // 是否开启自动轮播 (默认关闭！)
  playlistFolderId: null, // 指定的轮播目录 ID
  playlistFolderName: '', // 指定的轮播目录名字
  playlistMode: 'virtual', // 指定目录的盘符
  allowHybrid: true, // 是否图视混播
  imageDelay: 5, // 图片停留时间
  loopMode: 'list', // 'list' | 'single'
  isMixingBoard: false, // 是否开启多元素同台画板
}

export async function saveViewerConfig(config) {
  try {
    const prev = await getViewerConfig()
    await settingsStore.put({
      id: 'viewer_runtime_config',
      data: {...prev, ...config},
      updatedAt: Date.now(),
    })
  } catch (err) {
    console.warn('[ViewerDB] 保存配置失败:', err)
  }
}

export async function getViewerConfig() {
  try {
    const res = await settingsStore.get('viewer_runtime_config')
    return res?.data ? {...DEFAULT_CONFIG, ...res.data} : DEFAULT_CONFIG
  } catch (err) {
    return DEFAULT_CONFIG
  }
}

export async function recordRecentFile(fileItem) {
  if (!fileItem || !fileItem.id) return
  try {
    const safeMode = fileItem.mode || 'virtual'
    const entryId = `${safeMode}_${fileItem.id}`

    const entry = {
      id: entryId,
      fileId: fileItem.id,
      name: fileItem.name || '未命名文件',
      mode: safeMode,
      parentId: fileItem.parentId || 'root',
      category: fileItem.category || 'unknown',
      size: Number(fileItem.size) || 0,
      lastOpenedAt: Date.now(),
    }
    await recentsStore.put(entry)

    const all = await recentsStore.getAll()
    if (all.length > MAX_RECENTS_COUNT) {
      all.sort((a, b) => (a.lastOpenedAt || 0) - (b.lastOpenedAt || 0))
      const toDelete = all.slice(0, all.length - MAX_RECENTS_COUNT)
      for (const item of toDelete) {
        await recentsStore.delete(item.id)
      }
    }
  } catch (err) {
    console.warn('[ViewerDB] 记录失败:', err)
  }
}

export async function getRecentFilesWithHealthCheck(handleRegistry) {
  try {
    const list = await recentsStore.getAll()
    if (!Array.isArray(list) || list.length === 0) return []

    const checkedList = await Promise.all(
      list.map(async item => {
        let isHealthy = false
        try {
          if (item.mode === 'virtual') {
            const fileData = fs.readFile(item.fileId)
            isHealthy = fileData !== undefined && fileData !== null
          } else if (item.mode === 'local') {
            if (handleRegistry) {
              const record = handleRegistry.get(item.fileId)
              isHealthy = !!(record && record.handle)
            }
          }
        } catch (e) {
          isHealthy = false
        }

        return {
          ...item,
          isHealthy,
        }
      })
    )

    return checkedList.sort((a, b) => (b.lastOpenedAt || 0) - (a.lastOpenedAt || 0))
  } catch (err) {
    console.error('[ViewerDB] 检查健康度异常:', err)
    return []
  }
}

export async function clearInvalidRecents(invalidIds = []) {
  try {
    for (const id of invalidIds) {
      await recentsStore.delete(id)
    }
    const currentActive = await settingsStore.get('last_active_file')
    if (currentActive && invalidIds.includes(`${currentActive.mode}_${currentActive.fileId}`)) {
      await settingsStore.delete('last_active_file')
    }
  } catch (err) {
    console.error('[ViewerDB] 批量移除失效记录异常:', err)
  }
}

export async function removeRecentFile(uniqueId) {
  try {
    await recentsStore.delete(uniqueId)
    const currentActive = await settingsStore.get('last_active_file')
    if (currentActive && `${currentActive.mode}_${currentActive.fileId}` === uniqueId) {
      await settingsStore.delete('last_active_file')
    }
  } catch (err) {}
}

export async function clearAllRecents() {
  try {
    await recentsStore.clear()
    await settingsStore.clear()
  } catch (err) {}
}

export async function saveLastActiveState(stateData) {
  if (!stateData || !stateData.id) return
  try {
    await settingsStore.put({
      id: 'last_active_file',
      fileId: stateData.id,
      name: stateData.name,
      mode: stateData.mode || 'virtual',
      parentId: stateData.parentId || 'root',
      savedAt: Date.now(),
    })
  } catch (err) {}
}

export async function getLastActiveState() {
  try {
    const allRecents = await recentsStore.getAll()
    if (!Array.isArray(allRecents) || allRecents.length === 0) {
      await settingsStore.clear()
      return null
    }

    const res = await settingsStore.get('last_active_file')
    if (!res || !res.fileId) return null

    const existsInRecents = allRecents.some(r => r.fileId === res.fileId && r.mode === res.mode)
    if (!existsInRecents) {
      await settingsStore.delete('last_active_file')
      return null
    }

    return {
      id: res.fileId,
      name: res.name || '未命名',
      mode: res.mode || 'virtual',
      parentId: res.parentId || 'root',
    }
  } catch (err) {
    return null
  }
}
