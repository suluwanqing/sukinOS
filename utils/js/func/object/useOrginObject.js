export class ObjectHandler {
  constructor(dataSource) {
    this.dataSource = dataSource
  }

  findAndUpdateValue(key, newValue) {
    if (this.dataSource.hasOwnProperty(key)) {
      this.dataSource[key] = newValue
      return true
    }
    for (const k in this.dataSource) {
      if (typeof this.dataSource[k] === 'object' && this.dataSource[k] !== null) {
        const isModified = new ObjectHandler(this.dataSource[k]).findAndUpdateValue(key, newValue)
        if (isModified) return true
      }
    }
    return false
  }

  findAndDeleteValue(key) {
    if (this.dataSource.hasOwnProperty(key)) {
      delete this.dataSource[key]
      return true
    }
    for (const k in this.dataSource) {
      if (typeof this.dataSource[k] === 'object' && this.dataSource[k] !== null) {
        const isDeleted = new ObjectHandler(this.dataSource[k]).findAndDeleteValue(key)
        if (isDeleted) return true
      }
    }
    return false
  }

  findAndAddValue(key, value) {
    this.dataSource[key] = value
    return true
  }

  findValuePath(targetKey) {
    const path = []
    const traverse = (obj, currentPath) => {
      for (const key in obj) {
        const newPath = currentPath ? `${currentPath}.${key}` : key
        if (key === targetKey) {
          path.push(newPath)
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          traverse(obj[key], newPath)
        }
      }
    }
    traverse(this.dataSource, '')
    return path.length > 0 ? path : null
  }

  findParentPath(targetKey) {
    let parentPath = null
    const traverse = (obj, currentPath) => {
      for (const key in obj) {
        const newPath = currentPath ? `${currentPath}.${key}` : key
        if (key === targetKey) {
          parentPath = currentPath
          return
        }
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          traverse(obj[key], newPath)
        }
      }
    }
    traverse(this.dataSource, '')
    return parentPath
  }
}

export const findAndUpdateValue = (obj, key, newValue) => {
  return new ObjectHandler(obj).findAndUpdateValue(key, newValue)
}

export const findAndDeleteValue = (obj, key) => {
  return new ObjectHandler(obj).findAndDeleteValue(key)
}

export const findAndAddValue = (obj, key, value) => {
  return new ObjectHandler(obj).findAndAddValue(key, value)
}

export const findValuePath = (obj, targetKey) => {
  return new ObjectHandler(obj).findValuePath(targetKey)
}

export const findParentPath = (obj, targetKey) => {
  return new ObjectHandler(obj).findParentPath(targetKey)
}

export default ObjectHandler
