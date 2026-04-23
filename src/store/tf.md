## 基本使用

```javascript
import createPiniaStyleTransform from './createPiniaStyleTransform'
// 类似pinia的风格,即可。
// 最简单的字符串路径配置
const basicTransform = createPiniaStyleTransform([
  'user.profile.name',
  'user.profile.avatar',
])

// 带转换函数的配置
const advancedTransform = createPiniaStyleTransform([
  // 字符串形式 - 简单路径
  'user.profile.name',

  // 对象形式 - 带转换函数
  {
    path: 'user.profile.avatar',
    inbound: (avatar) => {
      // 入站：压缩或转换图片路径
      return avatar ? avatar.replace('/original/', '/compressed/') : null
    },
    outbound: (avatar) => {
      // 出站：恢复原始路径
      return avatar ? avatar.replace('/compressed/', '/original/') : null
    }
  },
  {
    path: 'user.settings',
    inbound: (settings) => {
      // 入站：过滤敏感设置
      const { password, ...safeSettings } = settings
      return safeSettings
    },
    outbound: (settings) => {
      // 出站：确保默认值
      return {
        theme: 'light',
        language: 'zh-CN',
        ...settings
      }
    }
  },
  {
    path: 'education.courses',
    inbound: (courses) => {
      // 只持久化已发布的课程
      return courses.filter(course => course.published)
    },
    outbound: (courses) => {
      // 确保课程数组
      return Array.isArray(courses) ? courses : []
    }
  }
])

```
