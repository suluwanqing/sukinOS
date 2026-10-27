export const dataType = [
  'Json',
  'Array',
  'String',
  'Number',
  'Object',
  'Image',
  'Video',
  'Audio',
  'Txt',
  'Html',
  'Binary', // 增加通用二进制类型
]

const textDecoder = new TextDecoder('utf-8')
function base64ToBlob(base64Data, defaultMime = 'application/octet-stream') {
  let mime = defaultMime
  let base64 = base64Data

  if (base64Data.includes(',')) {
    const parts = base64Data.split(',')
    const match = parts[0].match(/:(.*?);/)
    if (match) mime = match[1]
    base64 = parts[1]
  }

  base64 = base64.replace(/\s/g, '')
  const mod4 = base64.length % 4
  if (mod4 > 0) base64 = base64.padEnd(base64.length + (4 - mod4), '=')

  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return new Blob([bytes], {type: mime})
}

export const dataToBase64Mapper = async (data, inputType) => {
  if (data === undefined || data === null) return null

  // 如果本身就是 File 或 Blob，且不是明确的文本/代码，直接原样存入 Blob，绝不转 text()！
  if (
    (data instanceof Blob || data instanceof File) &&
    inputType !== 'Txt' &&
    inputType !== 'Html' &&
    inputType !== 'Json'
  ) {
    return data
  }

  // 结构化对象/数组
  if (['Array', 'Object', 'Json'].includes(inputType)) {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch {
        return data
      }
    }
    return data
  }

  // 基础类型
  if (inputType === 'Number') return Number(data)

  // 纯文本类（严格确认是纯文本时才走 text()）
  if (inputType === 'Txt' || inputType === 'Html' || inputType === 'String') {
    if (data instanceof Blob) {
      // 容错：如果用户强行把 pdf/docx 传给 Txt，检测 mime，如果是 zip/pdf 坚决不转 text
      const type = data.type.toLowerCase()
      if (type.includes('pdf') || type.includes('officedocument') || type.includes('zip')) {
        return data // 拦截保护，不破坏二进制
      }
      return await data.text()
    }
    return String(data)
  }

  // 多媒体与通用二进制（PDF、Office、音视频等）：存为纯正的 Blob
  if (data instanceof Blob) return data
  if (data instanceof ArrayBuffer) return new Blob([data])
  if (ArrayBuffer.isView(data)) return new Blob([data.buffer])
  if (typeof data === 'string') return base64ToBlob(data)

  return data
}

export const dataDeBase64Mapper = async (storedData, targetType) => {
  if (storedData === undefined || storedData === null) return storedData

  // 如果取出来已经是 Blob，且目标是非文本（PDF/Office/媒体），直接原样返回给业务层
  if (storedData instanceof Blob) {
    if (targetType === 'Txt' || targetType === 'Html' || targetType === 'String') {
      // 如果内容是 PDF/Office，不要调用 text()，直接返回 Blob
      if (storedData.type.includes('pdf') || storedData.type.includes('officedocument')) {
        return storedData
      }
      return await storedData.text()
    }
    return storedData
  }

  //文本类还原
  if (targetType === 'String' || targetType === 'Txt' || targetType === 'Html') {
    if (storedData instanceof ArrayBuffer) return textDecoder.decode(new Uint8Array(storedData))
    return String(storedData)
  }

  if (targetType === 'Number') return Number(storedData)

  // 结构化对象
  if (['Array', 'Object', 'Json'].includes(targetType)) {
    if (typeof storedData === 'string') {
      try {
        return JSON.parse(storedData)
      } catch {
        return storedData
      }
    }
    return storedData
  }

  // 复杂二进制与媒体类
  if (storedData instanceof ArrayBuffer) return new Blob([storedData])
  if (typeof storedData === 'string') return base64ToBlob(storedData)

  return storedData
}
