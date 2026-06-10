import {createTransform} from 'redux-persist'
const createPiniaStyleTransform = (persistPaths = []) => {
  // 路径配置标准化
  const normalizedPaths = persistPaths.map(path => {
    if (typeof path === 'string') {
      return {
        path,
        inbound: value => value,
        outbound: value => value,
      }
    }
    return {
      path: path.path,
      inbound: path.inbound || (value => value),
      outbound: path.outbound || (value => value),
    }
  })

  // 根据路径获取嵌套值
  const getValueByPath = (obj, path) => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  // 根据路径设置嵌套值
  const setValueByPath = (obj, path, value) => {
    const keys = path.split('.')
    const lastKey = keys.pop()
    const target = keys.reduce((current, key) => {
      if (current[key] === undefined || current[key] === null) {
        current[key] = {}
      }
      return current[key]
    }, obj)
    target[lastKey] = value
    return obj
  }

  // 深拷贝
  const deepClone = obj => {
    if (obj === null || typeof obj !== 'object') return obj
    if (obj instanceof Date) return new Date(obj)
    if (obj instanceof Array) return obj.map(deepClone)

    const cloned = {}
    Object.keys(obj).forEach(key => {
      cloned[key] = deepClone(obj[key])
    })
    return cloned
  }

  // 入站转换 - 只保留配置的路径数据
  const inboundTransform = (inboundState, key, fullState) => {
    if (!normalizedPaths.length) return inboundState
    const result = {}
    normalizedPaths.forEach(({path, inbound}) => {
      const value = getValueByPath(inboundState, path)
      if (value !== undefined) {
        const transformedValue = inbound(value, key, fullState)
        setValueByPath(result, path, transformedValue)
      }
    })

    return result
  }

  // 出站转换 - 将持久化的数据合并回状态
  const outboundTransform = (outboundState, key, fullState) => {
    if (!normalizedPaths.length || !outboundState) return fullState

    const result = deepClone(fullState)

    normalizedPaths.forEach(({path, outbound}) => {
      const persistedValue = getValueByPath(outboundState, path)
      if (persistedValue !== undefined) {
        const transformedValue = outbound(persistedValue, key, fullState)
        setValueByPath(result, path, transformedValue)
      }
    })

    return result
  }

  return createTransform(inboundTransform, outboundTransform)
}

export default createPiniaStyleTransform
