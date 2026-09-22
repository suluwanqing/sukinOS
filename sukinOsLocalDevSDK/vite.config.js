import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// 同步协议版本：
// 1 = 旧行为，插件按文件名把 logic* 抽成独立的 logic 字段，且不回传 CSS
// 2 = 插件只当哑文件管道，回传全部 .jsx/.js/.css，入口判定完全交给 SukinOS 的「入口约定」配置
const PROTOCOL_VERSION = 2

function sukinLocalDriverPlugin(options = {}) {
  const dirStates = new Map()
  const {
    userId = '',
    triggerUrl = '',
    defaultDir = 'src/sukinOS',
    defaultDebounce = 500,
    // 启动时是否自动把 defaultDir 注册进监听列表。
    // true （默认）：起服务即注册，改文件就走 SSE 触发，无需前端先连上来
    // false ：只等 SukinOS 前端请求 /__sukin_local_sync 时按需注册（在前端里选好目录才开始同步）
    autoRegister = true,
  } = options

  console.log('[sukin-local-driver] 插件初始化', {userId, triggerUrl, defaultDir, defaultDebounce, autoRegister})

  return {
    name: 'sukin-local-driver',
    configureServer(server) {
      console.log('[sukin-local-driver] configureServer 开始执行')

      // ── 启动期注册：由 autoRegister 开关决定是否自动注册 defaultDir ────────
      if (!autoRegister) {
        console.log(
          '[sukin-local-driver] autoRegister=false，跳过启动期注册，等待前端请求 /__sukin_local_sync 时按需注册'
        )
      } else if (userId && triggerUrl) {
        console.log('[sukin-local-driver] autoRegister=true 且已配置 userId/triggerUrl，注册默认目录')
        const absPath = path.resolve(process.cwd(), defaultDir)

        if (fs.existsSync(absPath)) {
          console.log(`[sukin-local-driver] 自动注册目录: ${defaultDir} -> ${absPath}`)
          server.watcher.add(absPath)
          dirStates.set(defaultDir, {
            v: Date.now(),
            debounceMs: defaultDebounce,
            timer: null,
          })
          console.log(
            '[sukin-local-driver] 自动注册完成，当前 dirStates:',
            Array.from(dirStates.keys())
          )
        } else {
          console.warn(`[sukin-local-driver] 默认目录不存在: ${absPath}，跳过自动注册`)
        }
      } else {
        console.log(
          '[sukin-local-driver] 未配置 userId 或 triggerUrl，无法触发 SSE，跳过自动注册，等待前端请求注册'
        )
      }

      // ── 挂载 Vite 内置 chokidar，统一处理所有 watched 目录的变更 ──────────
      server.watcher.on('all', (event, filePath) => {
        console.log(`[sukin-local-driver] 文件事件: ${event} - ${filePath}`)

        if (!/\.(jsx|js|css)$/.test(filePath)) {
          console.log(`[sukin-local-driver] 文件扩展名不匹配，跳过: ${filePath}`)
          return
        }

        console.log(`[sukin-local-driver] 匹配到模块文件: ${filePath}`)
        console.log(`[sukin-local-driver] 当前 dirStates 大小: ${dirStates.size}`)

        for (const [dir, state] of dirStates) {
          const absPath = path.resolve(process.cwd(), dir)
          console.log(`[sukin-local-driver] 检查目录: ${dir} -> ${absPath}`)
          console.log(`[sukin-local-driver] 文件路径: ${filePath}`)
          console.log(`[sukin-local-driver] 是否匹配: ${filePath.startsWith(absPath)}`)

          if (!filePath.startsWith(absPath)) continue

          console.log(`[sukin-local-driver] 文件 ${filePath} 匹配到目录 ${dir}`)

          // 保存当前的 dir 和 state 值，避免闭包问题
          const currentDir = dir
          const currentState = state

          console.log(
            `[sukin-local-driver] 当前防抖状态: debounceMs=${currentState.debounceMs}, timer=${currentState.timer}, v=${currentState.v}`
          )

          // 用当前目录自己记录的 debounceMs
          if (currentState.timer) {
            console.log(`[sukin-local-driver] 清除已有的定时器: ${currentDir}`)
            clearTimeout(currentState.timer)
          }

          currentState.timer = setTimeout(() => {
            console.log(`[sukin-local-driver] 防抖定时器执行: ${currentDir}`)
            currentState.v = Date.now()
            currentState.timer = null
            console.log(`[sukin-local-driver] 更新时间戳: ${currentState.v}`)

            //此时认为是文件+sse
            console.log(
              `[sukin-local-driver] 准备触发同步: userId=${userId}, triggerUrl=${triggerUrl}, dir=${currentDir}`
            )

            if (userId && triggerUrl) {
              console.log(
                `[sukin-local-driver] 开始触发同步! dir=${currentDir}, timestamp=${currentState.v}`
              )

              const requestBody = JSON.stringify({
                userId,
                dir: currentDir,
                timestamp: currentState.v,
              })
              console.log(`[sukin-local-driver] 请求体: ${requestBody}`)

              fetch(triggerUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: requestBody,
              })
                .then(response => {
                  console.log(
                    `[sukin-local-driver] fetch 响应状态: ${response.status} ${response.statusText}`
                  )
                  return response.json()
                })
                .then(data => {
                  console.log(`[sukin-local-driver] fetch 响应数据:`, data)
                })
                .catch(err => {
                  console.error(`[sukin-local-driver] 触发同步失败:`, err)
                })
            } else {
              console.warn(
                `[sukin-local-driver] userId 或 triggerUrl 为空，跳过触发: userId=${userId}, triggerUrl=${triggerUrl}`
              )
            }
          }, currentState.debounceMs)

          console.log(`[sukin-local-driver] 设置新定时器，延迟 ${currentState.debounceMs}ms`)
          break
        }
      })

      console.log('[sukin-local-driver] 文件监听器已注册')

      // ── HTTP 中间件 ────────────────────────────────────────────────────────
      server.middlewares.use((req, res, next) => {
        const protocol =
          req.headers['x-forwarded-proto'] || (req.socket.encrypted ? 'https' : 'http')
        const baseUrl = `${protocol}://${req.headers.host || 'localhost:5173'}`
        const url = new URL(req.url || '', baseUrl)

        console.log(`[sukin-local-driver] 中间件收到请求: ${req.method} ${url.pathname}`)

        if (url.pathname !== '/__sukin_local_sync') {
          console.log(`[sukin-local-driver] 路径不匹配，继续下一个中间件`)
          return next()
        }

        console.log(`[sukin-local-driver] 处理同步请求: ${url.pathname}`)

        // 动态获取来源，解决带有 credentials 请求时不允许使用 '*' 的跨域报错
        const origin = req.headers.origin || '*'
        res.setHeader('Access-Control-Allow-Origin', origin)
        // 只有在明确来源不是星号时才允许携带凭据 (防止冲突)
        if (origin !== '*') {
          res.setHeader('Access-Control-Allow-Credentials', 'true')
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        res.setHeader('Content-Type', 'application/json')

        if (req.method === 'OPTIONS') {
          console.log(`[sukin-local-driver] 处理 OPTIONS 请求`)
          res.end()
          return
        }

        // 从请求里拿前端的配置（dir + 服务端防抖时长）；前端没给目录时回落到 defaultDir，
        // 保证「默认目录」这个概念只有 defaultDir 一个来源
        const dir = (url.searchParams.get('dir') || defaultDir).replace(/^\/+|\/+$/g, '')
        const watchDebounce = Math.max(0, Number(url.searchParams.get('watchDebounce') || 500))
        const absPath = path.resolve(process.cwd(), dir)

        console.log(`[sukin-local-driver] 请求参数: dir=${dir}, watchDebounce=${watchDebounce}`)
        console.log(`[sukin-local-driver] 绝对路径: ${absPath}`)

        // ── 首次访问：注册目录到 chokidar；后续：只更新 debounceMs ──────────
        if (!dirStates.has(dir)) {
          console.log(`[sukin-local-driver] 首次注册目录: ${dir}`)
          server.watcher.add(absPath)
          dirStates.set(dir, {v: Date.now(), debounceMs: watchDebounce, timer: null})
          console.log(
            `[sukin-local-driver] 目录已添加到 watcher，当前 dirStates:`,
            Array.from(dirStates.keys())
          )
        } else {
          // 前端可以随时调整防抖，实时生效
          const oldDebounce = dirStates.get(dir).debounceMs
          dirStates.get(dir).debounceMs = watchDebounce
          console.log(
            `[sukin-local-driver] 更新目录防抖时间: ${dir} ${oldDebounce}ms -> ${watchDebounce}ms`
          )
        }

        const state = dirStates.get(dir)
        const files = {}
        // 协议 2 不再单独回传逻辑文件，恒为空串；字段保留是为了兼容只认 logic 字段的旧前端
        const logic = ''

        console.log(`[sukin-local-driver] 开始读取目录文件: ${absPath}`)

        try {
          if (!fs.existsSync(absPath)) {
            console.error(`[sukin-local-driver] 目录不存在: ${absPath}`)
            return res.end(JSON.stringify({status: 'error', message: `dir not exist: ${dir}`}))
          }

          // 协议 2：只做「哑文件管道」。所有模块文件（含 CSS）原样回传，
          // 哪个是逻辑入口 / 视图入口由 SukinOS 侧的「入口约定」配置判定，插件不再按文件名猜。
          // 递归遍历目录，key 用相对路径（含子文件夹）
          const collectFiles = (dirPath, prefix = '') => {
            const result = []
            const entries = fs.readdirSync(dirPath, { withFileTypes: true })
            for (const entry of entries) {
              // dir 由前端传入，可能指向整个项目根目录，依赖目录必须跳过
              if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
              const fullPath = path.join(dirPath, entry.name)
              const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
              if (entry.isDirectory()) {
                if (entry.name === 'dist') continue
                result.push(...collectFiles(fullPath, relPath))
              } else if (entry.isFile() && /\.(jsx|js|css)$/.test(entry.name)) {
                result.push(relPath)
              }
            }
            return result
          }

          const allFiles = collectFiles(absPath)
          console.log(`[sukin-local-driver] 目录中的文件:`, allFiles)

          for (const relPath of allFiles) {
            const content = fs.readFileSync(path.join(absPath, relPath), 'utf-8')
            files[relPath] = content
            console.log(`[sukin-local-driver] 添加文件到 files: ${relPath}, 长度: ${content.length}`)
          }

          console.log(
            `[sukin-local-driver] 返回数据: v=${state.v}, dir=${dir}, files=${Object.keys(files).length}`
          )

          // logic 恒为空：协议 1 的服务端会单独抽出 logic 文件，前端按 protocol 区分两种形状
          res.end(JSON.stringify({status: 'ok', protocol: PROTOCOL_VERSION, files, logic, v: state.v, dir}))
          console.log(`[sukin-local-driver] 响应已发送`)
        } catch (e) {
          console.error(`[sukin-local-driver] 读取目录出错:`, e)
          res.end(JSON.stringify({status: 'error', message: e.message}))
        }
      })

      console.log('[sukin-local-driver] HTTP 中间件已注册')
      console.log('[sukin-local-driver] configureServer 执行完成')
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    sukinLocalDriverPlugin({
      // userId: '1', // 请传入从前端看到的userID
      // triggerUrl: 'https://sukin.top/api/sukinos/localdev/trigger', // 触发接口URL
      // defaultDir: 'src/sukinOS', // 默认监听的目录（支持递归读取子文件夹）
      // defaultDebounce: 500, // 默认防抖时间(ms)
      // autoRegister: true, // 起服务时就把 defaultDir 注册进监听（false 则等前端请求 /__sukin_local_sync 时才注册）
    }),
  ],
  server: {port: 5173, cors: true},
})
