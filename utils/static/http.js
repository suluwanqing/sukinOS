export const httpStatusCodes = [
  // 信息响应 (1xx)
  {value: 100, label: 'Continue - 继续'},
  {value: 101, label: 'Switching Protocols - 切换协议'},
  // 成功响应 (2xx)
  {value: 200, label: 'OK - 请求成功'},
  {value: 201, label: 'Created - 已创建'},
  {value: 202, label: 'Accepted - 已接受'},
  {value: 204, label: 'No Content - 无内容'},
  {value: 206, label: 'Partial Content - 部分内容'},
  // 重定向 (3xx)
  {value: 301, label: 'Moved Permanently - 永久移动'},
  {value: 302, label: 'Found - 临时移动'},
  {value: 304, label: 'Not Modified - 未修改'},
  {value: 307, label: 'Temporary Redirect - 临时重定向'},
  // 客户端错误 (4xx)
  {value: 400, label: 'Bad Request - 错误请求'},
  {value: 401, label: 'Unauthorized - 未授权'},
  {value: 403, label: 'Forbidden - 禁止访问'},
  {value: 404, label: 'Not Found - 未找到'},
  {value: 405, label: 'Method Not Allowed - 方法不允许'},
  {value: 408, label: 'Request Timeout - 请求超时'},
  {value: 409, label: 'Conflict - 冲突'},
  {value: 413, label: 'Payload Too Large - 请求实体过大'},
  {value: 414, label: 'URI Too Long - 请求 URI 过长'},
  {value: 415, label: 'Unsupported Media Type - 不支持的媒体类型'},
  {value: 429, label: 'Too Many Requests - 请求过多'},
  // 服务器错误 (5xx)
  {value: 500, label: 'Internal Server Error - 服务器内部错误'},
  {value: 501, label: 'Not Implemented - 未实现'},
  {value: 502, label: 'Bad Gateway - 错误网关'},
  {value: 503, label: 'Service Unavailable - 服务不可用'},
  {value: 504, label: 'Gateway Timeout - 网关超时'},
]
