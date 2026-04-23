const reduceBoolean = inputArrayB => {
  if (inputArrayB.length === 0) {
    return []
  }

  const result = []
  let prevValue = inputArrayB[0]
  result.push(prevValue)

  for (let i = 1; i < inputArrayB.length; i++) {
    if (inputArrayB[i] !== prevValue) {
      // 当值发生变化时，添加到结果数组
      result.push(inputArrayB[i])
      prevValue = inputArrayB[i]
    }
    // 如果值相同，则跳过（不添加到结果数组）
  }
  // 用于连续 双 过滤的处理
  return result
}

//
const getBoolean = (inputArrayB, mode = 'last') => {
  const reducedArray = reduceBoolean(inputArrayB)
  if (reducedArray.length === 0) {
    return false
  }
  switch (mode) {
    case 'anyTrue':
      return reducedArray.some(item => item === true)
    case 'allTrue':
      return reducedArray.every(item => item === true)
    case 'anyFalse':
      return reducedArray.some(item => item === false)
    case 'allFalse':
      return reducedArray.every(item => item === false)
    case 'last':
    default:
      return reducedArray[reducedArray.length - 1]
  }
}
export {reduceBoolean, getBoolean}
