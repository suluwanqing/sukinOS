// 强制更新标记由内核统一检查后写入，离线时沿用上次缓存
const STORAGE_KEY = 'sukinos:forced-updates'

const readCache = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

let forcedMap = readCache()

const writeCache = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(forcedMap))
  } catch {
    //存储不可用时只保留内存态
  }
}

const normalize = (entries) => {
  const next = {}
  for (const item of entries || []) {
    const resourceId = String(item?.resourceId || '').trim()
    if (!resourceId || !item?.forced) continue
    next[resourceId] = {
      version: String(item.version || ''),
      appName: item.appName || '',
    }
  }
  return next
}

export function setForcedUpdates(entries) {
  forcedMap = normalize(entries)
  writeCache()
}

export function getForcedUpdate(resourceId) {
  return forcedMap[String(resourceId || '')] || null
}

export function clearForcedUpdate(resourceId) {
  const key = String(resourceId || '')
  if (!key || !forcedMap[key]) return
  delete forcedMap[key]
  writeCache()
}

