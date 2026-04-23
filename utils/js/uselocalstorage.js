// 添加数据到localStorage
export const addToLocalStorage = (key, path, value) => {
  try {
    // 获取当前存储的数据
    const storedData = JSON.parse(localStorage.getItem(key)) || {}
    // 如果path存在，则按照路径结构存储
    if (path) {
      const pathParts = path.split('.')
      let current = storedData
      // 遍历路径，构建嵌套结构
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        if (!current[part]) {
          current[part] = {}
        }
        current = current[part]
      }
      // 在最后一级路径设置值
      current[pathParts[pathParts.length - 1]] = value
    } else {
      // 如果没有路径，直接存储为顶级键值
      storedData[key] = value
    }
    // 保存回localStorage
    localStorage.setItem(key, JSON.stringify(storedData))
    return true
  } catch (error) {
    console.error('添加失败:', error)
    return false
  }
}

// 从localStorage删除数据
export const deleteForLocalStorage = (key, path) => {
  try {
    const storedData = JSON.parse(localStorage.getItem(key))
    if (!storedData) return false
    if (path) {
      const pathParts = path.split('.')
      let current = storedData
      // 遍历到路径的倒数第二级
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i]
        if (!current[part]) return false
        current = current[part]
      }
      // 删除最后一级的属性
      delete current[pathParts[pathParts.length - 1]]
    } else {
      // 如果没有路径，直接删除整个key
      localStorage.removeItem(key)
      return true
    }
    // 保存修改后的数据
    localStorage.setItem(key, JSON.stringify(storedData))
    return true
  } catch (error) {
    console.error('删除错误:', error)
    return false
  }
}

// 从localStorage加载数据
export const loadFromLocalStorage = (key, path) => {
  try {
    const storedData = JSON.parse(localStorage.getItem(key))
    if (!storedData) return null
    if (path) {
      const pathParts = path.split('.')
      let current = storedData
      // 按照路径查找值
      for (const part of pathParts) {
        if (current[part] === undefined) return null
        current = current[part]
      }
      return current
    }
    // 如果没有路径，返回整个数据
    return storedData
  } catch (error) {
    console.error('加载错误:', error)
    return null
  }
}
