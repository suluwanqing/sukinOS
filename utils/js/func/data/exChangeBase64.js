const dataType = [
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
]

const dataToBase64Mapper = async (data, inputType) => {
  let processedData

  switch (inputType) {
    case 'Json':
    case 'Array':
    case 'Object':
      if (typeof data === 'string') {
        try {
          JSON.parse(data)
          processedData = data
        } catch (e) {
          throw new Error(`无效的JSON/Array/Object字符串: ${e.message}`)
        }
      } else if (typeof data === 'object' && data !== null) {
        processedData = JSON.stringify(data)
      } else {
        throw new Error(`类型 ${inputType} 的输入数据格式不正确。`)
      }
      break

    case 'String':
      processedData = String(data)
      break

    case 'Number':
      if (typeof data !== 'number' && isNaN(Number(data))) {
        throw new Error('输入类型声明为数字，但实际数据无法转换为数字')
      }
      processedData = String(data)
      break

    case 'Image':
    case 'Video':
    case 'Audio':
    case 'Html':
    case 'Txt':
      if (data instanceof ArrayBuffer) {
        const bytes = new Uint8Array(data)
        processedData = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
      } else if (data instanceof Blob || data instanceof File) {
        processedData = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result
            if (typeof result === 'string') {
              if (result.startsWith('data:')) {
                const base64Part = result.split(',')[1]
                if (!base64Part) {
                  reject(new Error('无效的Data URL格式'))
                  return
                }
                resolve(atob(base64Part))
              } else {
                resolve(atob(result))
              }
            } else {
              const bytes = new Uint8Array(result)
              resolve(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
            }
          }
          reader.onerror = () => reject(new Error('文件读取失败'))
          reader.readAsDataURL(data)
        })
      } else if (typeof data === 'string') {
        if (data.startsWith('data:')) {
          const base64Part = data.split(',')[1]
          if (!base64Part) {
            throw new Error('无效的Data URL格式')
          }
          processedData = atob(base64Part)
        } else {
          processedData = atob(data)
        }
      } else {
        throw new Error(`不支持的多媒体数据类型: ${typeof data}`)
      }
      break

    default:
      throw new Error(`不支持的数据类型: ${inputType}`)
  }

  let base64String

  if (
    inputType === 'Image' ||
    inputType === 'Video' ||
    inputType === 'Audio' ||
    inputType === 'Txt' ||
    inputType === 'Html'
  ) {
    base64String = btoa(processedData)
  } else {
    if (typeof processedData !== 'string') {
      processedData = String(processedData)
    }
    base64String = btoa(unescape(encodeURIComponent(processedData)))
  }

  return base64String
}

const dataDeBase64Mapper = async (base64String, targetType) => {
  if (typeof base64String !== 'string') {
    throw new Error('Base64字符串必须是字符串类型')
  }

  base64String = base64String.replace(/\s/g, '')

  if (base64String.length % 4 !== 0) {
    base64String = base64String.padEnd(base64String.length + (4 - (base64String.length % 4)), '=')
  }

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64String)) {
    throw new Error('无效的Base64字符串')
  }

  let decodedData

  if (
    targetType === 'Image' ||
    targetType === 'Video' ||
    targetType === 'Audio' ||
    targetType === 'Txt' ||
    targetType === 'Html'
  ) {
    try {
      const binaryString = atob(base64String)

      if (targetType === 'Txt' || targetType === 'Html') {
        decodedData = binaryString
      } else {
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        decodedData = bytes.buffer
      }
    } catch (e) {
      throw new Error(`Base64解码失败: ${e.message}`)
    }
  } else {
    try {
      const decodedString = atob(base64String)
      try {
        decodedData = decodeURIComponent(escape(decodedString))
      } catch (e) {
        decodedData = decodedString
      }

      switch (targetType) {
        case 'Json':
          decodedData = JSON.parse(decodedData)
          break
        case 'Array':
          decodedData = JSON.parse(decodedData)
          if (!Array.isArray(decodedData)) {
            throw new Error('解码后的数据不是数组')
          }
          break
        case 'Number':
          const num = Number(decodedData)
          if (isNaN(num)) {
            throw new Error('解码后的数据不是一个有效的数字')
          }
          decodedData = num
          break
        case 'Object':
          decodedData = JSON.parse(decodedData)
          if (
            typeof decodedData !== 'object' ||
            decodedData === null ||
            Array.isArray(decodedData)
          ) {
            throw new Error('解码后的数据不是对象')
          }
          break
      }
    } catch (e) {
      throw new Error(`数据解码或转换失败: ${e.message}`)
    }
  }

  return decodedData
}

export {dataToBase64Mapper, dataDeBase64Mapper}
