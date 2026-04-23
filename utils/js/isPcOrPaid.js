/**
 * 版本1: 获取设备基本信息
 * @returns {Object} 设备基本信息对象
 */
const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase()

  return {
    type: 'desktop', // 默认值，会在后续逻辑中更新
    userAgent: ua,
    screen: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    orientation: window.screen.height > window.screen.width ? 'portrait' : 'landscape',
    isTablet: false,
  }
}

/**
 * 版本2: 布尔类型分类
 * @returns {boolean} true=desktop/平板, false=mobile
 */
const isDesktopDevice = () => {
  const ua = navigator.userAgent.toLowerCase()

  // 平板设备归为desktop
  if (/ipad|tablet|playbook|kindle/.test(ua)) {
    return true
  }

  // 移动设备检测
  if (/mobile|android|iphone|ipod|blackberry|windows phone|webos|opera mini|iemobile/.test(ua)) {
    return false
  }

  // 屏幕尺寸辅助判断
  if (window.innerWidth < 768 && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return false
  }

  return true
}

/**
 * 版本3: 返回基本信息和布尔数据
 * @returns {Object} 完整的设备信息对象
 */
const getCompleteDeviceInfo = () => {
  const basicInfo = getDeviceInfo()
  const isDesktop = isDesktopDevice()

  // 根据布尔分类更新基本信息
  const deviceInfo = {
    ...basicInfo,
    type: isDesktop ? 'desktop' : 'mobile',
    isDesktop: isDesktop,
    isMobile: !isDesktop,
  }

  // 检测是否为平板
  const isTablet = /ipad|tablet|playbook|kindle/.test(deviceInfo.userAgent)
  deviceInfo.isTablet = isTablet

  return deviceInfo
}

/*
console.log('=== 版本1: 基本信息 ===')
const basicInfo = getDeviceInfo()
console.log(basicInfo)

console.log('=== 版本2: 布尔分类 ===')
const isDesktop = isDesktopDevice()
console.log('是否是桌面设备:', isDesktop)

console.log('=== 版本3: 完整信息 ===')
const completeInfo = getCompleteDeviceInfo()
console.log(completeInfo)

// 实际应用示例
if (isDesktopDevice()) {
  console.log('加载桌面版界面')
  // 桌面端逻辑
} else {
  console.log('加载移动端界面')
  // 移动端逻辑
}
*/
// 导出供其他模块使用
export {getDeviceInfo, isDesktopDevice, getCompleteDeviceInfo}
