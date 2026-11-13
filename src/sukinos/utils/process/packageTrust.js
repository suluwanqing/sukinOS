const ED25519_ALG = 'Ed25519'

const HEX_PATTERN = /^[0-9a-f]+$/i

function hexToBytes(hex) {
  if (!HEX_PATTERN.test(hex) || hex.length % 2 !== 0) throw new Error('签名格式非法')
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

function base64ToBytes(text) {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function publicKeyBytes(text) {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null
  //公钥允许 hex(64) 或 base64(44)，按长度与字符集判断
  if (trimmed.length === 64 && HEX_PATTERN.test(trimmed)) return hexToBytes(trimmed)
  return base64ToBytes(trimmed)
}

export function toPackageBytes(raw) {
  if (raw instanceof Uint8Array) return raw
  if (raw instanceof ArrayBuffer) return new Uint8Array(raw)
  if (ArrayBuffer.isView(raw)) return new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength)
  if (typeof raw === 'string') return new TextEncoder().encode(raw)
  return new Uint8Array(0)
}

export async function sha256Hex(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前环境不支持内容校验，已拒绝安装')
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function verifyEd25519(publicKey, signatureBytes, messageBytes) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('当前环境不支持签名校验，已拒绝安装')
  }
  const key = await globalThis.crypto.subtle.importKey(
    'raw', publicKey, { name: ED25519_ALG }, false, ['verify'],
  )
  return globalThis.crypto.subtle.verify(ED25519_ALG, key, signatureBytes, messageBytes)
}

export function manifestMessage(resourceId, version, contentHash) {
  return new TextEncoder().encode(`${resourceId}\n${version}\n${contentHash}`)
}

/**
 * 下载后的第一道闸门：空包、哈希不符、签名不符都拒绝。
 * 迁移前无哈希的旧包告警放行；配置公钥后必须带签名。
 */
export async function verifyRemotePackage(app, raw) {
  const isBinary = typeof raw === 'string' || raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)
  if (!isBinary) {
    throw new Error(raw?.message || '安装包下载失败，请稍后重试')
  }
  const bytes = toPackageBytes(raw)
  if (!bytes.length) throw new Error('安装包为空（0 字节），已拒绝安装')

  const resourceId = String(app?.resourceId || '')
  const version = String(app?.version || '')
  const expectedHash = String(app?.contentHash || '').toLowerCase()
  const publicKey = publicKeyBytes(import.meta.env.VITE_APP_SIGN_PUBLIC_KEY)

  if (!expectedHash) {
    console.warn(`[包校验] ${resourceId || app?.appName} 缺少内容哈希（迁移前旧包），仅做基础校验`)
    return new TextDecoder().decode(bytes)
  }

  const actualHash = await sha256Hex(bytes)
  if (actualHash !== expectedHash) {
    throw new Error('安装包内容校验失败，文件可能被篡改，已拒绝安装')
  }

  if (!publicKey) return new TextDecoder().decode(bytes)

  if (!app?.signature || !app?.signKeyId) {
    throw new Error('安装包缺少签名，已拒绝安装')
  }
  const expectedKeyId = String(import.meta.env.VITE_APP_SIGN_KEY_ID || '').trim()
  if (expectedKeyId && expectedKeyId !== String(app.signKeyId)) {
    throw new Error(`安装包签名密钥不匹配：预期 ${expectedKeyId}，实际 ${app.signKeyId}`)
  }

  let signatureBytes
  try {
    signatureBytes = hexToBytes(String(app.signature))
  } catch {
    throw new Error('安装包签名格式非法，已拒绝安装')
  }
  const verified = await verifyEd25519(publicKey, signatureBytes, manifestMessage(resourceId, version, expectedHash))
  if (!verified) throw new Error('安装包签名校验失败，已拒绝安装')
  return new TextDecoder().decode(bytes)
}
