import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function sukinLocalDriverPlugin(options = {}) {
  const dirStates = new Map()
  const {userId = '', triggerUrl = '', defaultDir = 'src', defaultDebounce = 500} = options

  console.log('[sukin-local-driver] 插件初始化', {userId, triggerUrl, defaultDir, defaultDebounce})

  return {
    name: 'sukin-local-driver',
    configureServer(server) {
      console.log('[sukin-local-driver] configureServer 开始执行')

      // ── 自动注册：如果配置了 userId 和 triggerUrl，自动注册默认目录 ──────────
      if (userId && triggerUrl) {
        console.log('[sukin-local-driver] 检测到 userId 和 triggerUrl，自动注册默认目录')
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
          '[sukin-local-driver] 未配置 userId 或 triggerUrl，跳过自动注册，等待前端请求注册'
        )
      }

      // ── 挂载 Vite 内置 chokidar，统一处理所有 watched 目录的变更 ──────────
      server.watcher.on('all', (event, filePath) => {
        console.log(`[sukin-local-driver] 文件事件: ${event} - ${filePath}`)

        if (!/\.(jsx|js)$/.test(filePath)) {
          console.log(`[sukin-local-driver] 文件扩展名不匹配，跳过: ${filePath}`)
          return
        }

        console.log(`[sukin-local-driver] 匹配到 JS/JSX 文件: ${filePath}`)
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

        // 从请求里拿前端的配置（dir + 服务端防抖时长）
        const dir = (url.searchParams.get('dir') || 'src').replace(/^\/+|\/+$/g, '')
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
        let logic = ''

        console.log(`[sukin-local-driver] 开始读取目录文件: ${absPath}`)

        try {
          if (!fs.existsSync(absPath)) {
            console.error(`[sukin-local-driver] 目录不存在: ${absPath}`)
            return res.end(JSON.stringify({status: 'error', message: `dir not exist: ${dir}`}))
          }

          const allFiles = fs.readdirSync(absPath)
          console.log(`[sukin-local-driver] 目录中的文件:`, allFiles)

          let jsFileCount = 0
          for (const f of allFiles) {
            if (!/\.(jsx|js)$/.test(f)) continue
            jsFileCount++
            console.log(`[sukin-local-driver] 读取 JS/JSX 文件: ${f}`)
            const content = fs.readFileSync(path.join(absPath, f), 'utf-8')
            if (f.toLowerCase().startsWith('logic')) {
              logic = content
              console.log(`[sukin-local-driver] 找到 logic 文件，长度: ${content.length}`)
            } else {
              files[f] = content
              console.log(`[sukin-local-driver] 添加文件到 files: ${f}, 长度: ${content.length}`)
            }
          }

          console.log(`[sukin-local-driver] 总共读取了 ${jsFileCount} 个 JS/JSX 文件`)
          console.log(
            `[sukin-local-driver] 返回数据: v=${state.v}, dir=${dir}, files=${Object.keys(files).length}, logic=${logic ? '有' : '无'}`
          )

          res.end(JSON.stringify({status: 'ok', files, logic, v: state.v, dir}))
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
      // defaultDir: 'src/sukinOS', // 默认监听的目录
      // defaultDebounce: 500, // 默认防抖时间(ms)
    }),
  ],
  server: {port: 5173, cors: true},
})
