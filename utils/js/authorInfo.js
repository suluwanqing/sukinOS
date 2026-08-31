import {getLatestSystemUpdate} from '@/apis/system/updateLog'

let LATEST_SYSTEM_UPDATE = '2026-05-29'
const formatTime = timeStr => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
//确保并发调用时强制等待第一次请求完成
let updatePromise = null
// 作为底层防护，确保整个页面生命周期内只打印一次
let hasPrinted = false


async function updateSystemDateCache() {
  // 如果已经有正在进行的请求 Promise，直接返回等待它完成
  if (updatePromise) return updatePromise
  //确保只执行一次网络请求
  updatePromise = (async () => {
    try {
      const res = await getLatestSystemUpdate()
      if (res?.code == 200 && res?.data?.createdAt) {
        // 格式化获取到的最新日期
        const formattedDate = formatTime(res.data.createdAt)
        LATEST_SYSTEM_UPDATE = formattedDate
      }
    } catch (err) {
    }
  })()

  return updatePromise
}

const PRESET_STYLES = {
  // 基础排版：使用等宽字体确保冒号完美对齐
  base: "font-family: 'Cascadia Code', Consolas, monospace; line-height: 2.2; font-size: 13px;",

  // 标题：青绿色发光，无渐变
  title:
    'color: #00e5ff; font-size: 16px; font-weight: bold; text-shadow: 0 0 5px rgba(0, 229, 255, 0.4);',

  // 分割线：暗青色
  divider: 'color: #455a64;',

  // --- 几何图标发光色 ---
  iconCyan: 'color: #00e5ff; font-size: 14px; text-shadow: 0 0 5px rgba(0, 229, 255, 0.8);',
  iconPurple: 'color: #b388ff; font-size: 14px; text-shadow: 0 0 5px rgba(179, 136, 255, 0.8);',
  iconBlue: 'color: #4fc3f7; font-size: 14px; text-shadow: 0 0 5px rgba(79, 195, 247, 0.8);',
  iconGreen: 'color: #69f0ae; font-size: 14px; text-shadow: 0 0 5px rgba(105, 240, 174, 0.8);',
  iconGray: 'color: #b0bec5; font-size: 14px; text-shadow: 0 0 5px rgba(176, 190, 197, 0.8);',
  iconYellow: 'color: #ffea00; font-size: 14px; text-shadow: 0 0 5px rgba(255, 234, 0, 0.8);',

  // 左侧属性标签
  label: 'color: #78909c; font-weight: bold;',

  // 右侧文本值
  value: 'color: #81c784;',
  // 链接颜色
  valueLink: 'color: #29b6f6; text-decoration: underline;',

  // 警告块
  warningTitle: 'color: #ff9800; font-weight: bold; text-shadow: 0 0 5px rgba(255, 152, 0, 0.4);',
  warningText: 'color: #ff9800;',
}

// 文本打印执行函数
function printMultiStyleText(textBlocks) {
  let consoleStr = ''
  let styles = []

  textBlocks.forEach(block => {
    consoleStr += '%c' + block.text
    let blockStyle = PRESET_STYLES[block.style] || block.style || ''
    styles.push(`${PRESET_STYLES.base} ${blockStyle}`)
  })

  console.log(consoleStr, ...styles)
}
// 缓存生成的 Base64 艺术字图片及 Canvas 宽度，避免高频渲染造成内存抖动
let cachedBase64Img = null
let cachedCanvasWidth = 0
// 核心主逻辑
async function printAuthorInfo() {
  try {
    //防止由于外部意外调用导致的多次打印
    if (hasPrinted) {
      return
    }
    // 确保在浏览器环境下执行
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }
    await updateSystemDateCache()
    // 由于我们在上面 await 挂起了，期间如果有并发调用执行完毕，我们要拦截掉后续的。
    if (hasPrinted) {
      return
    }

    // 状态锁定
    hasPrinted = true

    // 只有当未生成缓存时，才执行耗时的字体加载及 Canvas 渲染逻辑
    if (!cachedBase64Img) {
      // 检查字体是否已通过 CSS @font-face 加载
      let fontLoaded = false

      // 等待字体加载完成（如果 CSS 已经定义了 font-display: swap）
      if (document.fonts) {
        // 检查字体是否可用
        const checkFont = document.fonts.check('80px "CurlycueEnglish"')

        if (!checkFont) {
          // 等待字体加载事件
          await document.fonts.ready
          fontLoaded = document.fonts.check('80px "CurlycueEnglish"')
        } else {
          fontLoaded = true
        }
      }

      // 降级方案：如果 CSS 字体未加载成功，使用动态 FontFace 加载
      if (!fontLoaded) {
        try {
          const fontUrl = '/fonts/readshop-font/Breadshop-4nLED.otf'
          const customFont = new FontFace('CurlycueEnglish', `url(${fontUrl})`)
          const loadedFont = await customFont.load()
          document.fonts.add(loadedFont)
        } catch (fontError) {
          // 字体加载失败，不影响主流程，Canvas 会使用后备字体
          // console.warn('自定义字体加载失败，将使用系统字体:', fontError)
        }
      }

      // 使用 CSS 中定义的字体名称（保持一致）
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // 字体名称与 CSS @font-face 中的 font-family
      ctx.font = 'normal 80px "CurlycueEnglish", "SukinArtFont", sans-serif'
      const textMetrics = ctx.measureText('S U K I N')

      canvas.width = textMetrics.width + 100
      canvas.height = 200

      ctx.font = 'normal 80px "CurlycueEnglish", "SukinArtFont", sans-serif'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'

      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'
      ctx.shadowOffsetX = 3
      ctx.shadowOffsetY = 4
      ctx.shadowBlur = 5

      const gradient = ctx.createLinearGradient(0, 60, 0, 140)
      gradient.addColorStop(0, '#b3e5fc')
      gradient.addColorStop(0.3, '#29b6f6')
      gradient.addColorStop(0.7, '#01579b')
      gradient.addColorStop(1, '#4fc3f7')
      ctx.fillStyle = gradient

      ctx.fillText('S U K I N', 50, canvas.height / 2)

      // 写入内存变量
      cachedBase64Img = canvas.toDataURL('image/png')
      cachedCanvasWidth = canvas.width
    }

    // 图片空白占位引发的残影问题：加入 line-height: 1px
    const style = `
              font-size: 1px;
              line-height: 1px;
              color: transparent;
              padding: 100px ${cachedCanvasWidth / 2}px;
              background-image: url(${cachedBase64Img});
              background-size: contain;
              background-repeat: no-repeat;
              background-position: left center;
          `
    console.log('\n%c ', style)

    // 在JavaScript字符串中，我们可以使用 \u00A0 表示不换行空格（相当于 &nbsp;）
    // 使用 \u3000 表示全角空格
    const textContent = [
      {text: '⟡ 欢迎进入 Sukin ⟡\n', style: 'title'},
      {text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', style: 'divider'},

      {text: '❖ ', style: 'iconCyan'},
      {text: '作\u00A0\u00A0\u00A0\u00A0者\u00A0:\u00A0\u00A0', style: 'label'},
      {text: 'Sukin - 爱踢粪球的虫\n', style: 'value'},

      {text: '✦ ', style: 'iconPurple'},
      {text: '技\u00A0术\u00A0栈\u00A0:\u00A0\u00A0', style: 'label'},
      {text: 'React19 / Vue3 / Python / JavaScript \n', style: 'value'},

      {text: '✉ ', style: 'iconBlue'},
      {text: '联系方式\u00A0:\u00A0\u00A0', style: 'label'},
      {text: 'lz2005qing@163.com\n', style: 'valueLink'},

      {text: '✐ ', style: 'iconGreen'},
      {text: '网\u00A0\u00A0\u00A0\u00A0址\u00A0:\u00A0\u00A0', style: 'label'},
      {text: 'https://sukin.top\n', style: 'valueLink'},

      {text: '@ ', style: 'iconGray'},
      {text: '\u00A0GitHub\u00A0\u00A0\u00A0:\u00A0\u00A0', style: 'label'},
      {text: 'https://github.com/suluwanqing\n', style: 'valueLink'},

      {text: '⏱ ', style: 'iconYellow'},
      {text: '更新日期\u00A0:\u00A0\u00A0', style: 'label'},
      {text: `${LATEST_SYSTEM_UPDATE}\n`, style: 'value'},

      {text: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n', style: 'divider'},

      {text: '⚠ 安全提示 :  ', style: 'warningTitle'},
      {text: '请勿在此处粘贴任何未知代码，以防账号被盗用。\n', style: 'warningText'},
      {text: '\n', style: ''},
    ]

    printMultiStyleText(textContent)
  } catch (err) {
    // console.error('艺术字生成失败，请检查 ./font.otf 是否存在', err)
  }
}

export default printAuthorInfo
