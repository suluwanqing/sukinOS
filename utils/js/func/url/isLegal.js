export const isLegal = url => {
  // 基础检查：输入必须为非空字符串且以 '/' 开头
  if (typeof url !== 'string' || url.trim() === '' || !url.startsWith('/')) {
    return false
  }

  // 分离路径部分和查询参数部分
  const [pathPart, queryPart] = url.split('?')

  // 检查路径部分是否至少包含一个非根路径段（不能只是单独的 "/"）
  // 移除开头的斜杠后按斜杠分割路径段，并过滤掉空段（如由连续斜杠产生）
  const pathSegments = pathPart
    .substring(1)
    .split('/')
    .filter(segment => segment.length > 0)
  if (pathSegments.length === 0) {
    return false // 路径只有根目录 "/"，不符合要求（需要有具体路径）
  }

  // 检查路径段格式并验证 `{}` 占位符
  // 允许路径段包含：字母 (a-zA-Z)、数字 (0-9)、连字符 (-)、下划线 (_)、花括号 ({})
  const validSegmentRegex = /^[a-zA-Z0-9_{}-]+$/

  // 用于检查 `{}` 内数据的正则表达式：必须包含至少一个非数字字符（即不能全为数字，且不能为空）
  const dataInsideBracesRegex = /[^0-9]/

  // 遍历每个路径段进行检查
  for (const segment of pathSegments) {
    // 检查路径段是否只包含允许的字符
    if (!validSegmentRegex.test(segment)) {
      return false
    }

    // 检查花括号 `{}` 的配对和内容
    const openBraceIndices = []
    const closeBraceIndices = []

    // 收集所有左花括号 `{` 和右花括号 `}` 的位置
    for (let i = 0; i < segment.length; i++) {
      if (segment[i] === '{') {
        openBraceIndices.push(i)
      } else if (segment[i] === '}') {
        closeBraceIndices.push(i)
      }
    }

    // 检查左花括号和右花括号数量是否相等
    if (openBraceIndices.length !== closeBraceIndices.length) {
      return false // 花括号没有成对出现
    }
    // 规则：多个 `{}` 必须用 `/` 隔开，意味着它们不能位于同一个路径段内。
    // 因此，如果一个路径段内包含了任何一对花括号，即视为违规，除非整个段就是一个完整的 `{data}` 形式。
    // 这里我们检查一个段内是否有多于一对的花括号，或者花括号的配对顺序不正确。
    // 更精确地说：我们检查是否有一个右花括号后面紧跟着（中间无间隔）一个左花括号，即 `}{`，这表示它们在同一段内相邻。
    if (segment.includes('}{')) {
      return false // 在同一路径段内发现了相邻的 `}{`，违反必须用 `/` 隔开的规定
    }

    // 检查每一对 `{}` 内的数据
    for (let i = 0; i < openBraceIndices.length; i++) {
      const startIndex = openBraceIndices[i] + 1 // `{` 后面的字符位置
      const endIndex = closeBraceIndices[i] // `}` 的位置
      // 检查花括号内部是否有内容，以及右花括号是否在左花括号之后
      if (endIndex <= startIndex) {
        return false // 例如 `{}` 或 `}{` 无效情况
      }
      // 提取花括号内的内容
      const contentInside = segment.substring(startIndex, endIndex)
      // 检查内容：不能为空，且必须包含至少一个非数字字符
      if (contentInside.length === 0 || !dataInsideBracesRegex.test(contentInside)) {
        return false
      }
    }
  }
  if (queryPart) {
    // 去除可能存在的片段标识
    const pureQueryString = queryPart.split('#')[0]
    if (pureQueryString) {
      const params = pureQueryString.split('&')
      // 有效的查询参数格式：`key` 或 `key=` 或 `key=value`
      // key 通常由字母、数字、下划线、连字符组成
      const validParamRegex = /^[a-zA-Z0-9_-]+(=[^&]*)?$/
      for (const param of params) {
        // 检查每个参数是否符合格式
        if (!validParamRegex.test(param)) {
          return false
        }
      }
    }
  }
  return true
}
