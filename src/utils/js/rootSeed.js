/**
 * 生成随机字符串种子
 * @param {number} length - 生成长度，默认8
 * @param {string} seed - 字符集，默认数字+大小写字母
 * @param {boolean} isNumber - 是否只生成数字，默认false
 * @returns {string} 随机字符串
 */
const generateShortSeed = (
  length = 8,
  seed = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
  isNumber = false
) => {
  // 参数验证
  if (length <= 0 || !Number.isInteger(length)) {
    throw new Error('Length must be a positive integer')
  }

  // 如果只需要数字，使用数字字符集
  const characters = isNumber ? '0123456789' : seed

  if (characters.length === 0) {
    throw new Error('Character seed cannot be empty')
  }

  let result = ''

  try {
    // 优先使用 crypto API（更安全）
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const values = new Uint32Array(length)
      crypto.getRandomValues(values)

      for (let i = 0; i < length; i++) {
        result += characters[values[i] % characters.length]
      }
    } else {
      // 降级方案：使用 Math.random（安全性较低）
      console.warn('crypto.getRandomValues not available, using Math.random as fallback')
      for (let i = 0; i < length; i++) {
        result += characters[Math.floor(Math.random() * characters.length)]
      }
    }
  } catch (error) {
    console.error('Error generating random seed:', error)
    // 终极降级方案
    for (let i = 0; i < length; i++) {
      result += characters[Math.floor(Math.random() * characters.length)]
    }
  }

  return result
}

//生成连接ID
export const generateConnectionId = () => {
  return `conn_${generateShortSeed(8)}_${Date.now().toString(36)}`
}

// 生成消息ID
export const generateMessageId = () => {
  return `msg_${generateShortSeed(6)}_${Date.now().toString(36)}`
}

//生成会话ID
export const generateSessionId = () => {
  return `sess_${generateShortSeed(12)}_${Date.now().toString(36)}`
}

//生成事务ID
export const generateTransactionId = () => {
  return `txn_${generateShortSeed(10)}_${Date.now().toString(36)}`
}

//生成纯数字ID
export const generateNumericId = (length = 6) => {
  return generateShortSeed(length, '0123456789', true)
}

//生成简短ID（无前缀，适合URL等场景）
export const generateShortId = (length = 8) => {
  return generateShortSeed(length, '0123456789abcdefghijklmnopqrstuvwxyz')
}

export default generateShortSeed
