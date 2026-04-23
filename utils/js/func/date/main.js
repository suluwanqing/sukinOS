const formatTime = () => new Date().toLocaleString('sv').replace(' ', ' ')
// 输出: 2025-12-27 16:55:52
const formatTimeSlash = () => new Date().toLocaleString('sv').replace(' ', ' ').replace(/-/g, '/')
 // 输出: 2025/12/27 16:55:52
export {formatTime, formatTimeSlash}
